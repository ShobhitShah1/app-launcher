import { Platform } from 'react-native';

export const MatteBlackTheme = {
  background: '#000000',
  surface: '#0A0A0A',
  card: '#121212',
  cardHover: '#1A1A1A',
  cardSecondary: '#1E1E1E',
  border: '#262626',
  borderLight: '#383838',
  text: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textMuted: '#737373',
  accent: '#FFFFFF',
  accentDark: '#E5E5E5',
  accentGlow: 'rgba(255, 255, 255, 0.12)',
  surfaceHighlight: '#222222',
  success: '#E5E5E5',
  danger: '#A3A3A3',
  warning: '#D4D4D4',
} as const;

export const Colors = {
  light: {
    text: MatteBlackTheme.text,
    background: MatteBlackTheme.background,
    backgroundElement: MatteBlackTheme.card,
    backgroundSelected: MatteBlackTheme.cardSecondary,
    textSecondary: MatteBlackTheme.textSecondary,
  },
  dark: {
    text: MatteBlackTheme.text,
    background: MatteBlackTheme.background,
    backgroundElement: MatteBlackTheme.card,
    backgroundSelected: MatteBlackTheme.cardSecondary,
    textSecondary: MatteBlackTheme.textSecondary,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 70, android: 84 }) ?? 84;
export const MaxContentWidth = 800;
