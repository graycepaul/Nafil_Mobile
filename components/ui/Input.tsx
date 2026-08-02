import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '../../context/theme-context';

/**
 * Chrome paints its own focus outline (amber in dark mode) over ours. We draw a
 * themed border on focus that works on every platform, so the browser's is
 * redundant — suppressing it keeps focus looking intentional without costing
 * keyboard users their focus indicator.
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
  const { colors, radius, spacing, typography, elevation } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error
    ? colors.danger
    : focused
      ? colors.primary
      : colors.border;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {showLabel && label && (
        <Text style={[typography.label, { color: colors.text, marginBottom: spacing.sm }]}>
          {label}
        </Text>
      )}

      <View
        style={[
          {
            position: 'relative',
            justifyContent: 'center',
            backgroundColor: colors.inputBg,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor,
          },
          !error && elevation.input,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          secureTextEntry={passwordToggle ? !revealed : props.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          accessibilityLabel={label}
          style={[
            styles.input,
            suppressBrowserOutline,
            {
              color: colors.text,
              paddingVertical: spacing.md + 4,
              paddingLeft: spacing.lg,
              paddingRight: passwordToggle ? spacing['3xl'] + spacing.md : spacing.lg,
            },
            props.multiline && {
              minHeight: multilineHeight ?? 96,
              textAlignVertical: 'top',
              paddingTop: spacing.md,
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
            style={({ pressed }) => ({
              position: 'absolute',
              right: spacing.lg,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </View>

      {error ? (
        <Text
          style={[typography.caption, { color: colors.danger, marginTop: spacing.xs }]}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : hint ? (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.xs }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 15, backgroundColor: 'transparent' },
});
