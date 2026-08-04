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
  const { isDark, colors, spacing, radius, typography, elevation } = useTheme();

  const inner = (
    <>
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
    </>
  );

  if (isDark) {
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
        {inner}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        {
          flex: 1,
          borderRadius: radius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.glassBorder,
          opacity: pressed ? 0.85 : 1,
        },
        elevation.input,
      ]}
    >
      <BlurView intensity={40} tint="light" style={{ padding: spacing.md }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.glassFill,
          }}
        />
        {inner}
      </BlurView>
    </Pressable>
  );
}
