import { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ScrollView, Pressable } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { formatNaira, relativeTime } from '../../lib/format';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  CATEGORY_ICON,
  LISTING_CATEGORIES,
  MOCK_LISTINGS,
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
    <FlatList
      className="bg-paper-50 dark:bg-ink-bg"
      contentContainerClassName="p-lg"
      numColumns={2}
      columnWrapperClassName="gap-md"
      data={listings}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View className="mb-md">
          <View className="mb-md flex-row gap-sm">
            {TYPE_FILTERS.map((filter) => {
              const active = typeFilter === filter.value;
              return (
                <Pressable
                  key={filter.value}
                  onPress={() => setTypeFilter(filter.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={`flex-1 flex-row items-center justify-center gap-xs rounded-full border py-sm ${
                    active
                      ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-500'
                      : 'border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface'
                  }`}
                >
                  <Ionicons
                    name={filter.icon as never}
                    size={15}
                    color={active ? '#fff' : colors.textMuted}
                  />
                  <Text
                    className={`text-[13px] font-semibold ${
                      active ? 'text-white' : 'text-paper-900 dark:text-ink-text'
                    }`}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            placeholder="Search the marketplace"
            value={query}
            onChangeText={setQuery}
            accessibilityLabel="Search listings"
          />
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
            <Text className="mt-xs text-base font-bold text-paper-900 dark:text-ink-text">
              {formatNaira(item.price)}
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
  );
}
