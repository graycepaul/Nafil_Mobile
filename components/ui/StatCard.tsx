import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

/** Tappable number-plus-label tile, used on role dashboards. */
export function StatCard({
  icon,
  value,
  label,
  onPress,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="flex-1 rounded-lg border border-paper-200 bg-paper-50 p-md shadow-sm active:opacity-85 dark:border-ink-border dark:bg-ink-surface"
    >
      <View className="mb-sm h-8 w-8 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
        {icon}
      </View>
      <Text className="text-[28px] font-bold leading-none text-paper-900 dark:text-ink-text">
        {value}
      </Text>
      <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">{label}</Text>
    </Pressable>
  );
}
