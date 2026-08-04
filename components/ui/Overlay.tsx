import type { ReactNode } from 'react';
import { View, Pressable } from 'react-native';

/**
 * Full-screen dismissable backdrop, used instead of React Native's own
 * `Modal`. `Modal` portals its content into a wrapper div that, in this
 * app's Expo Router web setup, collapses to zero height (its `flex-1` child
 * has no sized flex parent to fill) — the dim backdrop and card end up
 * rendered at content-size in normal document flow instead of covering the
 * screen, so the page behind bleeds through. An absolutely-positioned View
 * anchored to the nearest positioned ancestor (the screen root, which *is*
 * correctly viewport-sized) sidesteps that entirely, and works the same way
 * on native.
 */
export function Overlay({
  visible,
  onDismiss,
  children,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
}) {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50">
      <Pressable onPress={onDismiss} className="flex-1 items-center justify-center bg-black/95 p-xl">
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[360px]">
          {children}
        </Pressable>
      </Pressable>
    </View>
  );
}
