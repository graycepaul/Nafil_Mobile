import { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { BrandLockup } from '../components/ui/BrandMark';

/**
 * Branded splash shown while the session and profile resolve. The root layout
 * redirects away as soon as it knows the role, so this is usually on screen for
 * a few hundred milliseconds — long enough that a bare spinner would read as a
 * stall, short enough that the entrance has to be quick.
 */
export default function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale]);

  return (
    <View className="flex-1 items-center justify-center bg-brand-800 dark:bg-brand-900">
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <BrandLockup size="lg" direction="column" inverted />
      </Animated.View>
    </View>
  );
}
