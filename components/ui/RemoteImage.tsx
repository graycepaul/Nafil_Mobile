import { useState } from 'react';
import { Image, View, type ImageResizeMode, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import { useTheme } from '../../context/theme-context';
import { Skeleton } from './Skeleton';

const FILL: StyleProp<ViewStyle> = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

/**
 * Drop-in replacement for a plain `<Image source={{ uri }} .../>` that shows
 * a pulsing skeleton while the image loads and a placeholder glyph if it
 * fails, instead of a blank box flashing straight to the photo (or staying
 * blank forever on a broken URL). `style`/`className` size and round the
 * outer container exactly as they would the `Image` itself — the image and
 * its loading/error states fill that container.
 */
export function RemoteImage({
  uri,
  style,
  className,
  resizeMode = 'cover',
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
  resizeMode?: ImageResizeMode;
}) {
  const { colors } = useTheme();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <View style={style} className={`overflow-hidden ${className ?? ''}`}>
      {status !== 'error' && (
        <Image
          source={{ uri }}
          resizeMode={resizeMode}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          style={{ width: '100%', height: '100%' }}
        />
      )}
      {status === 'loading' && <Skeleton style={FILL} />}
      {status === 'error' && (
        <View style={FILL} className="items-center justify-center bg-paper-100 dark:bg-ink-surface">
          <Ionicons name="image-outline" size={18} color={colors.textMuted} />
        </View>
      )}
    </View>
  );
}
