import { useColorScheme } from '@/components/useColorScheme';
import { theme } from './Colors';

export function useTheme() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  return {
    isDark,
    colors: {
      primary: isDark ? theme.colors.primaryLight : theme.colors.primary,
      primaryDark: theme.colors.primaryDark,
      background: isDark ? theme.colors.background.dark : theme.colors.background.light,
      surface: isDark ? theme.colors.surface.dark : theme.colors.surface.light,
      surfaceElevated: isDark ? theme.colors.surfaceElevated.dark : theme.colors.surfaceElevated.light,
      text: isDark ? theme.colors.text.dark : theme.colors.text.light,
      textSecondary: isDark ? theme.colors.textSecondary.dark : theme.colors.textSecondary.light,
      textTertiary: isDark ? theme.colors.textTertiary.dark : theme.colors.textTertiary.light,
      border: isDark ? theme.colors.border.dark : theme.colors.border.light,
      primaryMuted: isDark ? theme.colors.primaryMutedDark : theme.colors.primaryMuted,
      expense: theme.colors.expense,
      income: theme.colors.income,
      investment: theme.colors.investment,
      subscription: theme.colors.subscription,
      savings: theme.colors.savings,
      danger: theme.colors.danger,
      warning: theme.colors.warning,
      success: theme.colors.success,
    },
    shadows: {
      sm: isDark ? {} : theme.shadows.sm,
      md: isDark ? {} : theme.shadows.md,
      lg: isDark ? {} : theme.shadows.lg,
      xl: isDark ? {} : theme.shadows.xl,
      colored: (color: string) => isDark ? {} : theme.shadows.colored(color),
    },
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
  };
}
