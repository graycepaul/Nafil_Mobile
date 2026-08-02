import { View, Text } from 'react-native';
import { useTheme } from '../../context/theme-context';
import { passwordStrength } from '../../lib/validation';

/** Three-segment strength hint. Advisory only — the enforced rule is minimum length. */
export function PasswordMeter({ password }: { password: string }) {
  const { colors, spacing, radius, typography } = useTheme();
  const { level, label } = passwordStrength(password);

  const filled = { weak: 1, fair: 2, strong: 3 }[level];
  const tone = { weak: colors.danger, fair: colors.warning, strong: colors.success }[level];

  return (
    <View style={{ marginTop: -spacing.sm, marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: radius.full,
              backgroundColor: i < filled ? tone : colors.border,
            }}
          />
        ))}
      </View>
      <Text style={[typography.caption, { color: tone, marginTop: spacing.xs }]}>{label}</Text>
    </View>
  );
}
