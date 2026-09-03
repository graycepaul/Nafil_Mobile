import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import { SearchAndEstateFilter } from '../../components/admin/SearchAndEstateFilter';
import type { TransferPurpose, TransferStatus, TransferWithSubmitter } from '../../types/database';

const PURPOSE_ICON: Record<TransferPurpose, string> = {
  wallet_topup: 'wallet-outline',
  dues: 'receipt-outline',
  marketplace_order: 'storefront-outline',
};

const PURPOSE_LABEL: Record<TransferPurpose, string> = {
  wallet_topup: 'Wallet top-up',
  dues: 'Estate dues',
  marketplace_order: 'Marketplace order',
};

const STATUS_TONE: Record<TransferStatus, BadgeTone> = {
  pending: 'warning',
  confirmed: 'success',
  rejected: 'danger',
};

const STATUS_TABS: { value: TransferStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

/**
 * finance/super_admin's full record of bank transfers — wallet top-ups, dues,
 * and marketplace purchases. Defaults to the "Pending" tab (the action queue
 * this screen started as), with Confirmed/Rejected/All alongside it so
 * there's one place to see the full accept/reject history, not just what's
 * still open.
 */
export default function AdminTransfersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<TransferStatus | 'all'>('pending');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const isSuperAdmin = profile?.role === 'super_admin';

  const { data: transfers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transfers_admin', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfers')
        .select('*, submitter:profiles!transfers_profile_id_fkey(full_name, unit_no), estate:estates(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TransferWithSubmitter[];
    },
    enabled: !!profile,
  });

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (transfers ?? []).filter((t) => {
      if (statusTab !== 'all' && t.status !== statusTab) return false;
      if (q && !t.label.toLowerCase().includes(q) && !t.submitter?.full_name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transfers, search, statusTab]);

  const pendingCount = (transfers ?? []).filter((t) => t.status === 'pending').length;

  async function resolve(id: string, action: 'confirm' | 'reject') {
    setError(undefined);
    setResolvingId(id);
    const { error } = await supabase.rpc(action === 'confirm' ? 'confirm_transfer' : 'reject_transfer', {
      p_transfer_id: id,
    });
    setResolvingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['transfers_admin', profile?.estate_id] });
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-ink-bg">
        <CardSkeletonList />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-ink-bg">
      <View
        style={{ paddingTop: insets.top + 16 }}
        className="flex-row items-center gap-md px-lg pb-lg"
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
        </Pressable>
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Transfers</Text>
      </View>

      <View className="flex-row border-b border-paper-200 px-lg dark:border-ink-border">
        {STATUS_TABS.map((tab) => {
          const active = statusTab === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => setStatusTab(tab.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className={`mr-lg items-center border-b-2 pb-sm pt-sm ${
                active ? 'border-brand-800 dark:border-brand-300' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  active ? 'text-brand-800 dark:text-brand-300' : 'text-paper-500 dark:text-ink-textMuted'
                }`}
              >
                {tab.label}
                {tab.value === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        className="bg-white dark:bg-ink-bg"
        contentContainerClassName="p-xl"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {error && <Notice message={error} />}
            <SearchAndEstateFilter
              search={search}
              onSearchChange={setSearch}
              placeholder="Search by label or resident"
            />
          </View>
        }
        data={filteredTransfers}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="swap-horizontal-outline" color={colors.textMuted} size={26} />}
            title="Nothing here"
            message="Bank transfers residents submit for wallet top-ups, dues, or purchases will show up here."
          />
        }
        renderItem={({ item }) => {
          const resolving = resolvingId === item.id;
          return (
            <Card>
              <View className="flex-row items-start gap-sm">
                <View className="h-9 w-9 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                  <Ionicons name={PURPOSE_ICON[item.purpose] as never} size={18} color={colors.primary} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-sm">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-500 dark:text-ink-textMuted">
                      {PURPOSE_LABEL[item.purpose]}
                    </Text>
                    {statusTab === 'all' && <StatusBadge label={item.status} tone={STATUS_TONE[item.status]} />}
                  </View>
                  <Text className="mt-0.5 text-base font-semibold text-paper-900 dark:text-ink-text">
                    {item.label}
                  </Text>
                  <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                    {item.submitter?.full_name ?? 'Unknown resident'}
                    {item.submitter?.unit_no ? ` · Unit ${item.submitter.unit_no}` : ''}
                    {isSuperAdmin && item.estate?.name ? ` · ${item.estate.name}` : ''}
                  </Text>
                  <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                    Submitted {relativeTime(item.created_at)}
                  </Text>
                  {item.proof_url && (
                    <Pressable onPress={() => Linking.openURL(item.proof_url!)} accessibilityRole="link">
                      <Text className="mt-xs text-[13px] font-semibold text-brand-800 dark:text-brand-300">
                        View proof of payment
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Text className="text-[15px] font-bold text-paper-900 dark:text-ink-text">
                  {formatNaira(item.amount)}
                </Text>
              </View>
              {item.status === 'pending' && (
                <View className="mt-md flex-row gap-sm">
                  <Button
                    label="Reject"
                    variant="secondary"
                    onPress={() => resolve(item.id, 'reject')}
                    loading={resolving}
                    disabled={resolvingId !== null && !resolving}
                    className="flex-1"
                  />
                  <Button
                    label="Confirm"
                    onPress={() => resolve(item.id, 'confirm')}
                    loading={resolving}
                    disabled={resolvingId !== null && !resolving}
                    className="flex-1"
                  />
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}
