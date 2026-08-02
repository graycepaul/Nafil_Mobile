import type { ThemeColors } from '../../constants/colors';

/** Shared tab navigator styling so every role's tab bar matches the theme. */
export function themedTabOptions(colors: ThemeColors) {
  return {
    headerShown: true,
    headerStyle: { backgroundColor: colors.primary },
    headerTintColor: colors.onPrimary,
    headerTitleStyle: { fontWeight: '700' as const },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.background,
      borderTopColor: colors.border,
    },
  };
}
