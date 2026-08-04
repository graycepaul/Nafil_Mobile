import type { ReactNode } from 'react';
import { View, Text } from 'react-native';

/** Consistent "nothing here yet" treatment — an icon, a line, an optional nudge. */
export function EmptyState({
  icon,
  title,
  message,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
}) {
  return (
    <View className="items-center px-xl py-2xl">
      {icon && (
        <View className="mb-md h-14 w-14 items-center justify-center rounded-full bg-paper-50 dark:bg-ink-surface">
          {icon}
        </View>
      )}
      <Text className="text-center text-base font-semibold text-paper-900 dark:text-ink-text">
        {title}
      </Text>
      {message && (
        <Text className="mt-xs text-center text-[13px] leading-[19px] text-paper-500 dark:text-ink-textMuted">
          {message}
        </Text>
      )}
    </View>
  );
}
