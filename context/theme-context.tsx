import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import { darkColors, lightColors, type ThemeColors } from '../constants/colors';
import { useThemeStore, type ThemeMode } from '../store/theme-store';
import { elevation, layout, radius, spacing, typography } from '../constants/theme';

interface ThemeContextValue {
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
  layout: typeof layout;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const isDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  // NativeWind resolves `dark:` classes off its own colorScheme, which by
  // default just mirrors the OS. This app has its own resolved value (mode
  // can be 'system' | 'light' | 'dark', persisted) — push that in directly
  // rather than let NativeWind re-derive it, so `dark:` classes and the
  // theme-context colors never disagree. Has to run in a layout effect, not
  // a regular effect: a regular effect fires after paint, so on a mode
  // switch everything reading `colors` from this context (headers) flips
  // immediately while everything styled with `dark:` classNames waits a
  // whole extra frame for NativeWind to catch up — a visible flash where
  // the header goes dark before the rest of the screen does.
  useLayoutEffect(() => {
    nativewindColorScheme.set(isDark ? 'dark' : 'light');
  }, [isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      spacing,
      radius,
      typography,
      elevation,
      layout,
      isDark,
      mode,
      setMode,
    }),
    [isDark, mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
