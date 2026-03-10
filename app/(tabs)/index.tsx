import React, { useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { useSavingsStore } from '@/src/stores/savingsStore';
import { formatCurrency } from '@/src/utils/currency';

function FadeInView({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

interface SummaryCardProps {
  label: string;
  amount: number;
  accentColor: string;
  delay: number;
  colors: any;
  fontSize: any;
  fontWeight: any;
  borderRadius: any;
  onPress?: () => void;
}

function SummaryCard({
  label,
  amount,
  accentColor,
  delay,
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  onPress,
}: SummaryCardProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <FadeInView delay={delay} style={{ flex: 1 }}>
      <Wrapper
        {...(onPress ? { onPress } : {})}
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
          },
        ]}
      >
        <View
          style={[
            styles.accentBar,
            {
              backgroundColor: accentColor,
              borderRadius: borderRadius.sm,
            },
          ]}
        />
        <View style={styles.summaryCardContent}>
          <View style={onPress ? styles.summaryLabelRow : undefined}>
            <Text
              style={[
                styles.summaryLabel,
                { color: colors.textSecondary, fontSize: fontSize.xs },
              ]}
            >
              {label}
            </Text>
            {onPress && <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />}
          </View>
          <Text
            style={[
              styles.summaryValue,
              {
                color: colors.text,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
              },
            ]}
          >
            {formatCurrency(amount)}
          </Text>
        </View>
      </Wrapper>
    </FadeInView>
  );
}

export default function DashboardScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { expenses, subscribeToExpenses } = useExpenseStore();
  const { incomes, subscribeToIncome } = useIncomeStore();
  const { subscriptions, subscribeToSubscriptions, getMonthlyTotal } = useSubscriptionStore();
  const { subscribeToAccounts: subscribeToSavings, getTotalSavings } = useSavingsStore();

  // Subscribe to all data
  useEffect(() => {
    if (!user?.uid) return;
    const unsubs = [
      subscribeToExpenses(user.uid),
      subscribeToIncome(user.uid),
      subscribeToSubscriptions(user.uid),
      subscribeToSavings(user.uid),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user?.uid]);

  // Compute current month totals and net worth
  const { monthlyExpenses, monthlyIncome, netWorth } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const year = now.getFullYear();
    const month = now.getMonth();

    let expMonthly = 0;
    let expTotal = 0;
    for (const e of expenses) {
      const d = e.date.toDate();
      if (d <= today) {
        expTotal += e.amount;
        if (d.getFullYear() === year && d.getMonth() === month) {
          expMonthly += e.amount;
        }
      }
    }

    let incMonthly = 0;
    let incTotal = 0;
    for (const i of incomes) {
      const d = i.date.toDate();
      if (d <= today) {
        incTotal += i.amount;
        if (d.getFullYear() === year && d.getMonth() === month) {
          incMonthly += i.amount;
        }
      }
    }

    const savings = getTotalSavings();
    const nw = savings + incTotal - expTotal;

    return { monthlyExpenses: expMonthly, monthlyIncome: incMonthly, netWorth: nw };
  }, [expenses, incomes, getTotalSavings]);

  const monthlySubscriptions = useMemo(() => getMonthlyTotal(), [subscriptions]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Net Worth Hero Card */}
      <FadeInView delay={100}>
        <View
          style={[
            styles.netWorthCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.xl,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.netWorthLabel,
              { color: colors.textSecondary, fontSize: fontSize.sm },
            ]}
          >
            Net Worth
          </Text>
          <Text
            style={[
              styles.netWorthValue,
              {
                color: colors.text,
                fontWeight: fontWeight.bold,
              },
            ]}
          >
            {formatCurrency(netWorth)}
          </Text>
        </View>
      </FadeInView>

      {/* Summary Cards - 2x2 Grid */}
      <View style={[styles.gridRow, { gap: spacing.sm }]}>
        <SummaryCard
          label="Monthly Expenses"
          amount={monthlyExpenses}
          accentColor={colors.expense}
          delay={200}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
        />
        <SummaryCard
          label="Monthly Income"
          amount={monthlyIncome}
          accentColor={colors.income}
          delay={250}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
          onPress={() => router.push('/(tabs)/income' as any)}
        />
      </View>
      <View style={[styles.gridRow, { gap: spacing.sm }]}>
        <SummaryCard
          label="Investments"
          amount={0}
          accentColor={colors.investment}
          delay={300}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
        />
        <SummaryCard
          label="Savings"
          amount={getTotalSavings()}
          accentColor={colors.savings}
          delay={350}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
        />
      </View>

      {/* Subscriptions Card — tappable to manage */}
      <FadeInView delay={400}>
        <Pressable
          onPress={() => router.push('/(tabs)/subscriptions' as any)}
          style={[
            styles.subscriptionCard,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <View
            style={[
              styles.accentBar,
              {
                backgroundColor: colors.subscription,
                borderRadius: borderRadius.sm,
              },
            ]}
          />
          <View style={styles.summaryCardContent}>
            <View style={styles.summaryLabelRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: colors.textSecondary, fontSize: fontSize.xs },
                ]}
              >
                Monthly Subscriptions
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </View>
            <Text
              style={[
                styles.summaryValue,
                {
                  color: colors.text,
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.bold,
                },
              ]}
            >
              {formatCurrency(monthlySubscriptions)}
            </Text>
          </View>
        </Pressable>
      </FadeInView>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  netWorthCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  netWorthLabel: {
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  netWorthValue: {
    fontSize: 36,
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    height: '70%',
    marginRight: 12,
  },
  summaryCardContent: {
    flex: 1,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    marginBottom: 4,
  },
  summaryValue: {
    letterSpacing: 0.3,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
});
