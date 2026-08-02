import Svg, { Path, G } from 'react-native-svg';
import { View, Text } from 'react-native';
import { useTheme } from '../../context/theme-context';

/**
 * Nafil Estates mark: a shield (security) enclosing a roofline (estate).
 * SVG so it stays crisp at any size and can be tinted per surface.
 */
export function BrandMark({
  size = 56,
  color,
  accent,
}: {
  size?: number;
  color?: string;
  accent?: string;
}) {
  const { colors } = useTheme();
  const shield = color ?? colors.primary;
  const roof = accent ?? colors.onPrimary;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G>
        <Path
          d="M24 3.5 41 10.2v13.1c0 10.4-8.1 17.9-17 21.2-8.9-3.3-17-10.8-17-21.2V10.2L24 3.5Z"
          fill={shield}
        />
        <Path
          d="M24 14.2 33.6 22v1.9h-2.9v9.4h-4.2v-6.1h-4.9v6.1h-4.2v-9.4h-2.9V22L24 14.2Z"
          fill={roof}
        />
      </G>
    </Svg>
  );
}

interface LockupProps {
  size?: 'sm' | 'md' | 'lg';
  /** Renders the wordmark in white, for use on the navy splash. */
  inverted?: boolean;
  /** 'row' puts the mark beside the wordmark — compact enough for a screen header. */
  direction?: 'row' | 'column';
}

const SIZES = {
  sm: { mark: 30, title: 20 },
  md: { mark: 44, title: 26 },
  lg: { mark: 64, title: 34 },
} as const;

export function BrandLockup({ size = 'md', inverted = false, direction = 'row' }: LockupProps) {
  const { colors, spacing } = useTheme();
  const { mark, title } = SIZES[size];
  const isRow = direction === 'row';

  const markColor = inverted ? colors.onHero : colors.primary;
  const markAccent = inverted ? colors.primary : colors.onPrimary;

  return (
    <View
      style={{
        flexDirection: isRow ? 'row' : 'column',
        alignItems: 'center',
        gap: isRow ? spacing.sm + 2 : spacing.md,
      }}
    >
      <BrandMark size={mark} color={markColor} accent={markAccent} />
      <Text
        style={{
          fontSize: title,
          fontWeight: '700',
          letterSpacing: -0.6,
          color: inverted ? colors.onHero : colors.text,
        }}
      >
        Nafil<Text style={{ color: inverted ? colors.onHeroMuted : colors.primary }}> Estates</Text>
      </Text>
    </View>
  );
}
