export const theme = {
  colors: {
    // Emerald Premium palette
    primary: '#10B981',              // Emerald-500 — cool, premium green
    primaryLight: '#34D399',         // Emerald-400 — dark mode primary
    primaryMuted: '#ECFDF5',         // Emerald-50 — light tint bg
    primaryMutedDark: '#052E1C',     // Deep forest — dark tint bg
    secondary: '#6366F1',            // Indigo accent for contrast

    background: { light: '#F9FAFB', dark: '#030712' },       // Gray-50 / Gray-950
    surface: { light: '#FFFFFF', dark: '#111827' },           // White / Gray-900
    surfaceElevated: { light: '#F3F4F6', dark: '#1F2937' },   // Gray-100 / Gray-800
    text: { light: '#111827', dark: '#F9FAFB' },              // Gray-900 / Gray-50
    textSecondary: { light: '#6B7280', dark: '#9CA3AF' },     // Gray-500 / Gray-400
    textTertiary: { light: '#9CA3AF', dark: '#4B5563' },      // Gray-400 / Gray-600
    border: { light: '#E5E7EB', dark: '#1F2937' },            // Gray-200 / Gray-800

    // Semantic colors
    expense: '#F43F5E',              // Rose-500 — warmer, modern red
    income: '#10B981',               // Emerald-500 — same as primary
    investment: '#3B82F6',           // Blue-500
    subscription: '#F59E0B',         // Amber-500
    savings: '#06B6D4',              // Cyan-500
    danger: '#F43F5E',               // Rose-500
    warning: '#F59E0B',              // Amber-500
    success: '#10B981',              // Emerald-500

    // Category accent palette
    categoryColors: [
      '#F43F5E', '#F59E0B', '#06B6D4', '#8B5CF6',
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
