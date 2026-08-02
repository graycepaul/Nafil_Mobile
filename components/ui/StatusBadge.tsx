import { View, Text } from 'react-native';
import { useTheme } from '../../context/theme-context';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** Small colored pill for status words (pending, resolved, expired, emergency…). */
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors, spacing, radius, typography } = useTheme();

  const { bg, fg } = {
    neutral: { bg: colors.surface, fg: colors.textMuted },
    success: { bg: colors.successMuted, fg: colors.success },
    warning: { bg: colors.warningMuted, fg: colors.warning },
    danger: { bg: colors.dangerMuted, fg: colors.danger },
    info: { bg: colors.primaryMuted, fg: colors.primary },
  }[tone];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: bg,
        borderRadius: radius.full,
        paddingVertical: 3,
        paddingHorizontal: spacing.sm + 2,
      }}
    >
      <Text style={[typography.micro, { color: fg, textTransform: 'uppercase' }]}>{label}</Text>
    </View>
  );
}
