import { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { formatListingPrice } from '../../components/resident/marketplace-categories';
import { relativeTime } from '../../lib/format';
import { Card } from '../../components/ui/Card';
import { Notice } from '../../components/ui/Notice';
import { StatusBadge, type BadgeTone } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchAndEstateFilter } from '../../components/admin/SearchAndEstateFilter';
import type { ListingStatus, ListingWithSeller } from '../../types/database';

const STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: 'success',
  sold: 'info',
  removed: 'danger',
};

type ListingWithEstate = ListingWithSeller & { estate: { name: string } | null };

/** Admin view of every listing across the estate (or every estate, for super_admin) — browse and remove, not edit. */
export default function AdminMarketplaceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [estateFilter, setEstateFilter] = useState<string | undefined>();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const isSuperAdmin = profile?.role === 'super_admin';

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

  const { data: estates } = useQuery({
    queryKey: ['all_estates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estates').select('id, name').order('name');
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: isSuperAdmin,
  });

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (listings ?? []).filter((listing) => {
      if (estateFilter && listing.estate_id !== estateFilter) return false;
      if (
        q &&
        !listing.title.toLowerCase().includes(q) &&
        !listing.category.toLowerCase().includes(q) &&
        !listing.seller?.full_name?.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [listings, search, estateFilter]);

  async function removeListing(id: string) {
    setError(undefined);
    setRemovingId(id);
    const { error } = await supabase.from('listings').update({ status: 'removed' }).eq('id', id);
    setRemovingId(null);
    if (error) {
      setError(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['listings_admin', profile?.estate_id] });
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
        <Text className="text-[22px] font-bold text-paper-900 dark:text-ink-text">Marketplace</Text>
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
              estates={isSuperAdmin ? estates : undefined}
              estateFilter={estateFilter}
              onEstateFilterChange={setEstateFilter}
            />
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
            {item.status === 'active' && (
              <Pressable
                onPress={() => removeListing(item.id)}
                disabled={removingId === item.id}
                accessibilityRole="button"
                className="mt-sm self-start"
              >
                <Text className="text-[13px] font-semibold text-danger">
                  {removingId === item.id ? 'Removing…' : 'Remove listing'}
                </Text>
              </Pressable>
            )}
          </Card>
        )}
      />
    </View>
  );
}
