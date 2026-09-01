import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { formatNaira } from '../../lib/format';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Notice';

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
 * pending transfer) — this component just presents the choice.
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
  onConfirm,
  onCancel,
}: {
  title: string;
  amount: number;
  methods: PaymentMethod[];
  walletBalance?: number;
  onConfirm: (method: PaymentMethod) => Promise<void> | void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [method, setMethod] = useState<PaymentMethod>(methods[0]);
  const [submitting, setSubmitting] = useState(false);

  const insufficientWallet = method === 'wallet' && walletBalance !== undefined && walletBalance < amount;

  async function handleConfirm() {
    setSubmitting(true);
    await onConfirm(method);
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

      {method === 'transfer' && (
        <Card className="mb-lg bg-paper-50 dark:bg-ink-bg">
          <Text className="mb-xs text-[13px] text-paper-500 dark:text-ink-textMuted">Transfer to</Text>
          <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
            Nafil Estates Collections
          </Text>
          <Text className="mt-xs text-[15px] text-paper-900 dark:text-ink-text">
            0123456789 · Providus Bank
          </Text>
          <Text className="mt-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
            Use your unit number as the transfer narration so we can match it automatically.
          </Text>
        </Card>
      )}

      {insufficientWallet && <Notice message="Your wallet balance isn't enough to cover this. Choose another method." />}

      <View className="flex-row gap-sm">
        <Button label="Cancel" variant="ghost" onPress={onCancel} className="flex-1" />
        <Button
          label={method === 'transfer' ? "I've sent the transfer" : 'Pay now'}
          onPress={handleConfirm}
          loading={submitting}
          disabled={insufficientWallet}
          className="flex-1"
        />
      </View>
    </Card>
  );
}
