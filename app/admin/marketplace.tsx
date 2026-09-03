import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useAdminUiStore } from '../../store/admin-ui-store';
import { useTheme } from '../../context/theme-context';
import { formatListingPrice } from '../../components/resident/marketplace-categories';
import { relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { Overlay } from '../../components/ui/Overlay';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { CardSkeletonList } from '../../components/ui/CardSkeleton';
import { SearchAndEstateFilter } from '../../components/admin/SearchAndEstateFilter';
import { TAB_PROMOTION_BREAKPOINT } from '../../components/ui/tab-options';
import type { ListingStatus, ListingWithSeller } from '../../types/database';

const STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: 'success',
  sold: 'info',
  removed: 'neutral',
  suspended: 'danger',
};

type ListingWithEstate = ListingWithSeller & { estate: { name: string } | null };

const STATUS_FILTERS: { value: ListingStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'removed', label: 'Removed' },
];

/** super_admin/finance view of every listing in the estate — browse and suspend, not delete. */
export default function AdminMarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isPromotedTab = Platform.OS === 'web' && width >= TAB_PROMOTION_BREAKPOINT;
  const queryClient = useQueryClient();
  const markMarketViewed = useAdminUiStore((s) => s.markMarketViewed);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ListingStatus>();
  const [confirming, setConfirming] = useState<{ id: string; title: string; action: 'suspend' | 'lift' } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string>();
  const [financeMenuOpen, setFinanceMenuOpen] = useState(false);
  const isSuperAdmin = profile?.role === 'super_admin';

  // Clears the Dashboard's Market badge — it's tracking "anything posted
  // since this device last opened this screen", not an unresolved queue.
  useEffect(() => {
    markMarketViewed();
  }, [markMarketViewed]);

  const { data: listings, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['listings_admin', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(full_name, unit_no), estate:estates(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ListingWithEstate[];
    },
    enabled: !!profile,
  });

  // Same queryKeys the Dashboard's own stat cards use — shared cache, not a duplicate fetch.
  const { data: pendingTransferCount } = useQuery({
    queryKey: ['dashboard_pending_transfers', profile?.id],
    queryFn: async () => {
      const { count } = await supabase.from('transfers').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      return count ?? 0;
    },
    enabled: !!profile,
  });
  const { data: outstandingDuesCount } = useQuery({
    queryKey: ['dashboard_outstanding_dues', profile?.id],
    queryFn: async () => {
      const { count } = await supabase.from('dues').select('*', { count: 'exact', head: true }).neq('status', 'paid');
      return count ?? 0;
    },
    enabled: !!profile,
  });
  const hasFinanceAlert = !!pendingTransferCount || !!outstandingDuesCount;

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (listings ?? []).filter((listing) => {
      if (statusFilter && listing.status !== statusFilter) return false;
      if (
        q &&
        !listing.title.toLowerCase().includes(q) &&
        !listing.category.toLowerCase().includes(q) &&
        !listing.seller?.full_name?.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [listings, search, statusFilter]);

  async function handleConfirmSuspend() {
    if (!confirming) return;
    setError(undefined);
    setUpdating(true);
    const nextStatus = confirming.action === 'suspend' ? 'suspended' : 'active';
    const { error } = await supabase.from('listings').update({ status: nextStatus }).eq('id', confirming.id);
    setUpdating(false);
    setConfirming(null);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['listings_admin', profile?.estate_id] });
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
        className="flex-row items-center justify-between px-lg pb-lg"
      >
        <View className="flex-row items-center gap-md">
          {!isPromotedTab && (
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
              <Ionicons name="arrow-back" color={colors.onHeaderBg} size={22} />
            </Pressable>
          )}
          <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Marketplace</Text>
        </View>
        <Pressable
          onPress={() => setFinanceMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Finance"
          hitSlop={8}
          className="relative"
        >
          <Ionicons name="wallet-outline" color={colors.onHeaderBg} size={22} />
          {hasFinanceAlert && (
            <View className="absolute -right-[6px] -top-[4px] h-[9px] w-[9px] rounded-full border border-white bg-danger dark:border-ink-bg" />
          )}
        </Pressable>
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
              placeholder="Search by title, category, or seller"
            />
            <View className="mb-lg flex-row flex-wrap gap-sm">
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.value;
                return (
                  <Pressable
                    key={f.label}
                    onPress={() => setStatusFilter(f.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`rounded-full border px-md py-xs ${
                      active
                        ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                        : 'border-paper-200 dark:border-ink-border'
                    }`}
                  >
                    <Text
                      className={`text-[13px] font-medium ${
                        active ? 'text-white dark:text-ink-bg' : 'text-paper-500 dark:text-ink-textMuted'
                      }`}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        data={filteredListings}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyState
            icon={<Ionicons name="storefront-outline" color={colors.textMuted} size={26} />}
            title="No listings yet"
            message="Goods and services residents list will show up here."
          />
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/admin/marketplace-listing?id=${item.id}`)}>
            <Card>
              <View className="mb-xs flex-row items-center justify-between">
                <StatusBadge label={item.status} tone={STATUS_TONE[item.status]} />
                <StatusBadge label={item.type} tone="neutral" />
              </View>
              <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{item.title}</Text>
              <Text className="mt-xs text-[15px] font-bold text-brand-800 dark:text-brand-300">
                {formatListingPrice(item)}
              </Text>
              <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                {item.seller?.full_name ?? 'Unknown seller'}
                {item.seller?.unit_no ? ` · Unit ${item.seller.unit_no}` : ''}
                {isSuperAdmin && item.estate?.name ? ` · ${item.estate.name}` : ''}
              </Text>
              <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
                Posted {relativeTime(item.created_at)}
              </Text>
              {(item.status === 'active' || item.status === 'suspended') && (
                <Pressable
                  onPress={() =>
                    setConfirming({
                      id: item.id,
                      title: item.title,
                      action: item.status === 'active' ? 'suspend' : 'lift',
                    })
                  }
                  accessibilityRole="button"
                  className="mt-sm self-start"
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      item.status === 'active' ? 'text-danger' : 'text-brand-800 dark:text-brand-300'
                    }`}
                  >
                    {item.status === 'active' ? 'Suspend listing' : 'Lift suspension'}
                  </Text>
                </Pressable>
              )}
            </Card>
          </Pressable>
        )}
      />

      <ConfirmDialog
        visible={!!confirming}
        title={confirming?.action === 'suspend' ? 'Suspend this listing?' : 'Lift the suspension?'}
        message={
          confirming?.action === 'suspend'
            ? `"${confirming.title}" will no longer be shown in the marketplace. The seller will be notified and can contact estate management to contest this.`
            : `"${confirming?.title}" will be visible in the marketplace again. The seller will be notified.`
        }
        confirmLabel={confirming?.action === 'suspend' ? 'Suspend' : 'Lift suspension'}
        destructive={confirming?.action === 'suspend'}
        loading={updating}
        onConfirm={handleConfirmSuspend}
        onCancel={() => setConfirming(null)}
      />

      <Overlay visible={financeMenuOpen} onDismiss={() => setFinanceMenuOpen(false)}>
        <Card className="bg-white p-lg dark:bg-ink-surface">
          <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">Finance</Text>
          <View className="gap-sm">
            <Pressable
              onPress={() => {
                setFinanceMenuOpen(false);
                router.push('/admin/transfers');
              }}
              accessibilityRole="button"
              className="flex-row items-center gap-md rounded-md border border-paper-200 p-md active:opacity-80 dark:border-ink-border"
            >
              <View className="h-9 w-9 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
              </View>
              <Text className="flex-1 text-base font-semibold text-paper-900 dark:text-ink-text">
                Pending transfers
              </Text>
              {!!pendingTransferCount && (
                <View className="rounded-full bg-danger px-sm py-[1px]">
                  <Text className="text-[11px] font-bold text-white">{pendingTransferCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setFinanceMenuOpen(false);
                router.push('/admin/dues');
              }}
              accessibilityRole="button"
              className="flex-row items-center gap-md rounded-md border border-paper-200 p-md active:opacity-80 dark:border-ink-border"
            >
              <View className="h-9 w-9 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              </View>
              <Text className="flex-1 text-base font-semibold text-paper-900 dark:text-ink-text">
                Outstanding dues
              </Text>
              {!!outstandingDuesCount && (
                <View className="rounded-full bg-danger px-sm py-[1px]">
                  <Text className="text-[11px] font-bold text-white">{outstandingDuesCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </Card>
      </Overlay>
    </View>
  );
}
