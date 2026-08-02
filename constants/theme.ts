import { Platform } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  bodyStrong: { fontSize: 16, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '500' },
  caption: { fontSize: 13, fontWeight: '400' },
  micro: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
} as const;

/** Auth screens are centred and capped so they don't stretch on tablet/desktop. */
export const layout = {
  authMaxWidth: 420,
} as const;

/**
 * Subtle elevation.
 *
 * Web takes `boxShadow` — react-native-web deprecated the `shadow*` props and warns
 * on every render if you use them. Native still wants the shadow props plus
 * `elevation`, so each level is declared per-platform rather than relying on a
 * translation layer.
 */
const shadow = (
  web: string,
  native: { color: string; opacity: number; radius: number; y: number; elevation: number }
) =>
  Platform.select({
    web: { boxShadow: web } as object,
    default: {
      shadowColor: native.color,
      shadowOpacity: native.opacity,
      shadowRadius: native.radius,
      shadowOffset: { width: 0, height: native.y },
      elevation: native.elevation,
    } as object,
  })!;

export const elevation = {
  /** Very soft lift on form fields — what gives the auth screens their airy feel. */
  input: shadow('0 2px 10px rgba(30, 41, 107, 0.06)', {
    color: '#1E296B',
    opacity: 0.06,
    radius: 10,
    y: 2,
    elevation: 1,
  }),
  card: shadow('0 4px 12px rgba(15, 17, 22, 0.08)', {
    color: '#0F1116',
    opacity: 0.08,
    radius: 12,
    y: 4,
    elevation: 3,
  }),
  raised: shadow('0 8px 24px rgba(15, 17, 22, 0.14)', {
    color: '#0F1116',
    opacity: 0.14,
    radius: 24,
    y: 8,
    elevation: 8,
  }),
} as const;
