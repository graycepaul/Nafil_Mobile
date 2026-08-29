import { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { relativeTime } from '../../lib/format';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Overlay } from '../../components/ui/Overlay';
import {
  CATEGORY_ICON,
  LISTING_CATEGORIES,
  MOCK_LISTINGS,
  formatListingPrice,
  type ListingCategory,
  type ListingType,
} from '../../components/resident/marketplace-mock';

const TYPE_FILTERS: { value: ListingType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'apps-outline' },
  { value: 'good', label: 'Goods', icon: 'pricetag-outline' },
  { value: 'service', label: 'Services', icon: 'construct-outline' },
];

/** Frontend-only mockup. See `wallet.tsx` for the "no backend yet" disclaimer. */
export default function MarketplaceScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ListingCategory | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<ListingType | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push('/resident/marketplace-new')}
          accessibilityRole="button"
          accessibilityLabel="New listing"
          hitSlop={8}
          className="px-lg"
        >
          <Ionicons name="add" color={colors.onHeaderBg} size={24} />
        </Pressable>
      ),
    });
  }, [navigation, router, colors.onHeaderBg]);

  const listings = useMemo(() => {
    return MOCK_LISTINGS.filter((listing) => {
      const matchesType = typeFilter === 'all' || listing.type === typeFilter;
      const matchesCategory = category === 'All' || listing.category === category;
      const matchesQuery = listing.title.toLowerCase().includes(query.trim().toLowerCase());
      return matchesType && matchesCategory && matchesQuery;
    });
  }, [query, category, typeFilter]);

  return (
    <>
    <FlatList
      className="bg-paper-50 dark:bg-ink-bg"
      contentContainerClassName="p-lg"
      numColumns={2}
      columnWrapperClassName="gap-md"
      data={listings}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View className="mb-md">
          <View className="flex-row items-center gap-sm">
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
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/resident/marketplace-listing?id=${item.id}`)}
          className="mb-md flex-1 overflow-hidden rounded-md border border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface"
        >
          <View className="h-28 items-center justify-center bg-brand-50 dark:bg-brand-900">
            <Ionicons name={CATEGORY_ICON[item.category] as never} size={32} color={colors.primary} />
          </View>
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
              {relativeTime(item.postedAt)}
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
      )}
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
