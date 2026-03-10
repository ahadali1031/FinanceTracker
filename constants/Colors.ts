export const theme = {
  colors: {
    // Emerald Premium palette
    primary: '#10B981',              // Emerald-500 — cool, premium green
    primaryLight: '#34D399',         // Emerald-400 — dark mode primary
    primaryDark: '#059669',          // Emerald-600 — deeper green
    primaryMuted: '#ECFDF5',         // Emerald-50 — light tint bg
    primaryMutedDark: '#052E1C',     // Deep forest — dark tint bg
    secondary: '#6366F1',            // Indigo accent for contrast

    background: { light: '#F8FAFC', dark: '#030712' },       // Slate-50 / Gray-950
    surface: { light: '#FFFFFF', dark: '#111827' },           // White / Gray-900
    surfaceElevated: { light: '#F1F5F9', dark: '#1F2937' },   // Slate-100 / Gray-800
    text: { light: '#0F172A', dark: '#F8FAFC' },              // Slate-900 / Slate-50
    textSecondary: { light: '#64748B', dark: '#94A3B8' },     // Slate-500 / Slate-400
    textTertiary: { light: '#94A3B8', dark: '#475569' },      // Slate-400 / Slate-600
    border: { light: '#E2E8F0', dark: '#1E293B' },            // Slate-200 / Slate-800

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
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    } as const,
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    } as const,
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 6,
    } as const,
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 10,
    } as const,
    colored: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    }),
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
    xxl: 32,
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
