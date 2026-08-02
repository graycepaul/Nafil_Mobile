import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../context/theme-context';

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
  const { colors, spacing, radius, typography, elevation } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
        elevation.input,
      ]}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.md,
          backgroundColor: colors.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.sm,
        }}
      >
        {icon}
      </View>
      <Text style={[typography.title, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>{label}</Text>
    </Pressable>
  );
}
