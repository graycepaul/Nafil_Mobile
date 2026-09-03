import { useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth-store';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Overlay } from '../../components/ui/Overlay';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { GridSkeleton } from '../../components/ui/GridSkeleton';
import {
  CATEGORY_ICON,
  LISTING_CATEGORIES,
  formatListingPrice,
  type ListingCategory,
} from '../../components/resident/marketplace-categories';
import type { ListingType, ListingWithSeller } from '../../types/database';

const TYPE_FILTERS: { value: ListingType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'apps-outline' },
  { value: 'good', label: 'Goods', icon: 'pricetag-outline' },
  { value: 'service', label: 'Services', icon: 'construct-outline' },
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const profile = useAuthStore((s) => s.profile);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ListingCategory | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<ListingType | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: hasStore } = useQuery({
    queryKey: ['has_listings', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', profile!.id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!profile,
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View className="flex-row items-center gap-md pr-lg">
          {hasStore && (
            <Pressable
              onPress={() => router.push('/resident/store')}
              accessibilityRole="button"
              accessibilityLabel="My store"
              hitSlop={8}
            >
              <Ionicons name="bag-handle-outline" color={colors.onHeaderBg} size={22} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/resident/marketplace-new')}
            accessibilityRole="button"
            accessibilityLabel="New listing"
            hitSlop={8}
          >
            <Ionicons name="add" color={colors.onHeaderBg} size={24} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, router, colors.onHeaderBg, hasStore]);

  const {
    data: allListings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['listings', profile?.estate_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select('*, seller:profiles(full_name, unit_no)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ListingWithSeller[];
    },
    enabled: !!profile,
  });

  const listings = useMemo(() => {
    return (allListings ?? []).filter((listing) => {
      const matchesType = typeFilter === 'all' || listing.type === typeFilter;
      const matchesCategory = category === 'All' || listing.category === category;
      const matchesQuery = listing.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchesType && matchesCategory && matchesQuery;
    });
  }, [allListings, query, category, typeFilter]);

  // More columns as the viewport widens (2 on a phone up to 5 on a wide
  // desktop) — fixed at 2 regardless of width, these aspect-square cards blew
  // up to nearly half the screen each on a laptop. Matches AppShell/tab-options'
  // breakpoints loosely rather than exactly; this just needs to feel right.
  const numColumns = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 640 ? 3 : 2;

  // An incomplete last row otherwise stretches its items to fill the row
  // (and, since their height is aspect-square, grows just as tall as it is
  // wide) — these fillers keep the row's real items pinned to a normal
  // column width instead.
  const remainder = listings.length % numColumns;
  const fillerCount = remainder === 0 ? 0 : numColumns - remainder;
  const gridData =
    fillerCount > 0
      ? [...listings, ...Array.from({ length: fillerCount }, (_, i) => ({ id: `__filler_${i}__` }) as ListingWithSeller)]
      : listings;

  if (isLoading) {
    return (
      <View className="flex-1 bg-paper-50 dark:bg-ink-bg">
        <GridSkeleton numColumns={numColumns} />
      </View>
    );
  }

  return (
    <>
    <FlatList
      key={numColumns}
      className="bg-paper-50 dark:bg-ink-bg"
      contentContainerClassName="p-lg lg:p-2xl"
      numColumns={numColumns}
      columnWrapperClassName="gap-md"
      data={gridData}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View className="mb-md">
          <View className="flex-row items-start gap-sm">
            <View className="flex-1">
              <Input
                placeholder="Search the marketplace"
                value={query}
                onChangeText={setQuery}
                accessibilityLabel="Search listings"
              />
            </View>
            <Pressable
              onPress={() => setFilterOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Filter by type"
              className={`h-[54px] w-[54px] items-center justify-center rounded-md border ${
                typeFilter !== 'all'
                  ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-500'
                  : 'border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface'
              }`}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={typeFilter !== 'all' ? '#fff' : colors.textMuted}
              />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-sm pb-sm pt-md"
          >
            {(['All', ...LISTING_CATEGORIES] as const).map((item) => {
              const active = category === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setCategory(item)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`rounded-full border px-md py-sm ${
                    active
                      ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-500'
                      : 'border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface'
                  }`}
                >
                  <Text
                    className={`text-[13px] font-semibold ${
                      active ? 'text-white' : 'text-paper-900 dark:text-ink-text'
                    }`}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon={<Ionicons name="storefront-outline" color={colors.textMuted} size={26} />}
          title="No listings found"
          message="Try a different search or category, or be the first to list something."
        />
      }
      renderItem={({ item }) => {
        if (item.id.startsWith('__filler_')) return <View className="flex-1" />;
        return (
        <Pressable
          onPress={() => router.push(`/resident/marketplace-listing?id=${item.id}`)}
          className="mb-md flex-1 overflow-hidden rounded-md border border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface"
        >
          {item.photo_urls.length > 0 ? (
            <RemoteImage uri={item.photo_urls[0]} className="aspect-square w-full" />
          ) : (
            <View className="aspect-square w-full items-center justify-center bg-brand-50 dark:bg-brand-900">
              <Ionicons
                name={(CATEGORY_ICON[item.category as ListingCategory] ?? 'pricetag-outline') as never}
                size={40}
                color={colors.primary}
              />
            </View>
          )}
          <View className="p-md">
            <Text className="text-[13px] font-semibold text-paper-900 dark:text-ink-text" numberOfLines={1}>
              {item.title}
            </Text>
            <Text
              className="mt-xs text-[12px] leading-[16px] text-paper-500 dark:text-ink-textMuted"
              numberOfLines={2}
            >
              {item.description}
            </Text>
            <Text
              className="mt-xs text-base font-bold text-paper-900 dark:text-ink-text"
              numberOfLines={1}
            >
              {formatListingPrice(item)}
            </Text>
            <Text className="mt-xs text-[11px] text-paper-500 dark:text-ink-textMuted">
              {relativeTime(item.created_at)}
            </Text>
            <Pressable
              onPress={() => router.push(`/resident/marketplace-listing?id=${item.id}`)}
              className="mt-sm items-center rounded-md bg-brand-800 py-sm active:opacity-90 dark:bg-brand-500"
            >
              <Text className="text-[13px] font-semibold text-white">
                {item.type === 'service' ? 'Message' : 'Buy now'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
        );
      }}
    />

    <Overlay visible={filterOpen} onDismiss={() => setFilterOpen(false)}>
      <Card className="bg-white p-lg dark:bg-ink-surface">
        <Text className="mb-md text-lg font-semibold text-paper-900 dark:text-ink-text">Filter by type</Text>
        <View className="gap-sm">
          {TYPE_FILTERS.map((filter) => {
            const active = typeFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                onPress={() => {
                  setTypeFilter(filter.value);
                  setFilterOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                className={`flex-row items-center gap-md rounded-md border p-md active:opacity-80 ${
                  active
                    ? 'border-brand-800 bg-paper-50 dark:border-brand-300 dark:bg-ink-bg'
                    : 'border-paper-200 bg-paper-50 dark:border-ink-border dark:bg-ink-surface'
                }`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
                  <Ionicons name={filter.icon as never} size={18} color={colors.primary} />
                </View>
                <Text className="flex-1 text-base font-semibold text-paper-900 dark:text-ink-text">
                  {filter.label}
                </Text>
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
        <Button label="Close" variant="ghost" onPress={() => setFilterOpen(false)} className="mt-md" />
      </Card>
    </Overlay>
    </>
  );
}
