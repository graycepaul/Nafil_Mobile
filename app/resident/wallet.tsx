import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Overlay } from '../../components/ui/Overlay';
import { Toast } from '../../components/ui/Toast';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaymentMethodSheet, type PaymentMethod } from '../../components/resident/PaymentMethodSheet';
import { DuesPaymentFlow } from '../../components/resident/DuesPaymentFlow';
import { useWalletMockStore } from '../../store/wallet-mock-store';

const INLINE_ACTIVITY_LIMIT = 3;

const MORE_SERVICES: { icon: string; label: string }[] = [
  { icon: 'shield-checkmark-outline', label: 'Security' },
  { icon: 'construct-outline', label: 'Service fee' },
];

/**
 * Frontend-only wallet mockup. Balance, transactions, and dues live in
 * `store/wallet-mock-store.ts` rather than Supabase. There's no `wallets`,
 * `wallet_transactions`, or `dues` table yet; this exists to get the UI
 * approved before that backend gets built (see the marketplace/wallet
 * feature work).
 */
export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const balance = useWalletMockStore((s) => s.balance);
  const transactions = useWalletMockStore((s) => s.transactions);
  const dueItems = useWalletMockStore((s) => s.dueItems);
  const adjustBalance = useWalletMockStore((s) => s.adjustBalance);
  const addTransaction = useWalletMockStore((s) => s.addTransaction);
  const markDueItemsPaid = useWalletMockStore((s) => s.markDueItemsPaid);

  const [funding, setFunding] = useState(false);
  const [fundAmount, setFundAmount] = useState('10000');
  const [payingDues, setPayingDues] = useState(false);
  const [moreServicesOpen, setMoreServicesOpen] = useState(false);
  const [notice, setNotice] = useState<string>();

  async function handleConfirmFund(method: PaymentMethod) {
    const amount = Number(fundAmount) || 0;
    await new Promise((r) => setTimeout(r, 900));

    if (method === 'transfer') {
      addTransaction({ label: 'Wallet top-up · Bank transfer', amount, status: 'pending' });
      setNotice("Thanks. We'll credit your wallet once the transfer is confirmed.");
    } else {
      adjustBalance(amount);
      addTransaction({ label: 'Wallet top-up · Card', amount, status: 'completed' });
      setNotice('Wallet funded successfully.');
    }
    setFunding(false);
  }

  const unpaidDues = dueItems.filter((item) => item.status !== 'paid');

  async function handlePayDues(selectedIds: string[], method: PaymentMethod) {
    const selectedItems = unpaidDues.filter((item) => selectedIds.includes(item.id));
    const total = selectedItems.reduce((sum, item) => sum + item.amount, 0);
    await new Promise((r) => setTimeout(r, 900));

    if (method === 'transfer') {
      setNotice("Thanks. We'll mark your dues as paid once the transfer is confirmed.");
    } else {
      if (method === 'wallet') adjustBalance(-total);
      addTransaction({
        label:
          selectedItems.length === 1
            ? `Estate dues · ${selectedItems[0].label}`
            : `Estate dues · ${selectedItems.length} items`,
        amount: -total,
        status: 'completed',
      });
      markDueItemsPaid(selectedIds);
      setNotice('Estate dues paid successfully.');
    }
    setPayingDues(false);
  }

  const visibleTransactions = transactions.slice(0, INLINE_ACTIVITY_LIMIT);
  const duesPending = unpaidDues.length > 0;

  return (
    <View className="flex-1 bg-paper-50 dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md bg-white px-lg pb-lg dark:bg-ink-bg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Wallet</Text>
      </View>

      <ScrollView contentContainerClassName="p-lg">
        <View className="mb-xl items-center rounded-md bg-brand-800 py-xl dark:bg-brand-900">
          <Text className="text-[13px] text-white/70">Available balance</Text>
          <Text className="mt-xs text-[34px] font-bold text-white">{formatNaira(balance)}</Text>
          <Pressable
            onPress={() => setFunding(true)}
            accessibilityRole="button"
            className="mt-lg min-h-[52px] w-full items-center justify-center rounded-md border-[1.5px] border-white/40 px-lg active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">Fund wallet</Text>
          </Pressable>
        </View>

        <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">Services</Text>
        <Card className="mb-xl flex-row justify-around py-lg">
          <View className="items-center gap-sm">
            <Pressable
              onPress={() => setPayingDues(true)}
              accessibilityRole="button"
              accessibilityLabel="Estate dues"
              className="relative h-14 w-14 items-center justify-center rounded-full bg-brand-50 active:opacity-80 dark:bg-brand-900"
            >
              <Ionicons name="receipt-outline" size={24} color={colors.primary} />
              {duesPending && (
                <View className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-paper-50 bg-danger dark:border-ink-surface" />
              )}
            </Pressable>
            <Text className="text-[13px] text-paper-900 dark:text-ink-text">Dues</Text>
          </View>

          <View className="items-center gap-sm">
            <Pressable
              onPress={() => router.push('/resident/marketplace')}
              accessibilityRole="button"
              accessibilityLabel="Marketplace"
              className="h-14 w-14 items-center justify-center rounded-full bg-brand-50 active:opacity-80 dark:bg-brand-900"
            >
              <Ionicons name="storefront-outline" size={24} color={colors.primary} />
            </Pressable>
            <Text className="text-[13px] text-paper-900 dark:text-ink-text">Market</Text>
          </View>

          <View className="items-center gap-sm">
            <Pressable
              onPress={() => setMoreServicesOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="More services"
              className="h-14 w-14 items-center justify-center rounded-full bg-brand-50 active:opacity-80 dark:bg-brand-900"
            >
              <Ionicons name="grid-outline" size={24} color={colors.primary} />
            </Pressable>
            <Text className="text-[13px] text-paper-900 dark:text-ink-text">More</Text>
          </View>
        </Card>

        <View className="mb-md flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-paper-900 dark:text-ink-text">Recent activity</Text>
          {transactions.length > 0 && (
            <Pressable onPress={() => router.push('/resident/wallet-transactions')} accessibilityRole="button">
              <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">See all</Text>
            </Pressable>
          )}
        </View>
        {visibleTransactions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Ionicons name="wallet-outline" color={colors.textMuted} size={26} />}
              title="No activity yet"
              message="Top-ups and payments made from your wallet will show up here."
            />
          </Card>
        ) : (
          visibleTransactions.map((tx) => (
            <Card key={tx.id} className="flex-row items-center gap-sm">
              <View
                className={`h-9 w-9 items-center justify-center rounded-md ${
                  tx.amount >= 0 ? 'bg-success-muted dark:bg-success-mutedDark' : 'bg-paper-100 dark:bg-ink-raised'
                }`}
              >
                <Ionicons
                  name={tx.amount >= 0 ? 'arrow-down-outline' : 'arrow-up-outline'}
                  size={16}
                  color={tx.amount >= 0 ? colors.success : colors.textMuted}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{tx.label}</Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {relativeTime(tx.date)}
                  {tx.status === 'pending' ? ' · Pending' : ''}
                </Text>
              </View>
              <Text
                className={`text-base font-semibold ${
                  tx.amount >= 0 ? 'text-success' : 'text-paper-900 dark:text-ink-text'
                }`}
              >
                {tx.amount >= 0 ? '+' : '-'}
                {formatNaira(Math.abs(tx.amount))}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>

      <Overlay visible={funding} onDismiss={() => setFunding(false)}>
        <Card className="mb-md bg-white p-lg dark:bg-ink-surface">
          <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">Amount to fund</Text>
          <Input
            keyboardType="number-pad"
            value={fundAmount}
            onChangeText={(v) => setFundAmount(v.replace(/[^0-9]/g, ''))}
            placeholder="10000"
          />
          <View className="flex-row gap-sm">
            {[5000, 10000, 20000, 50000].map((preset) => (
              <Pressable
                key={preset}
                onPress={() => setFundAmount(String(preset))}
                className={`flex-1 items-center rounded-md border py-sm ${
                  Number(fundAmount) === preset
                    ? 'border-brand-800 dark:border-brand-300'
                    : 'border-paper-200 dark:border-ink-border'
                }`}
              >
                <Text className="text-[13px] font-semibold text-paper-900 dark:text-ink-text">
                  {formatNaira(preset).replace('.00', '')}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <PaymentMethodSheet
          title="Fund wallet"
          amount={Number(fundAmount) || 0}
          methods={['card', 'transfer']}
          onConfirm={handleConfirmFund}
          onCancel={() => setFunding(false)}
        />
      </Overlay>

      <Overlay visible={payingDues} onDismiss={() => setPayingDues(false)}>
        <DuesPaymentFlow
          items={unpaidDues}
          walletBalance={balance}
          onConfirm={handlePayDues}
          onCancel={() => setPayingDues(false)}
        />
      </Overlay>

      <Overlay visible={moreServicesOpen} onDismiss={() => setMoreServicesOpen(false)}>
        <Card className="bg-white p-lg dark:bg-ink-surface">
          <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">More services</Text>
          <View className="gap-sm">
            {MORE_SERVICES.map((service) => (
              <Pressable
                key={service.label}
                onPress={() => {
                  setMoreServicesOpen(false);
                  setNotice(`${service.label} isn’t available yet. Coming soon.`);
                }}
                accessibilityRole="button"
                className="flex-row items-center gap-md rounded-md border border-paper-200 p-md active:opacity-80 dark:border-ink-border"
              >
                <View className="h-9 w-9 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                  <Ionicons name={service.icon as never} size={18} color={colors.primary} />
                </View>
                <Text className="flex-1 text-base text-paper-900 dark:text-ink-text">{service.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
          <Button label="Close" variant="ghost" onPress={() => setMoreServicesOpen(false)} className="mt-md" />
        </Card>
      </Overlay>

      <Toast message={notice} tone="success" onDismiss={() => setNotice(undefined)} />
    </View>
  );
}
