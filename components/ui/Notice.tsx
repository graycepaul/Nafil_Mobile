import { View, Text } from 'react-native';
import { useTheme } from '../../context/theme-context';

type Tone = 'error' | 'success' | 'info';

/**
 * Inline form-level feedback. Replaces Alert.alert for auth, which matters
 * because react-native-web doesn't implement Alert — errors raised that way are
 * invisible in the browser.
 */
export function Notice({ tone = 'error', message }: { tone?: Tone; message: string }) {
  const { colors, spacing, radius, typography } = useTheme();

  const { bg, fg, border } = {
    error: { bg: colors.dangerMuted, fg: colors.danger, border: colors.danger },
    success: { bg: colors.successMuted, fg: colors.success, border: colors.success },
    info: { bg: colors.primaryMuted, fg: colors.primary, border: colors.primary },
  }[tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        backgroundColor: bg,
        borderLeftWidth: 3,
        borderLeftColor: border,
        borderRadius: radius.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.lg,
      }}
    >
      <Text style={[typography.caption, { color: fg, lineHeight: 19 }]}>{message}</Text>
    </View>
  );
}
