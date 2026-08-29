import { useState } from 'react';
import { View, Pressable, Text, TextInput, Platform } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';

const suppressBrowserOutline = Platform.select({ web: { outlineStyle: 'none' } as object, default: {} });

/**
 * Search bar with a filter icon button beside it — tapping the icon reveals
 * the estate chip row below rather than showing it inline all the time.
 * Deliberately not the shared `Input` component: its py-[16px] is sized for
 * primary form fields, and comes out too tall for a compact list toolbar.
 * Shared by Residents, Staff, Issues, and Announcements.
 */
export function SearchAndEstateFilter({
  search,
  onSearchChange,
  placeholder,
  estates,
  estateFilter,
  onEstateFilterChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  /** Pass only when isSuperAdmin — omitting hides the filter button entirely. */
  estates?: { id: string; name: string }[];
  estateFilter?: string;
  onEstateFilterChange?: (estateId: string | undefined) => void;
}) {
  const { colors } = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const showFilterButton = estates && estates.length > 1;
  const filterActive = estateFilter !== undefined;

  return (
    <View className="mb-lg">
      <View className="flex-row items-center gap-sm">
        <View className="h-[40px] flex-1 flex-row items-center rounded-md border border-paper-200 bg-white pl-md pr-sm dark:border-ink-border dark:bg-ink-surface">
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            placeholder={placeholder}
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={onSearchChange}
            accessibilityLabel={placeholder}
            className="ml-sm flex-1 bg-transparent text-[14px] text-paper-900 dark:text-ink-text"
            style={suppressBrowserOutline}
          />
        </View>
        {showFilterButton && (
          <Pressable
            onPress={() => setFiltersOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={filtersOpen ? 'Hide filters' : 'Filter by estate'}
            accessibilityState={{ expanded: filtersOpen }}
            className={`h-[40px] w-[40px] items-center justify-center rounded-md border ${
              filterActive || filtersOpen
                ? 'border-brand-800 bg-brand-800 dark:border-brand-300 dark:bg-brand-300'
                : 'border-paper-200 bg-white dark:border-ink-border dark:bg-ink-surface'
            }`}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={filterActive || filtersOpen ? colors.onButtonFill : colors.textMuted}
            />
          </Pressable>
        )}
      </View>

      {showFilterButton && filtersOpen && (
        <View className="mt-md flex-row flex-wrap gap-sm">
          {[{ id: undefined, name: 'All estates' }, ...estates].map((e) => {
            const active = estateFilter === e.id;
            return (
              <Pressable
                key={e.id ?? 'all'}
                onPress={() => onEstateFilterChange?.(e.id)}
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
                  {e.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
