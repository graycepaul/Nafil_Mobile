import type { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/theme-context';

/** Consistent "nothing here yet" treatment — an icon, a line, an optional nudge. */
export function EmptyState({
  icon,
  title,
  message,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
}) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing['2xl'], paddingHorizontal: spacing.xl }}>
      {icon && (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radius.full,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.md,
          }}
        >
          {icon}
        </View>
      )}
      <Text style={[typography.bodyStrong, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>
      {message && (
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, lineHeight: 19 },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}
