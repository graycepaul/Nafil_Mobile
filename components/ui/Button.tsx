import { Pressable, Text, ActivityIndicator, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/theme-context';

type Variant = 'primary' | 'danger' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Still accepted for one-off layout overrides (e.g. `{ flex: 1 }`) — merges with className, doesn't replace it. */
  style?: ViewStyle;
  className?: string;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-brand-800 dark:bg-brand-500 shadow-sm',
  danger: 'bg-danger shadow-sm',
  secondary: 'bg-transparent border-[1.5px] border-brand-800 dark:border-brand-300',
  ghost: 'bg-transparent',
};

const VARIANT_TEXT_CLASSES: Record<Variant, string> = {
  primary: 'text-white',
  danger: 'text-white',
  secondary: 'text-brand-800 dark:text-brand-300',
  ghost: 'text-paper-500 dark:text-ink-textMuted',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  className,
}: ButtonProps) {
  const isInactive = disabled || loading;
  // ActivityIndicator's `color` is a native prop, not a style — className
  // can't reach it, so this is the one spot that still needs theme-context.
  const { colors } = useTheme();
  const spinnerColor = {
    primary: '#fff',
    danger: '#fff',
    secondary: colors.primary,
    ghost: colors.textMuted,
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={style}
      className={`min-h-[52px] items-center justify-center rounded-md px-lg py-[16px] active:opacity-90 active:scale-[0.99] disabled:opacity-45 ${VARIANT_CLASSES[variant]} ${className ?? ''}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text className={`text-base font-semibold tracking-[0.1px] ${VARIANT_TEXT_CLASSES[variant]}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
