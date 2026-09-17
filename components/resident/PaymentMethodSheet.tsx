import { useState } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { formatNaira } from '../../lib/format';
import { pickPhoto } from '../../lib/pick-photo';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Notice';

export type PaymentProof = { uri: string; mimeType: string | null };

export type PaymentMethod = 'wallet' | 'card' | 'transfer';

const METHOD_LABEL: Record<PaymentMethod, string> = {
  wallet: 'Pay from wallet',
  card: 'Debit/credit card',
  transfer: 'Bank transfer',
};

const METHOD_ICON: Record<PaymentMethod, string> = {
  wallet: 'wallet-outline',
  card: 'card-outline',
  transfer: 'swap-horizontal-outline',
};

/**
 * Shared "how do you want to pay" sheet, used for funding the wallet, paying
 * estate dues, and marketplace checkout. `onConfirm` does the real work
 * (adjusting the wallet balance, logging a transaction, or recording a
 * pending transfer) - this component just presents the choice.
 *
 * 'card' has no real payment gateway behind it yet, so no call site
 * currently offers it in `methods`; it's kept here, unused, for whenever
 * Paystack/Flutterwave gets wired up.
 */
export function PaymentMethodSheet({
  title,
  amount,
  methods,
  walletBalance,
  /**
   * Wallet funding needs a proof of payment attached up front - finance/
   * super_admin otherwise has nothing but the resident's word (and a unit
   * number narration that may or may not have been typed correctly) to
   * match a transfer against. Dues and marketplace checkout don't require
   * it yet, so this defaults off rather than blocking every transfer here.
   */
  requireProof,
  /**
   * The account shown in the "Transfer to" card - marketplace checkout
   * passes the seller's own payout account (that money never touches the
   * estate's account), wallet top-up/dues pass whatever super_admin has
   * configured for that purpose (see 0054_configurable_payment_accounts_and_financials.sql).
   * `null` means "resolved, but nothing is configured yet" - shows
   * `transferUnavailableMessage` instead and blocks the transfer method,
   * rather than falling back to a fake placeholder account.
   */
  transferAccount,
  transferUnavailableMessage,
  transferNote,
  onConfirm,
  onCancel,
}: {
  title: string;
  amount: number;
  methods: PaymentMethod[];
  walletBalance?: number;
  requireProof?: boolean;
  transferAccount?: { name: string; accountNumber: string; bankName: string } | null;
  transferUnavailableMessage?: string;
  /** Replaces the default "use your unit number as narration" hint under the account card. */
  transferNote?: string;
  onConfirm: (method: PaymentMethod, proof?: PaymentProof) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [method, setMethod] = useState<PaymentMethod>(methods[0]);
  const [proof, setProof] = useState<PaymentProof>();
  const [proofError, setProofError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  const insufficientWallet = method === 'wallet' && walletBalance !== undefined && walletBalance < amount;
  const transferUnavailable = method === 'transfer' && transferAccount === null;
  const proofNeeded = method === 'transfer' && requireProof && !!transferAccount;

  async function handleAttachProof() {
    setProofError(undefined);
    const result = await pickPhoto();
    if ('error' in result) return setProofError(result.error);
    if ('cancelled' in result) return;
    setProof(result);
  }

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm(method, proof);
    setSubmitting(false);
  }

  return (
    <Card className="mb-0 bg-white p-lg dark:bg-ink-surface">
      <Text className="mb-xs text-lg font-semibold text-paper-900 dark:text-ink-text">{title}</Text>
      <Text className="mb-lg text-[28px] font-bold text-paper-900 dark:text-ink-text">
        {formatNaira(amount)}
      </Text>

      <View className="mb-lg gap-sm">
        {methods.map((m) => {
          const active = method === m;
          return (
            <Pressable
              key={m}
              onPress={() => setMethod(m)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              className={`flex-row items-center gap-sm rounded-md border p-md active:opacity-80 ${
                active
                  ? 'border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-bg'
                  : 'border-paper-200 bg-paper-50 dark:border-ink-border dark:bg-ink-surface'
              }`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                <Ionicons name={METHOD_ICON[m] as never} size={18} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
                  {METHOD_LABEL[m]}
                </Text>
                {m === 'wallet' && walletBalance !== undefined && (
                  <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                    Balance: {formatNaira(walletBalance)}
                  </Text>
                )}
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
                  active ? 'border-brand-800 dark:border-brand-300' : 'border-paper-200 dark:border-ink-border'
                }`}
              >
                {active && <View className="h-[11px] w-[11px] rounded-full bg-brand-800 dark:bg-brand-300" />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {method === 'transfer' && transferAccount && (
        <Card className="mb-lg bg-paper-50 dark:bg-ink-bg">
          <Text className="mb-xs text-[13px] text-paper-500 dark:text-ink-textMuted">Transfer to</Text>
          <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{transferAccount.name}</Text>
          <Text className="mt-xs text-[15px] text-paper-900 dark:text-ink-text">
            {transferAccount.accountNumber} · {transferAccount.bankName}
          </Text>
          <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
            {transferNote ?? 'Use your unit number as the transfer narration so we can match it automatically.'}
          </Text>
        </Card>
      )}

      {transferUnavailable && (
        <Notice
          message={
            transferUnavailableMessage ??
            "Bank transfer isn't set up yet - contact estate management."
          }
        />
      )}

      {proofNeeded && (
        <View className="mb-lg">
          <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">
            Proof of payment
          </Text>
          {proof ? (
            <Pressable onPress={handleAttachProof} accessibilityRole="button" className="items-center">
              <Image source={{ uri: proof.uri }} className="h-40 w-full rounded-md" resizeMode="cover" />
              <Text className="mt-sm text-[13px] font-semibold text-brand-800 dark:text-brand-300">
                Change photo
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleAttachProof}
              accessibilityRole="button"
              accessibilityLabel="Attach proof of payment"
              className="items-center gap-sm rounded-md border border-dashed border-paper-200 p-xl dark:border-ink-border"
            >
              <Ionicons name="cloud-upload-outline" size={22} color={colors.textMuted} />
              <Text className="text-[13px] font-semibold text-paper-900 dark:text-ink-text">
                Attach a screenshot or receipt of the transfer
              </Text>
            </Pressable>
          )}
          {proofError && <Notice message={proofError} />}
        </View>
      )}

      {insufficientWallet && <Notice message="Your wallet balance isn't enough to cover this. Choose another method." />}

      <View className="flex-row gap-sm">
        <Button label="Cancel" variant="ghost" onPress={onCancel} className="flex-1" />
        <Button
          label={method === 'transfer' ? "I've sent the transfer" : 'Pay now'}
          onPress={handleConfirm}
          loading={submitting}
          disabled={insufficientWallet || transferUnavailable || (proofNeeded && !proof)}
          className="flex-1"
        />
      </View>
    </Card>
  );
}
