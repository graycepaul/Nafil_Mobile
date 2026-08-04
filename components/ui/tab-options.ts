import type { ThemeColors } from '../../constants/colors';

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
 */
export function themedTabOptions(colors: ThemeColors, bottomInset: number = 0) {
  return {
    headerShown: true,
    headerStyle: {
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerShadowVisible: false,
    headerTintColor: colors.onHeaderBg,
    headerTitleStyle: { fontWeight: '700' as const },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
      height: 58 + bottomInset,
      paddingTop: 8,
      paddingBottom: Math.max(bottomInset, 16),
    },
  };
}
