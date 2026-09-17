import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/theme-context';
import { useAdminUiStore } from '../../store/admin-ui-store';
import { formatNaira } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatCardSkeleton } from '../../components/ui/StatCardSkeleton';
import type { FinancialsOverview } from '../../types/database';

const HIDDEN_BALANCE = '₦ • • • • •';

/**
 * Client-wide financial snapshot - super_admin only, and reached only from
 * super_admin's dashboard header. Everything here comes from one RPC
 * (get_financials_overview) rather than pulling every wallet/due/transfer
 * row down to sum client-side, and the RPC itself re-checks the role
 * server-side, so this screen's own role gating is just UX, not the real
 * access control.
 *
 * Marketplace volume is shown as its own card, separate from the revenue
 * cards above it - since 0053, that money goes straight to the seller's
 * own account and never touches the estate, so it isn't estate revenue,
 * just context on how much marketplace activity is happening.
 */
export default function FinancialsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const balanceHidden = useAdminUiStore((s) => s.balanceHidden);
  const toggleBalanceHidden = useAdminUiStore((s) => s.toggleBalanceHidden);

  const {
    data: overview,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['financials_overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_financials_overview');
      if (error) throw error;
      return (data as FinancialsOverview[])[0];
    },
  });

  function pullToRefresh() {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['financials_overview'] });
  }

  return (
    <ScrollView
      className="flex-1 bg-paper-50 dark:bg-ink-bg"
      contentContainerClassName="p-lg"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={pullToRefresh} tintColor={colors.primary} />}
    >
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="mb-lg flex-row items-center justify-between gap-md"
      >
        <View className="flex-row items-center gap-md">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
            <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
          </Pressable>
          <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Financials</Text>
        </View>
        <Pressable
          onPress={() => router.push('/admin/payment-settings')}
          accessibilityRole="button"
          accessibilityLabel="Payment accounts"
          hitSlop={8}
        >
          <Ionicons name="card-outline" size={20} color={colors.onHeaderBg} />
        </Pressable>
      </View>

      {isLoading || !overview ? (
        <View className="gap-lg">
          <StatCardSkeleton />
          <View className="flex-row gap-md">
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
        </View>
      ) : (
        <>
          <Text className="mb-sm text-sm font-semibold uppercase tracking-wide text-paper-500 dark:text-ink-textMuted">
            Wallet
          </Text>
          <View className="mb-lg flex-row items-start rounded-lg border border-paper-200 bg-paper-50 p-md dark:border-ink-border dark:bg-ink-surface">
            <View className="flex-1">
              <View className="mb-sm h-8 w-8 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                <Ionicons name="wallet-outline" color={colors.primary} size={18} />
              </View>
              <Text className="text-[28px] font-bold leading-none text-paper-900 dark:text-ink-text">
                {balanceHidden ? HIDDEN_BALANCE : formatNaira(overview.total_wallet_balance).replace('.00', '')}
              </Text>
              <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">Total balance held</Text>
            </View>
            <Pressable
              onPress={toggleBalanceHidden}
              accessibilityRole="button"
              accessibilityLabel={balanceHidden ? 'Show balance' : 'Hide balance'}
              hitSlop={8}
              className="p-xs"
            >
              <Ionicons name={balanceHidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text className="mb-sm text-sm font-semibold uppercase tracking-wide text-paper-500 dark:text-ink-textMuted">
            Estate dues
          </Text>
          <View className="mb-lg flex-row gap-md">
            <StatCard
              icon={<Ionicons name="checkmark-done-outline" color={colors.primary} size={18} />}
              value={formatNaira(overview.total_dues_paid).replace('.00', '')}
              label="Paid"
              onPress={() => router.push('/admin/dues')}
            />
            <StatCard
              icon={<Ionicons name="time-outline" color={colors.primary} size={18} />}
              value={formatNaira(overview.total_dues_outstanding).replace('.00', '')}
              label="Outstanding"
              onPress={() => router.push('/admin/dues')}
            />
          </View>

          <Card className="mb-lg">
            <Text className="mb-md text-base font-semibold text-paper-900 dark:text-ink-text">
              Dues paid, by category
            </Text>
            {(
              [
                { label: 'General', value: overview.dues_paid_general },
                { label: 'Service fee', value: overview.dues_paid_service_fee },
                { label: 'Security', value: overview.dues_paid_security },
              ] as const
            ).map((row, index) => (
              <View
                key={row.label}
                className={`flex-row items-center justify-between py-sm ${
                  index === 0 ? '' : 'border-t border-paper-200 dark:border-ink-border'
                }`}
              >
                <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">{row.label}</Text>
                <Text className="text-[15px] font-semibold text-paper-900 dark:text-ink-text">
                  {formatNaira(row.value)}
                </Text>
              </View>
            ))}
          </Card>

          <Text className="mb-sm text-sm font-semibold uppercase tracking-wide text-paper-500 dark:text-ink-textMuted">
            Transfers
          </Text>
          <Card className="mb-lg">
            <Pressable
              onPress={() => router.push('/admin/transfers')}
              accessibilityRole="button"
              className="flex-row items-center justify-between py-sm active:opacity-70"
            >
              <View>
                <Text className="text-base text-paper-900 dark:text-ink-text">Pending</Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {overview.transfers_pending_count} awaiting confirmation
                </Text>
              </View>
              <Text className="text-[15px] font-semibold text-paper-900 dark:text-ink-text">
                {formatNaira(overview.transfers_pending_amount)}
              </Text>
            </Pressable>
            <View className="flex-row items-center justify-between border-t border-paper-200 py-sm dark:border-ink-border">
              <View>
                <Text className="text-base text-paper-900 dark:text-ink-text">Confirmed</Text>
                <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">
                  {overview.transfers_confirmed_count} total
                </Text>
              </View>
              <Text className="text-[15px] font-semibold text-paper-900 dark:text-ink-text">
                {formatNaira(overview.transfers_confirmed_amount)}
              </Text>
            </View>
            <View className="flex-row items-center justify-between border-t border-paper-200 py-sm dark:border-ink-border">
              <Text className="text-base text-paper-900 dark:text-ink-text">Rejected</Text>
              <Text className="text-[15px] font-semibold text-paper-900 dark:text-ink-text">
                {overview.transfers_rejected_count}
              </Text>
            </View>
          </Card>

          <Text className="mb-sm text-sm font-semibold uppercase tracking-wide text-paper-500 dark:text-ink-textMuted">
            Marketplace
          </Text>
          <Card>
            <Text className="mb-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
              Paid straight to sellers - not estate revenue
            </Text>
            <Text className="text-xl font-bold text-paper-900 dark:text-ink-text">
              {formatNaira(overview.marketplace_volume)}
            </Text>
          </Card>
        </>
      )}
    </ScrollView>
  );
}
