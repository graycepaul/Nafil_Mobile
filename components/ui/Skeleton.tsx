import { useEffect, useState } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { cssInterop } from 'nativewind';

// NativeWind only patches the RN primitives it knows about (View, Text,
// Image, ...) — `Animated.View` isn't one of them, so a bare `className`
// here would be silently dropped (no size/color/rounding — the skeleton
// collapses to nothing). This registers it once so `className` works the
// same way it does on a plain `View`.
cssInterop(Animated.View, { className: 'style' });

/**
 * Pulsing placeholder block for content still loading — a card, an image, a
 * line of text — so the UI holds its shape and fades in rather than
 * flashing from empty straight to populated.
 */
export function Skeleton({
  style,
  className,
}: {
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity }, style]}
      className={`bg-paper-200 dark:bg-ink-border ${className ?? ''}`}
    />
  );
}
