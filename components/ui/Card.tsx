import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/theme-context';

interface CardProps extends ViewProps {
  accent?: 'default' | 'danger';
  style?: ViewStyle;
}

export function Card({ accent = 'default', style, children, ...props }: CardProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      style={[
        {
          borderWidth: 1,
          borderColor: accent === 'danger' ? colors.danger : colors.border,
          backgroundColor: accent === 'danger' ? colors.primaryMuted : colors.surface,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
