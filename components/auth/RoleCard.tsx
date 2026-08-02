import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../../context/theme-context';

interface RoleCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

/** Selectable card for the "sign up as" role picker. */
export function RoleCard({ icon, title, description, selected, onPress }: RoleCardProps) {
  const { colors, spacing, radius, typography, elevation } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={title}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primaryMuted : colors.inputBg,
          opacity: pressed ? 0.85 : 1,
        },
        !selected && elevation.input,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: selected ? colors.buttonFill : colors.surface,
        }}
      >
        {icon}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>{title}</Text>
        <Text
          style={[typography.caption, { color: colors.textMuted, marginTop: 2, lineHeight: 18 }]}
        >
          {description}
        </Text>
      </View>

      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.full,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        {selected && (
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: radius.full,
              backgroundColor: colors.primary,
            }}
          />
        )}
      </View>
    </Pressable>
  );
}
