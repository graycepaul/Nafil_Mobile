import type { ReactNode } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/theme-context';

/**
 * Full-screen dismissable backdrop, used instead of React Native's own
 * `Modal`. `Modal` portals its content into a wrapper div that, in this
 * app's Expo Router web setup, collapses to zero height (its `flex-1` child
 * has no sized flex parent to fill), so the dim backdrop and card end up
 * rendered at content-size in normal document flow instead of covering the
 * screen, so the page behind bleeds through. An absolutely-positioned View
 * anchored to the nearest positioned ancestor (the screen root, which *is*
 * correctly viewport-sized) sidesteps that entirely, and works the same way
 * on native.
 *
 * The backdrop is a heavy blur plus a lightly-dimmed black rather than the
 * near-opaque black it used to be. Solid black behind a modal read as
 * harsh, especially in dark mode where the page behind it is already
 * near-black, so there was no visible depth cue at all. The blur is what
 * actually separates the modal from the page now; the black underneath it
 * is just enough to keep contrast, not doing the work on its own.
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
  const { isDark } = useTheme();
  if (!visible) return null;

  return (
    <View className="absolute inset-0 z-50">
      <BlurView
        intensity={70}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        onPress={onDismiss}
        className="flex-1 items-center justify-center bg-black/30 p-xl dark:bg-black/45"
      >
        <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-[360px]">
          {children}
        </Pressable>
      </Pressable>
    </View>
  );
}
