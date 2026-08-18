import { View, Pressable, Text } from 'react-native';
import { Input } from '../ui/Input';

/** Search box + (super_admin only, when there's more than one estate) an estate filter chip row. Shared by Residents, Staff, Issues, and Announcements. */
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
  /** Pass only when isSuperAdmin — omitting hides the estate row entirely. */
  estates?: { id: string; name: string }[];
  estateFilter?: string;
  onEstateFilterChange?: (estateId: string | undefined) => void;
}) {
  return (
    <View>
      <Input placeholder={placeholder} value={search} onChangeText={onSearchChange} />
      {estates && estates.length > 1 && (
        <View className="mb-lg -mt-sm flex-row flex-wrap gap-sm">
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
