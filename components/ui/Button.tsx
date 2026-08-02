import { Pressable, Text, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/theme-context';

type Variant = 'primary' | 'danger' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { colors, radius, spacing, elevation } = useTheme();

  const background = {
    primary: colors.buttonFill,
    danger: colors.danger,
    secondary: 'transparent',
    ghost: 'transparent',
  }[variant];

  const foreground = {
    primary: colors.onButtonFill,
    danger: colors.onButtonFill,
    secondary: colors.primary,
    ghost: colors.textMuted,
  }[variant];

  const isOutlined = variant === 'secondary';
  const isFilled = variant === 'primary' || variant === 'danger';
  const isInactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderRadius: radius.md,
          paddingVertical: spacing.md + 4,
          paddingHorizontal: spacing.lg,
          borderWidth: isOutlined ? 1.5 : 0,
          borderColor: colors.primary,
          opacity: isInactive ? 0.45 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !isInactive ? 0.99 : 1 }],
        },
        isFilled && !isInactive && elevation.card,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <Text style={[styles.label, { color: foreground }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: 0.1 },
});
