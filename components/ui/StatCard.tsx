import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/theme-context';

/**
 * Tappable number-plus-label tile, used on role dashboards. Frosted in light
 * mode (a BlurView + translucent fill, over the page's own soft gradient);
 * a plain tinted surface in dark mode, where a flat background gives a blur
 * nothing to catch.
 */
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
  const { isDark } = useTheme();

  const inner = (
    <>
      <View className="mb-sm h-8 w-8 items-center justify-center rounded-md bg-brand-50 dark:bg-brand-900">
        {icon}
      </View>
      <Text className="text-[28px] font-bold leading-none text-paper-900 dark:text-ink-text">
        {value}
      </Text>
      <Text className="mt-0.5 text-[13px] text-paper-500 dark:text-ink-textMuted">{label}</Text>
    </>
  );

  if (isDark) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        className="flex-1 rounded-lg bg-ink-surface p-md shadow-sm active:opacity-85"
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="flex-1 overflow-hidden rounded-lg border border-white/65 shadow-sm active:opacity-85"
    >
      <BlurView intensity={40} tint="light" className="p-md">
        <View className="absolute inset-0 bg-white/55" />
        {inner}
      </BlurView>
    </Pressable>
  );
}
