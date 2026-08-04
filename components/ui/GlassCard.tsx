import { View, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/theme-context';
import { Card } from './Card';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  className?: string;
  accent?: 'default' | 'danger';
}

/**
 * A frosted-glass take on `Card` — light mode only. Dark mode falls back to
 * the plain `Card` unchanged: a translucent blur reads as "glass" over a
 * soft, varied light background, but over a near-flat dark background it
 * would just look like a grey box, so there's nothing to gain from forcing
 * it there.
 */
export function GlassCard({ children, style, className, accent = 'default' }: GlassCardProps) {
  const { isDark } = useTheme();

  if (isDark) {
    return (
      <Card accent={accent} style={style} className={className}>
        {children}
      </Card>
    );
  }

  return (
    <View
      style={style}
      className={`mb-md overflow-hidden rounded-md border shadow-sm ${
        accent === 'danger' ? 'border-danger' : 'border-white/65'
      } ${className ?? ''}`}
    >
      <BlurView intensity={40} tint="light" className="p-md">
        <View className={`absolute inset-0 ${accent === 'danger' ? 'bg-danger-muted' : 'bg-white/55'}`} />
        {children}
      </BlurView>
    </View>
  );
}
