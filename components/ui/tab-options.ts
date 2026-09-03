import { Platform } from 'react-native';
import type { ThemeColors } from '../../constants/colors';

/** Matches Tailwind's default `lg` breakpoint — the same width AppShell switches its container at. */
export const DESKTOP_SIDEBAR_BREAKPOINT = 1024;

/**
 * Matches Tailwind's default `md` breakpoint. A phone-width bottom bar tops
 * out at ~5 tabs before it gets cramped, so a few screens that would
 * otherwise crowd it (Announcements, admin Marketplace/Dues) are reached via
 * an icon instead and hidden from the bar entirely (`href: null`) below
 * this width. At/above it — a tablet in portrait, same width or wider than
 * this well before the sidebar breakpoint kicks in — there's room to just
 * show them as real tabs instead of one more tap away.
 */
export const TAB_PROMOTION_BREAKPOINT = 768;

/**
 * Shared tab navigator styling so every role's tab bar matches the theme.
 * No blanket headerRight here — the settings gear only belongs on each
 * role's primary/home tab (and resident's Profile), so it's set per-screen
 * in each role's _layout.tsx instead of globally.
 *
 * `bottomInset` is the device's safe-area bottom inset (0 on devices without
 * a home indicator) — passed in explicitly since this isn't a component and
 * can't call useSafeAreaInsets itself. Height/padding are set explicitly
 * rather than left to the navigator default so there's always some breathing
 * room below the icons, not just whatever the safe area happens to be.
 *
 * `width` is the current window width (from `useWindowDimensions`, which is
 * reactive on web) — at or above `DESKTOP_SIDEBAR_BREAKPOINT` on web, the tab
 * bar switches from a bottom bar to a left sidebar via Expo Router's
 * `tabBarPosition` (a real React Navigation v7 layout mode, not a manual
 * absolute-position hack). Native ignores this: a phone's width never
 * reaches the breakpoint, so it always gets the normal bottom bar.
 */
export function themedTabOptions(colors: ThemeColors, bottomInset: number = 0, width: number = 0) {
  const isDesktopSidebar = Platform.OS === 'web' && width >= DESKTOP_SIDEBAR_BREAKPOINT;

  return {
    headerShown: true,
    headerStyle: {
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerShadowVisible: false,
    headerTintColor: colors.onHeaderBg,
    headerTitleAlign: 'left' as const,
    headerTitleStyle: { fontWeight: '700' as const },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarShowLabel: true,
    tabBarPosition: (isDesktopSidebar ? 'left' : 'bottom') as 'left' | 'bottom',
    tabBarLabelPosition: (isDesktopSidebar ? 'beside-icon' : 'below-icon') as 'beside-icon' | 'below-icon',
    tabBarLabelStyle: isDesktopSidebar
      ? { fontSize: 14, fontWeight: '600' as const, marginLeft: 12 }
      : { fontSize: 11, lineHeight: 13, fontWeight: '600' as const, marginTop: 4 },
    tabBarItemStyle: isDesktopSidebar
      ? {
          flexDirection: 'row' as const,
          justifyContent: 'flex-start' as const,
          alignItems: 'center' as const,
          height: 46,
          borderRadius: 10,
          marginHorizontal: 12,
          marginVertical: 2,
          paddingHorizontal: 14,
        }
      : { paddingTop: 2 },
    tabBarStyle: isDesktopSidebar
      ? {
          backgroundColor: colors.background,
          borderRightWidth: 1,
          borderRightColor: colors.border,
          width: 232,
          paddingTop: 20,
        }
      : {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 78 + bottomInset,
          paddingTop: 6,
          paddingBottom: Math.max(bottomInset, 16),
        },
    // Caps and centers each screen's own content within the sidebar's
    // remaining space — without this, a screen's cards/lists (which each
    // just use `flex-1` to fill whatever they're given) stretch edge-to-edge
    // across the full pane, which reads as "stretched" well before a
    // desktop-width screen runs out of room. Only sets width/maxWidth/
    // alignSelf, not height, so it doesn't interfere with any screen's own
    // flex-1 vertical fill.
    sceneStyle: isDesktopSidebar
      ? { width: '100%' as const, maxWidth: 1100, alignSelf: 'center' as const }
      : undefined,
  };
}
