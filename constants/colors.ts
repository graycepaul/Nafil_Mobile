// Primary brand color: #084DA5
const airForceBlue = {
  50: '#EAF1FB',
  100: '#C9DCF4',
  200: '#A0C2EA',
  300: '#74A6DF',
  400: '#4989D3',
  500: '#2A70C7',
  600: '#155CB9',
  700: '#0C51AC',
  800: '#084DA5', // primary
  900: '#06316B',
};

const neutral = {
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
};

const semantic = {
  success: '#1C7C54',
  warning: '#C98A1B',
  danger: '#C0392B',
  info: airForceBlue[500],
};

export const lightColors = {
  primary: airForceBlue[800],
  primaryHover: airForceBlue[700],
  primaryMuted: airForceBlue[50],
  onPrimary: neutral[0],
  /**
   * Filled-button surface. Kept separate from `primary` because the two have
   * different jobs: `primary` must be legible as *text* on the page background,
   * while `buttonFill` must look like a saturated, tappable action. In dark mode
   * they diverge — a light blue that reads well as a link looks washed out as a
   * button fill.
   */
  buttonFill: airForceBlue[800],
  onButtonFill: neutral[0],
  background: neutral[0],
  surface: neutral[50],
  surfaceRaised: neutral[0],
  /** Form fields sit on white with a soft shadow rather than a grey fill. */
  inputBg: neutral[0],
  /** Full-bleed brand field: splash screen, and any inverted surface. */
  brandField: airForceBlue[800],
  border: neutral[200],
  borderStrong: neutral[300],
  text: neutral[900],
  textMuted: neutral[500],
  focusRing: airForceBlue[400],
  dangerMuted: '#FDECEA',
  successMuted: '#E6F4EE',
  warningMuted: '#FBF0DD',
  /** Text/mark colour on `brandField` — the splash screen's solid navy. */
  onHero: neutral[0],
  onHeroMuted: airForceBlue[100],
  ...semantic,
};

export const darkColors = {
  primary: airForceBlue[300],
  primaryHover: airForceBlue[200],
  primaryMuted: airForceBlue[900],
  onPrimary: neutral[900],
  // Saturated enough to read as an action against a near-black background,
  // with white text rather than the dark-on-pale-blue the link colour would give.
  buttonFill: airForceBlue[500],
  onButtonFill: neutral[0],
  background: neutral[900],
  surface: neutral[800],
  surfaceRaised: neutral[800],
  inputBg: neutral[800],
  brandField: airForceBlue[900],
  border: neutral[700],
  borderStrong: neutral[600],
  text: neutral[50],
  textMuted: neutral[400],
  focusRing: airForceBlue[300],
  dangerMuted: '#2A1512',
  successMuted: '#0F2119',
  warningMuted: '#2B2210',
  onHero: neutral[0],
  onHeroMuted: airForceBlue[200],
  ...semantic,
};

export type ThemeColors = typeof lightColors;

export const palette = { airForceBlue, neutral, semantic };
