import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
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
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchAndEstateFilter } from '../../components/admin/SearchAndEstateFilter';
import type { TransferPurpose, TransferWithSubmitter } from '../../types/database';

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

/** finance/super_admin only. Queue of bank transfers awaiting manual confirmation, across all three flows that accept one. */
export default function AdminTransfersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [estateFilter, setEstateFilter] = useState<string | undefined>();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const isSuperAdmin = profile?.role === 'super_admin';

  const { data: transfers, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transfers_admin', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transfers')
        .select('*, submitter:profiles!transfers_profile_id_fkey(full_name, unit_no), estate:estates(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TransferWithSubmitter[];
    },
    enabled: !!profile,
  });

  const { data: estates } = useQuery({
    queryKey: ['all_estates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estates').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: isSuperAdmin,
  });

  const filteredTransfers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (transfers ?? []).filter((t) => {
      if (estateFilter && t.estate_id !== estateFilter) return false;
      if (q && !t.label.toLowerCase().includes(q) && !t.submitter?.full_name?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transfers, search, estateFilter]);

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
      <View className="flex-1 items-center justify-center bg-white dark:bg-ink-bg">
        <ActivityIndicator size="large" color={colors.primary} />
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
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Pending transfers</Text>
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
              estates={isSuperAdmin ? estates : undefined}
              estateFilter={estateFilter}
              onEstateFilterChange={setEstateFilter}
            />
          </View>
        }
        data={filteredTransfers}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="swap-horizontal-outline" color={colors.textMuted} size={26} />}
            title="Nothing pending"
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
                  <Text className="text-[11px] font-semibold uppercase tracking-[0.6px] text-paper-500 dark:text-ink-textMuted">
                    {PURPOSE_LABEL[item.purpose]}
                  </Text>
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
                </View>
                <Text className="text-[15px] font-bold text-paper-900 dark:text-ink-text">
                  {formatNaira(item.amount)}
                </Text>
              </View>
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
            </Card>
          );
        }}
      />
    </View>
  );
}
