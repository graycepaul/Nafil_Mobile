import { View, Text, Pressable } from 'react-native';
import type { AlertCategory } from '../types/database';

export const ALERT_CATEGORIES: { value: AlertCategory; label: string }[] = [
  { value: 'missing_child', label: 'Missing Child' },
  { value: 'security_breach', label: 'Security Breach' },
  { value: 'epidemic', label: 'Epidemic' },
  { value: 'other', label: 'Other' },
];

/** Chip row for tagging an emergency alert with a reason, shown on the push notification's title. */
export function AlertCategoryPicker({
  value,
  onChange,
}: {
  value: AlertCategory;
  onChange: (category: AlertCategory) => void;
}) {
  return (
    <View className="mb-lg flex-row flex-wrap gap-sm">
      {ALERT_CATEGORIES.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`rounded-full border-[1.5px] px-md py-sm ${
              selected
                ? 'border-danger bg-danger-muted dark:bg-danger-mutedDark'
                : 'border-paper-200 dark:border-ink-border'
            }`}
          >
            <Text
              className={`text-[13px] font-semibold ${
                selected ? 'text-danger' : 'text-paper-500 dark:text-ink-textMuted'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
