import { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, type TextInputProps } from 'react-native';
import { useTheme } from '../../context/theme-context';

/**
 * Fields are deliberately static: no visual change on focus at all, on any
 * platform, so this only exists to stop the browser from painting its own
 * focus outline (amber in dark mode) on top of that flat look.
 */
const suppressBrowserOutline = Platform.select({
  web: { outlineStyle: 'none' } as object,
  default: {},
});

interface InputProps extends TextInputProps {
  /**
   * Accessible name. Rendered visually only when `showLabel` is set — the auth
   * screens are placeholder-only by design, but screen readers still need a name.
   */
  label?: string;
  showLabel?: boolean;
  error?: string;
  hint?: string;
  multilineHeight?: number;
  /** Adds a show/hide toggle. Implies secure entry. */
  passwordToggle?: boolean;
}

export function Input({
  label,
  showLabel = false,
  error,
  hint,
  multilineHeight,
  passwordToggle,
  style,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [revealed, setRevealed] = useState(false);

  return (
    <View className="mb-lg">
      {showLabel && label && (
        <Text className="mb-sm text-sm font-medium text-paper-900 dark:text-ink-text">{label}</Text>
      )}

      <View
        className={`relative justify-center rounded-md border bg-white dark:bg-ink-surface ${
          error
            ? 'border-danger'
            : 'border-paper-200 dark:border-ink-border'
        }`}
      >
        <TextInput
          placeholderTextColor={colors.placeholder}
          secureTextEntry={passwordToggle ? !revealed : props.secureTextEntry}
          accessibilityLabel={label}
          className={`bg-transparent text-[15px] text-paper-900 dark:text-ink-text py-[16px] pl-lg ${
            passwordToggle ? 'pr-[60px]' : 'pr-lg'
          }`}
          style={[
            suppressBrowserOutline,
            props.multiline && {
              minHeight: multilineHeight ?? 96,
              textAlignVertical: 'top',
              paddingTop: 12,
            },
            style,
          ]}
          {...props}
        />

        {passwordToggle && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={8}
            className="absolute right-lg active:opacity-60"
          >
            <Text className="text-[13px] font-semibold text-brand-800 dark:text-brand-300">
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </View>

      {error ? (
        <Text className="mt-xs text-[13px] text-danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text className="mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">{hint}</Text>
      ) : null}
    </View>
  );
}
