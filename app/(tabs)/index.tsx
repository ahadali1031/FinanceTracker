import React, { useEffect, useRef, useMemo, useState } from 'react';
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
import { LineChart, BarChart } from '@/src/components/charts';
import { useAuthStore } from '@/src/stores/authStore';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { useSavingsStore } from '@/src/stores/savingsStore';
import { useBudgetStore } from '@/src/stores/budgetStore';
import { useInvestmentStore } from '@/src/stores/investmentStore';
import { DashboardSkeleton } from '@/src/components/ui';
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
  const { accounts: investmentAccounts, holdings: investmentHoldings, subscribeToAccounts: subscribeToInvestments } = useInvestmentStore();
  const { targets: budgetTargets, subscribeToTargets: subscribeToBudgets } = useBudgetStore();

  const expLoading = useExpenseStore((s) => s.loading);
  const incLoading = useIncomeStore((s) => s.loading);

  // Subscribe to all data
  useEffect(() => {
    if (!user?.uid) return;
    const unsubs = [
      subscribeToExpenses(user.uid),
      subscribeToIncome(user.uid),
      subscribeToSubscriptions(user.uid),
      subscribeToSavings(user.uid),
      subscribeToInvestments(user.uid),
      subscribeToBudgets(user.uid),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user?.uid]);

  // Compute current month totals, checking balance, and net worth
  // Checking = all-time income - all-time expenses (transfers are already expenses)
  // Net Worth = checking + savings + investments
  const { monthlyExpenses, monthlyIncome, netWorth, investmentTotal, checkingBalance, businessExpenses, businessIncome } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let expMonthly = 0;
    let bizExp = 0;
    let expAllTime = 0;
    for (const e of expenses) {
      expAllTime += e.amount;
      const d = e.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        expMonthly += e.amount;
        if (e.isBusiness) bizExp += e.amount;
      }
    }

    let incMonthly = 0;
    let bizInc = 0;
    let incAllTime = 0;
    for (const i of incomes) {
      incAllTime += i.amount;
      const d = i.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        incMonthly += i.amount;
        if (i.isBusiness) bizInc += i.amount;
      }
    }

    const checking = incAllTime - expAllTime;
    const savings = getTotalSavings();

    let investTotal = 0;
    for (const acct of investmentAccounts) {
      const h = investmentHoldings.get(acct.id) ?? [];
      for (const holding of h) {
        investTotal += holding.costBasis;
      }
    }

    const nw = checking + savings + investTotal;

    return { monthlyExpenses: expMonthly, monthlyIncome: incMonthly, netWorth: nw, investmentTotal: investTotal, checkingBalance: checking, businessExpenses: bizExp, businessIncome: bizInc };
  }, [expenses, incomes, getTotalSavings, investmentAccounts, investmentHoldings]);

  const monthlySubscriptions = useMemo(() => getMonthlyTotal(), [subscriptions]);

  // Budget summary
  const { budgetTotal, budgetSpent } = useMemo(() => {
    const now = new Date();
    let total = 0;
    let spent = 0;
    for (const t of budgetTargets) {
      total += t.monthlyLimit;
      // Compute spent for this category this month
      for (const e of expenses) {
        if (e.category !== t.category) continue;
        const d = e.date.toDate();
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          spent += e.amount;
        }
      }
    }
    return { budgetTotal: total, budgetSpent: spent };
  }, [budgetTargets, expenses]);

  // Add business subscriptions to business expense total
  const businessSubscriptions = useMemo(() => {
    let total = 0;
    for (const sub of subscriptions) {
      if (sub.isBusiness && sub.isActive) {
        total += sub.frequency === 'monthly' ? sub.amount : sub.amount / 12;
      }
    }
    return total;
  }, [subscriptions]);
  const totalBusinessExpenses = businessExpenses + businessSubscriptions;

  // --- Chart data: time range selector ---
  const [timeRange, setTimeRange] = useState<'3M' | '6M' | '1Y'>('6M');
  const monthCount = timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12;

  // Short month names
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Compute last N months of cumulative net worth and monthly expense totals
  const { netWorthData, expenseBarData } = useMemo(() => {
    const now = new Date();
    const currentSavings = getTotalSavings();

    // Compute investment total (current snapshot)
    let investSnap = 0;
    for (const acct of investmentAccounts) {
      const h = investmentHoldings.get(acct.id) ?? [];
      for (const holding of h) {
        investSnap += holding.costBasis;
      }
    }

    // Build per-month income and expense totals
    const monthBuckets: { year: number; month: number; income: number; expense: number }[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.push({ year: d.getFullYear(), month: d.getMonth(), income: 0, expense: 0 });
    }

    // Collect all-time totals for everything before our window
    let priorIncome = 0;
    let priorExpense = 0;
    const windowStart = monthBuckets[0];

    for (const e of expenses) {
      const d = e.date.toDate();
      const y = d.getFullYear();
      const m = d.getMonth();
      // Check if before window
      if (y < windowStart.year || (y === windowStart.year && m < windowStart.month)) {
        priorExpense += e.amount;
      } else {
        const bucket = monthBuckets.find((b) => b.year === y && b.month === m);
        if (bucket) bucket.expense += e.amount;
      }
    }
    for (const inc of incomes) {
      const d = inc.date.toDate();
      const y = d.getFullYear();
      const m = d.getMonth();
      if (y < windowStart.year || (y === windowStart.year && m < windowStart.month)) {
        priorIncome += inc.amount;
      } else {
        const bucket = monthBuckets.find((b) => b.year === y && b.month === m);
        if (bucket) bucket.income += inc.amount;
      }
    }

    // Build cumulative net worth per month end
    // Net worth = cumulative checking (income - expenses) + savings + investments
    let cumulativeInc = priorIncome;
    let cumulativeExp = priorExpense;

    const nwData = monthBuckets.map((b) => {
      cumulativeInc += b.income;
      cumulativeExp += b.expense;
      const checking = cumulativeInc - cumulativeExp;
      return {
        label: MONTH_NAMES[b.month],
        value: checking + currentSavings + investSnap,
      };
    });

    const barData = monthBuckets.map((b) => ({
      label: MONTH_NAMES[b.month],
      value: b.expense,
    }));

    return { netWorthData: nwData, expenseBarData: barData };
  }, [expenses, incomes, monthCount, getTotalSavings, investmentAccounts, investmentHoldings]);

  const TIME_RANGES: ('3M' | '6M' | '1Y')[] = ['3M', '6M', '1Y'];

  if (expLoading || incLoading) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

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

      {/* Net Worth Trend Chart */}
      {netWorthData.length >= 2 && (
        <FadeInView delay={150}>
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
          >
            <View style={styles.chartHeader}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                }}
              >
                Net Worth Trend
              </Text>
              <View style={[styles.timeRangeRow, { gap: spacing.xs }]}>
                {TIME_RANGES.map((range) => (
                  <Pressable
                    key={range}
                    onPress={() => setTimeRange(range)}
                    style={[
                      styles.timeRangeButton,
                      {
                        backgroundColor:
                          timeRange === range ? colors.primary + '18' : 'transparent',
                        borderRadius: borderRadius.sm,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: timeRange === range ? colors.primary : colors.textTertiary,
                        fontSize: fontSize.xs,
                        fontWeight:
                          timeRange === range ? fontWeight.semibold : fontWeight.normal,
                      }}
                    >
                      {range}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={{ marginTop: spacing.sm }}>
              <LineChart
                data={netWorthData}
                height={140}
                lineColor={colors.primary}
                fillColor={colors.primary}
                showDots
              />
            </View>
          </View>
        </FadeInView>
      )}

      {/* Monthly Expenses Bar Chart */}
      {expenseBarData.some((d) => d.value > 0) && (
        <FadeInView delay={175}>
          <View
            style={[
              styles.chartCard,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.md,
                fontWeight: fontWeight.semibold,
                marginBottom: spacing.sm,
              }}
            >
              Monthly Expenses
            </Text>
            <BarChart
              data={expenseBarData}
              height={140}
              barColor={colors.expense}
            />
          </View>
        </FadeInView>
      )}

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
          amount={investmentTotal}
          accentColor={colors.investment}
          delay={300}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
          onPress={() => router.push('/(tabs)/investments' as any)}
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
          onPress={() => router.push('/savings/' as any)}
        />
      </View>

      {/* Checking Balance */}
      <View style={{ marginBottom: 12 }}>
        <SummaryCard
          label="Checking Balance"
          amount={checkingBalance}
          accentColor={colors.primary}
          delay={375}
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

      {/* Budget Card — only show if there are budget targets */}
      {budgetTargets.length > 0 && (
        <FadeInView delay={420}>
          <Pressable
            onPress={() => router.push('/budget/' as any)}
            style={[
              styles.budgetCard,
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
                  backgroundColor: colors.warning,
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
                  Budget This Month
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </View>
              <View style={styles.budgetAmounts}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: fontSize.lg,
                    fontWeight: fontWeight.bold,
                  }}
                >
                  {formatCurrency(budgetSpent)} / {formatCurrency(budgetTotal)}
                </Text>
              </View>
              <View
                style={[
                  styles.budgetProgressBg,
                  {
                    backgroundColor: colors.border,
                    borderRadius: borderRadius.sm,
                    marginTop: 8,
                  },
                ]}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${budgetTotal > 0 ? Math.min((budgetSpent / budgetTotal) * 100, 100) : 0}%` as any,
                    backgroundColor:
                      budgetTotal > 0 && (budgetSpent / budgetTotal) * 100 > 90
                        ? colors.danger
                        : budgetTotal > 0 && (budgetSpent / budgetTotal) * 100 >= 75
                          ? colors.warning
                          : colors.success,
                    borderRadius: borderRadius.sm,
                  }}
                />
              </View>
            </View>
          </Pressable>
        </FadeInView>
      )}

      {/* Business Summary — only show if there are business transactions */}
      {(totalBusinessExpenses > 0 || businessIncome > 0) && (
        <FadeInView delay={450}>
          <Pressable
            onPress={() => router.push('/(tabs)/expenses' as any)}
            style={[
              styles.businessCard,
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
                  backgroundColor: colors.primary,
                  borderRadius: borderRadius.sm,
                },
              ]}
            />
            <View style={styles.summaryCardContent}>
              <View style={styles.summaryLabelRow}>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
                  Business This Month
                </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
              </View>
              <View style={styles.businessRow}>
                <View>
                  <Text style={{ color: colors.income, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{formatCurrency(businessIncome)}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Income</Text>
                </View>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.lg }}>−</Text>
                <View>
                  <Text style={{ color: colors.expense, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{formatCurrency(totalBusinessExpenses)}</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Expenses</Text>
                </View>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.lg }}>=</Text>
                <View>
                  <Text style={{ color: businessIncome - totalBusinessExpenses >= 0 ? colors.income : colors.expense, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
                    {formatCurrency(businessIncome - totalBusinessExpenses)}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Net</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </FadeInView>
      )}

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
    marginBottom: 12,
    overflow: 'hidden',
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  budgetAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  budgetProgressBg: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  chartCard: {},
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRangeButton: {},
});
