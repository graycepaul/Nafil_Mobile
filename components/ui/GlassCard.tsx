import { View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/theme-context';
import { Card } from './Card';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accent?: 'default' | 'danger';
}

/**
 * A frosted-glass take on `Card` — light mode only. Dark mode falls back to
 * the plain `Card` unchanged: a translucent blur reads as "glass" over a
 * soft, varied light background, but over a near-flat dark background it
 * would just look like a grey box, so there's nothing to gain from forcing
 * it there.
 */
export function GlassCard({ children, style, accent = 'default' }: GlassCardProps) {
  const { isDark, colors, spacing, radius, elevation } = useTheme();

  if (isDark) {
    return (
      <Card accent={accent} style={style}>
        {children}
      </Card>
    );
  }

  return (
    <View
      style={[
        {
          borderRadius: radius.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: accent === 'danger' ? colors.danger : colors.glassBorder,
          marginBottom: spacing.md,
        },
        elevation.card,
        style,
      ]}
    >
      <BlurView intensity={40} tint="light" style={{ padding: spacing.md }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: accent === 'danger' ? colors.dangerMuted : colors.glassFill,
          }}
        />
        {children}
      </BlurView>
    </View>
  );
}
