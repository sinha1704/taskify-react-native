export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  onPrimary: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  card: string;
}

export const lightColors: ThemeColors = {
  background: '#F8F9FA',
  surface: '#FFFFFF',
  primary: '#6200EE',
  onPrimary: '#FFFFFF',
  text: '#1C1B1F',
  textSecondary: '#49454F',
  border: '#CAC4D0',
  error: '#B00020',
  success: '#388E3C',
  card: '#F3EDF7',
};

export const darkColors: ThemeColors = {
  background: '#121212',
  surface: '#1E1E1E',
  primary: '#D0BCFF',
  onPrimary: '#381E72',
  text: '#E6E1E5',
  textSecondary: '#CAC4D0',
  border: '#49454F',
  error: '#F2B8B5',
  success: '#81C784',
  card: '#2B2930',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const theme = {
  light: {
    colors: lightColors,
    spacing,
    typography,
  },
  dark: {
    colors: darkColors,
    spacing,
    typography,
  },
};

export type AppTheme = typeof theme.light;
