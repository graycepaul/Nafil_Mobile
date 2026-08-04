import type { ThemeColors } from '../../constants/colors';

/**
 * Shared tab navigator styling so every role's tab bar matches the theme.
 * No blanket headerRight here — the settings gear only belongs on each
 * role's primary/home tab (and resident's Profile), so it's set per-screen
 * in each role's _layout.tsx instead of globally.
 */
export function themedTabOptions(colors: ThemeColors) {
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
    },
  };
}
