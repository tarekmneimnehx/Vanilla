import { Platform } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textOnPrimary: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryTint: string;
  sand: string;
  sandDeep: string;
  stone: string;
  water: string;
  waterSoft: string;
  waterDeep: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  skipped: string;
  overlay: string;
  shadow: string;
  orb: { a: string; b: string; c: string; d: string; glow: string };
}

export const light: Palette = {
  background: '#F7F5EF',
  surface: '#FFFEFA',
  surfaceAlt: '#F1EDE3',
  surfaceSunken: '#EDE8DC',
  border: '#E4DED1',
  borderStrong: '#CFC7B8',
  text: '#243C33',
  textSecondary: '#5B6961',
  textMuted: '#7E8A82',
  textOnPrimary: '#FFFEFA',
  primary: '#286653',
  primaryPressed: '#1F5443',
  primarySoft: '#DDEBE2',
  primaryTint: '#ECF3EE',
  sand: '#E8DDCC',
  sandDeep: '#D6C7AF',
  stone: '#B7B0A3',
  water: '#4F8F98',
  waterSoft: '#D7E8EA',
  waterDeep: '#3C7680',
  warn: '#A8672E',
  warnSoft: '#F4E5D2',
  danger: '#A34B3A',
  dangerSoft: '#F3DCD7',
  success: '#286653',
  successSoft: '#DDEBE2',
  skipped: '#8B8578',
  overlay: 'rgba(36, 60, 51, 0.32)',
  shadow: '#243C33',
  orb: { a: '#DDEBE2', b: '#9CC3AE', c: '#286653', d: '#E8DDCC', glow: '#F4F0E4' },
};

export const dark: Palette = {
  background: '#131A16',
  surface: '#1B2420',
  surfaceAlt: '#222D28',
  surfaceSunken: '#0F1512',
  border: '#2C3832',
  borderStrong: '#3C4A43',
  text: '#EEF1EA',
  textSecondary: '#AEB9B1',
  textMuted: '#7F8B84',
  textOnPrimary: '#0F1A15',
  primary: '#8CC5AA',
  primaryPressed: '#A5D3BC',
  primarySoft: '#26413A',
  primaryTint: '#1E312B',
  sand: '#4B4335',
  sandDeep: '#5E5442',
  stone: '#6C665A',
  water: '#7FB9C0',
  waterSoft: '#213A3D',
  waterDeep: '#9DCED4',
  warn: '#E0A56E',
  warnSoft: '#37302A',
  danger: '#E39182',
  dangerSoft: '#40241F',
  success: '#8CC5AA',
  successSoft: '#26413A',
  skipped: '#9A9385',
  overlay: 'rgba(0, 0, 0, 0.55)',
  shadow: '#000000',
  orb: { a: '#26413A', b: '#4E7F68', c: '#8CC5AA', d: '#4B4335', glow: '#1E2A25' },
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  screen: 20,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  display: Platform.select({ web: 'Fraunces, Georgia, serif', default: 'Fraunces_500Medium' }) as string,
  displayRegular: Platform.select({ web: 'Fraunces, Georgia, serif', default: 'Fraunces_400Regular' }) as string,
  displaySemibold: Platform.select({ web: 'Fraunces, Georgia, serif', default: 'Fraunces_600SemiBold' }) as string,
  body: Platform.select({ web: 'Manrope, system-ui, sans-serif', default: 'Manrope_400Regular' }) as string,
  bodyMedium: Platform.select({ web: 'Manrope, system-ui, sans-serif', default: 'Manrope_500Medium' }) as string,
  bodySemibold: Platform.select({ web: 'Manrope, system-ui, sans-serif', default: 'Manrope_600SemiBold' }) as string,
  bodyBold: Platform.select({ web: 'Manrope, system-ui, sans-serif', default: 'Manrope_700Bold' }) as string,
  arabic: Platform.select({ web: '"IBM Plex Sans Arabic", system-ui, sans-serif', default: 'IBMPlexSansArabic_400Regular' }) as string,
  arabicMedium: Platform.select({ web: '"IBM Plex Sans Arabic", system-ui, sans-serif', default: 'IBMPlexSansArabic_500Medium' }) as string,
  arabicSemibold: Platform.select({ web: '"IBM Plex Sans Arabic", system-ui, sans-serif', default: 'IBMPlexSansArabic_600SemiBold' }) as string,
} as const;

export type TypeVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small' | 'smallStrong' | 'caption' | 'label' | 'numeral';

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
  family: 'display' | 'displayRegular' | 'displaySemibold' | 'body' | 'bodyMedium' | 'bodySemibold' | 'bodyBold';
  arabicFamily: 'arabic' | 'arabicMedium' | 'arabicSemibold';
  maxFontSizeMultiplier: number;
}

export const typography: Record<TypeVariant, TypeStyle> = {
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.4, family: 'display', arabicFamily: 'arabicSemibold', maxFontSizeMultiplier: 1.4 },
  title: { fontSize: 26, lineHeight: 32, letterSpacing: -0.3, family: 'display', arabicFamily: 'arabicSemibold', maxFontSizeMultiplier: 1.5 },
  heading: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2, family: 'display', arabicFamily: 'arabicSemibold', maxFontSizeMultiplier: 1.6 },
  subheading: { fontSize: 17, lineHeight: 23, family: 'bodySemibold', arabicFamily: 'arabicSemibold', maxFontSizeMultiplier: 1.8 },
  body: { fontSize: 16, lineHeight: 23, family: 'body', arabicFamily: 'arabic', maxFontSizeMultiplier: 2 },
  bodyStrong: { fontSize: 16, lineHeight: 23, family: 'bodySemibold', arabicFamily: 'arabicSemibold', maxFontSizeMultiplier: 2 },
  small: { fontSize: 14, lineHeight: 20, family: 'body', arabicFamily: 'arabic', maxFontSizeMultiplier: 2 },
  smallStrong: { fontSize: 14, lineHeight: 20, family: 'bodySemibold', arabicFamily: 'arabicSemibold', maxFontSizeMultiplier: 2 },
  caption: { fontSize: 12, lineHeight: 17, letterSpacing: 0.2, family: 'bodyMedium', arabicFamily: 'arabicMedium', maxFontSizeMultiplier: 2 },
  label: { fontSize: 13, lineHeight: 18, letterSpacing: 0.6, family: 'bodySemibold', arabicFamily: 'arabicSemibold', maxFontSizeMultiplier: 2 },
  numeral: { fontSize: 30, lineHeight: 36, letterSpacing: -0.5, family: 'displaySemibold', arabicFamily: 'arabicSemibold', maxFontSizeMultiplier: 1.4 },
};

export const shadows = {
  card: Platform.select({
    ios: { shadowColor: '#243C33', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 1 },
    default: { boxShadow: '0 6px 16px rgba(36, 60, 51, 0.06)' },
  }) as object,
  raised: Platform.select({
    ios: { shadowColor: '#243C33', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
    android: { elevation: 4 },
    default: { boxShadow: '0 10px 24px rgba(36, 60, 51, 0.12)' },
  }) as object,
};

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadows: typeof shadows;
  isDark: boolean;
}

export function makeTheme(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: scheme === 'dark' ? dark : light,
    spacing,
    radius,
    typography,
    shadows,
    isDark: scheme === 'dark',
  };
}

/** Minimum touch target used across the app. */
export const TOUCH = 48;
