export const theme = {
  colors: {
    // Green-based primary (inspired by Mint, Robinhood, cash apps)
    primary: '#00B67A',          // Rich green — main brand
    primaryLight: '#34D399',     // Lighter green for dark mode
    primaryMuted: '#E6F9F1',     // Very light green bg tint (light mode)
    primaryMutedDark: '#0A2E1F', // Very dark green bg tint (dark mode)
    secondary: '#6366F1',        // Indigo accent for contrast

    background: { light: '#F5F7F6', dark: '#0A0F0D' },
    surface: { light: '#FFFFFF', dark: '#141E1A' },
    surfaceElevated: { light: '#FFFFFF', dark: '#1A2A24' },
    text: { light: '#111827', dark: '#F0F4F2' },
    textSecondary: { light: '#6B7280', dark: '#9CA3AF' },
    textTertiary: { light: '#9CA3AF', dark: '#5C6560' },
    border: { light: '#E2E8E5', dark: '#1E2E28' },

    // Semantic colors
    expense: '#EF4444',          // Red
    income: '#00B67A',           // Same as primary (green = money in)
    investment: '#3B82F6',       // Blue
    subscription: '#F59E0B',     // Amber
    savings: '#06B6D4',          // Cyan
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#00B67A',

    // Category accent palette
    categoryColors: [
      '#EF4444', '#F59E0B', '#06B6D4', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#64748B',
    ],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  fontSize: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 28,
    hero: 36,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export default {
  light: {
    text: theme.colors.text.light,
    background: theme.colors.background.light,
    tint: theme.colors.primary,
    tabIconDefault: theme.colors.textTertiary.light,
    tabIconSelected: theme.colors.primary,
  },
  dark: {
    text: theme.colors.text.dark,
    background: theme.colors.background.dark,
    tint: theme.colors.primaryLight,
    tabIconDefault: theme.colors.textTertiary.dark,
    tabIconSelected: theme.colors.primaryLight,
  },
};
