import type { ReactNode } from 'react';
import { View, Platform } from 'react-native';

/**
 * Constrains the whole app to a comfortable column on web instead of
 * letting every screen stretch edge-to-edge — same idea AuthShell already
 * applies to individual auth forms (`max-w-[420px] self-center`), just
 * wrapped around the entire route tree once here.
 *
 * Two widths, matching the breakpoint `tab-options.ts` switches the tab bar
 * to a sidebar at (`lg`, Tailwind's default 1024px):
 * - Below `lg` (phone/tablet-width browsers): a narrow, phone-like column —
 *   the tab bar is still a bottom bar there, so it should look like one.
 * - At `lg` and up: a wide column with room for the sidebar and its content,
 *   still centered with margin either side rather than touching the
 *   viewport edges on an ultra-wide monitor.
 *
 * Native ignores this entirely (early return): a phone's viewport never
 * reaches even the narrow cap, so the constraint would never engage there
 * anyway, and skipping it avoids an extra View in every screen's native tree.
 */
export function AppShell({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return children;

  return (
    <View className="flex-1 items-center bg-paper-100 dark:bg-ink-raised">
      <View className="min-h-full w-full max-w-[640px] flex-1 bg-white dark:bg-ink-bg lg:max-w-[1280px]">
        {children}
      </View>
    </View>
  );
}
