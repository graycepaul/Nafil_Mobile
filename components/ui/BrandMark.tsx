import { Image, View, Text } from 'react-native';

/**
 * Nafil Estates mark: the Nigerian Air Force Properties Limited crest.
 * Raster (not SVG) since it's a detailed circular seal, not a simple glyph —
 * the source has its own fixed colors, so unlike the old placeholder shield
 * this can't be recolored per surface via `color`/`accent` props.
 */
export function BrandMark({ size = 56 }: { size?: number }) {
  return (
    <Image source={require('../../assets/brand-mark.png')} style={{ width: size, height: size }} resizeMode="contain" />
  );
}

interface LockupProps {
  size?: 'sm' | 'md' | 'lg';
  /** Renders the wordmark in white, for use on the navy splash. */
  inverted?: boolean;
  /** 'row' puts the mark beside the wordmark — compact enough for a screen header. */
  direction?: 'row' | 'column';
}

const MARK_SIZES = { sm: 30, md: 44, lg: 64 } as const;
const TITLE_CLASSES = {
  sm: 'text-[20px]',
  md: 'text-[26px]',
  lg: 'text-[34px]',
} as const;

export function BrandLockup({ size = 'md', inverted = false, direction = 'row' }: LockupProps) {
  const isRow = direction === 'row';

  return (
    <View className={`items-center ${isRow ? 'flex-row gap-[10px]' : 'flex-col gap-md'}`}>
      <BrandMark size={MARK_SIZES[size]} />
      <Text
        className={`font-bold tracking-[-0.6px] ${TITLE_CLASSES[size]} ${
          inverted ? 'text-white' : 'text-paper-900 dark:text-ink-text'
        }`}
      >
        Nafil
        <Text className={inverted ? 'text-brand-100 dark:text-brand-200' : 'text-brand-800 dark:text-brand-300'}>
          {' '}
          Estates
        </Text>
      </Text>
    </View>
  );
}
