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
import {
  MOCK_WALLET_BALANCE,
  MOCK_WALLET_TRANSACTIONS,
  type WalletTransaction,
} from '../../components/resident/marketplace-mock';

/**
 * Frontend-only wallet mockup. Balance and transactions live in local state
 * seeded from `marketplace-mock.ts`, not Supabase. There's no `wallets` or
 * `wallet_transactions` table yet; this exists to get the UI approved before
 * that backend gets built (see the marketplace/dues/wallet feature work).
 */
export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [balance, setBalance] = useState(MOCK_WALLET_BALANCE);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(MOCK_WALLET_TRANSACTIONS);
  const [funding, setFunding] = useState(false);
  const [fundAmount, setFundAmount] = useState('10000');
  const [notice, setNotice] = useState<string>();

  async function handleConfirmFund(method: PaymentMethod) {
    const amount = Number(fundAmount) || 0;
    await new Promise((r) => setTimeout(r, 900));

    if (method === 'transfer') {
      setTransactions((prev) => [
        { id: `t${Date.now()}`, label: 'Wallet top-up · Bank transfer', amount, status: 'pending', date: new Date().toISOString() },
        ...prev,
      ]);
      setNotice("Thanks. We'll credit your wallet once the transfer is confirmed.");
    } else {
      setBalance((b) => b + amount);
      setTransactions((prev) => [
        { id: `t${Date.now()}`, label: 'Wallet top-up · Card', amount, status: 'completed', date: new Date().toISOString() },
        ...prev,
      ]);
      setNotice('Wallet funded successfully.');
    }
    setFunding(false);
  }

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
        <Card className="mb-lg items-center bg-brand-800 py-xl dark:bg-brand-900">
          <Text className="text-[13px] text-white/70">Available balance</Text>
          <Text className="mt-xs text-[34px] font-bold text-white">{formatNaira(balance)}</Text>
          <Button
            label="Fund wallet"
            variant="secondary"
            onPress={() => setFunding(true)}
            className="mt-lg w-full border-white/40"
          />
        </Card>

        <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">Recent activity</Text>
        {transactions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Ionicons name="wallet-outline" color={colors.textMuted} size={26} />}
              title="No activity yet"
              message="Top-ups and payments made from your wallet will show up here."
            />
          </Card>
        ) : (
          transactions.map((tx) => (
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

      <Toast message={notice} tone="success" onDismiss={() => setNotice(undefined)} />
    </View>
  );
}
