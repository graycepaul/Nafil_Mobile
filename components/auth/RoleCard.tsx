import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

interface RoleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

/** Selectable card for the "sign up as" role picker. */
export function RoleCard({ icon, title, description, selected, onPress }: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      className={`flex-row items-start gap-md rounded-lg border-[1.5px] p-lg active:opacity-85 ${
        selected
          ? 'border-brand-800 bg-brand-50 dark:border-brand-300 dark:bg-brand-900'
          : 'border-paper-200 bg-white shadow-sm dark:border-ink-border dark:bg-ink-surface'
      }`}
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-md ${
          selected ? 'bg-brand-800 dark:bg-brand-500' : 'bg-paper-50 dark:bg-ink-surface'
        }`}
      >
        {icon}
      </View>

      <View className="flex-1">
        <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">{title}</Text>
        <Text className="mt-0.5 text-[13px] leading-[18px] text-paper-500 dark:text-ink-textMuted">
          {description}
        </Text>
      </View>

      <View
        className={`mt-0.5 h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
          selected ? 'border-brand-800 dark:border-brand-300' : 'border-paper-300 dark:border-ink-borderStrong'
        }`}
      >
        {selected && <View className="h-3 w-3 rounded-full bg-brand-800 dark:bg-brand-300" />}
      </View>
    </Pressable>
  );
}
