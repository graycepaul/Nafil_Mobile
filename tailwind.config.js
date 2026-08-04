/**
 * Mirrors the design tokens in constants/colors.ts and constants/theme.ts —
 * same brand palette, spacing, and radius scale, just expressed as Tailwind
 * utilities instead of theme-context lookups. Colors that change between
 * light/dark (background, surface, border, text) get two named scales
 * (`paper` = light neutral, `ink` = dark neutral) rather than one token that
 * resolves differently at runtime — that's the standard Tailwind dark-mode
 * shape: pair a utility with its `dark:` variant, e.g.
 * `bg-paper-50 dark:bg-ink-surface`. `darkMode: 'class'` because the app
 * drives dark mode itself (system/light/dark, persisted) rather than
 * following the OS in real time — see context/theme-context.tsx, which
 * calls nativewind's `colorScheme.set()` to keep the two in sync.
 */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EAF1FB',
          100: '#C9DCF4',
          200: '#A0C2EA',
          300: '#74A6DF',
          400: '#4989D3',
          500: '#2A70C7',
          600: '#155CB9',
          700: '#0C51AC',
          800: '#084DA5',
          900: '#06316B',
        },
        paper: {
          0: '#FFFFFF',
          50: '#F7F8FA',
          100: '#EEF0F3',
          200: '#DEE1E6',
          300: '#C3C8D0',
          400: '#9AA1AC',
          500: '#6B7280',
          600: '#4B5160',
          700: '#333846',
          800: '#1E212B',
          900: '#0F1116',
        },
        ink: {
          bg: '#1C1C1E',
          surface: '#242426',
          raised: '#2C2C2E',
          border: '#3A3A3C',
          borderStrong: '#48484A',
          text: '#F2F2F7',
          textMuted: '#98989D',
        },
        success: { DEFAULT: '#1C7C54', muted: '#E6F4EE', mutedDark: '#0F2119' },
        warning: { DEFAULT: '#C98A1B', muted: '#FBF0DD', mutedDark: '#2B2210' },
        danger: { DEFAULT: '#C0392B', muted: '#FDECEA', mutedDark: '#2A1512' },
        info: '#2A70C7',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
    },
  },
  plugins: [],
};
