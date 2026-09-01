import type { ReactNode } from 'react';
import { View, Platform } from 'react-native';

/**
 * Constrains the whole app to a comfortable column on wide desktop screens
 * instead of letting every screen stretch edge-to-edge — same idea AuthShell
 * already applies to individual auth forms (`max-w-[420px] self-center`),
 * just wrapped around the entire route tree once here.
 *
 * Full width below `lg` (Tailwind's default 1024px, the same breakpoint
 * `tab-options.ts` switches the tab bar to a sidebar at) — that covers phones
 * *and* tablets, which still get the bottom tab bar and should use their
 * real width for it rather than being squeezed into a narrow phone-width
 * column with dead margins either side (an iPad in portrait is ~768-834px
 * and was landing well inside an earlier, too-aggressive 640px cap here).
 * Only at `lg` and up — real laptop/desktop widths, where the tab bar has
 * already become a sidebar — does a max-width apply, still centered with
 * margin either side rather than touching the edges on an ultra-wide monitor.
 *
 * Native ignores this entirely (early return): a phone's viewport never
 * reaches even the widest cap, so the constraint would never engage there
 * anyway, and skipping it avoids an extra View in every screen's native tree.
 */
export function AppShell({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return children;

  return (
    <View className="flex-1 items-center bg-paper-100 dark:bg-ink-raised">
      <View className="min-h-full w-full flex-1 bg-white dark:bg-ink-bg lg:max-w-[1280px]">
        {children}
      </View>
    </View>
  );
}
