import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { LineChart, BarChart } from '@/src/components/charts';
import { FadeInView, DashboardSkeleton, ErrorBanner } from '@/src/components/ui';
import { useAuthStore } from '@/src/stores/authStore';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { useSavingsStore } from '@/src/stores/savingsStore';
import { useBudgetStore } from '@/src/stores/budgetStore';
import { useInvestmentStore } from '@/src/stores/investmentStore';
import { formatCurrency } from '@/src/utils/currency';
import { getBatchQuotes, type StockQuote } from '@/src/lib/stock-api';
import { generateInsights, type FinancialSummary } from '@/src/lib/gemini';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';

interface SummaryCardProps {
  label: string;
  amount: number;
  accentColor: string;
  icon: string;
  delay: number;
  colors: any;
  fontSize: any;
  fontWeight: any;
  borderRadius: any;
  shadows: any;
  isDark: boolean;
  onPress?: () => void;
}

function SummaryCard({
  label,
  amount,
  accentColor,
  icon,
  delay,
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  isDark,
  onPress,
}: SummaryCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const Wrapper = onPress ? Pressable : View;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 180,
    }).start();
  };

  return (
    <FadeInView delay={delay} style={{ flex: 1 }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Wrapper
          {...(onPress ? { onPress, onPressIn: handlePressIn, onPressOut: handlePressOut } : {})}
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              ...(isDark
                ? { borderWidth: 1, borderColor: colors.border }
                : shadows.md),
            },
          ]}
        >
          <View style={styles.summaryCardHeader}>
            <View
              style={[
                styles.summaryIconContainer,
                { backgroundColor: accentColor + '12', borderRadius: borderRadius.md },
              ]}
            >
              <Ionicons name={icon as any} size={18} color={accentColor} />
            </View>
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
          <Text
            style={[
              styles.summaryLabel,
              { color: colors.textSecondary, fontSize: fontSize.xs },
            ]}
          >
            {label}
          </Text>
        </Wrapper>
      </Animated.View>
    </FadeInView>
  );
}

export default function DashboardScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, isDark, shadows } = useTheme();
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
  const expError = useExpenseStore((s) => s.error);
  const incError = useIncomeStore((s) => s.error);
  const dataError = expError || incError;

  // Fetch current stock/crypto quotes for investment valuation
  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  useEffect(() => {
    const tickers: string[] = [];
    for (const acct of investmentAccounts) {
      const h = investmentHoldings.get(acct.id) ?? [];
      for (const holding of h) {
        if (holding.ticker) tickers.push(holding.ticker);
      }
    }
    if (tickers.length === 0) return;
    getBatchQuotes(tickers).then(setQuotes).catch(() => {});
  }, [investmentAccounts, investmentHoldings]);

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
        const quote = quotes.get(holding.ticker?.toUpperCase());
        investTotal += quote ? holding.shares * quote.price : holding.costBasis;
      }
    }

    const nw = checking + savings + investTotal;

    return { monthlyExpenses: expMonthly, monthlyIncome: incMonthly, netWorth: nw, investmentTotal: investTotal, checkingBalance: checking, businessExpenses: bizExp, businessIncome: bizInc };
  }, [expenses, incomes, getTotalSavings, investmentAccounts, investmentHoldings, quotes]);

  const monthlySubscriptions = useMemo(() => getMonthlyTotal(), [getMonthlyTotal, subscriptions]);

  // Budget summary
  const { budgetTotal, budgetSpent } = useMemo(() => {
    const now = new Date();
    let total = 0;
    let spent = 0;
    for (const t of budgetTargets) {
      total += t.monthlyLimit;
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

  // --- AI Insights ---
  const [insights, setInsights] = useState<string[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const insightsFetched = useRef(false);

  const { prevMonthExpenses, prevMonthIncome, categoryBreakdown, prevCategoryBreakdown } = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();

    let prevExp = 0;
    let prevInc = 0;
    const curCats: Record<string, number> = {};
    const prevCats: Record<string, number> = {};

    for (const e of expenses) {
      const d = e.date.toDate();
      const y = d.getFullYear();
      const m = d.getMonth();
      if (y === curYear && m === curMonth) {
        const catName = EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.name ?? e.category;
        curCats[catName] = (curCats[catName] ?? 0) + e.amount;
      } else if (y === prevYear && m === prevMonth) {
        prevExp += e.amount;
        const catName = EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.name ?? e.category;
        prevCats[catName] = (prevCats[catName] ?? 0) + e.amount;
      }
    }
    for (const i of incomes) {
      const d = i.date.toDate();
      if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
        prevInc += i.amount;
      }
    }

    return { prevMonthExpenses: prevExp, prevMonthIncome: prevInc, categoryBreakdown: curCats, prevCategoryBreakdown: prevCats };
  }, [expenses, incomes]);

  const fetchInsights = useCallback(async () => {
    if (insightsLoading) return;
    setInsightsLoading(true);
    try {
      const summary: FinancialSummary = {
        monthlyExpenses,
        monthlyIncome,
        netWorth,
        checkingBalance,
        savingsTotal: getTotalSavings(),
        investmentTotal,
        monthlySubscriptions,
        budgetSpent,
        budgetTotal,
        categoryBreakdown,
        prevMonthExpenses,
        prevMonthIncome,
        prevCategoryBreakdown,
      };
      const result = await generateInsights(summary);
      if (result) setInsights(result);
    } catch {
      // silently fail
    } finally {
      setInsightsLoading(false);
    }
  }, [monthlyExpenses, monthlyIncome, netWorth, checkingBalance, investmentTotal, monthlySubscriptions, budgetSpent, budgetTotal, categoryBreakdown, prevMonthExpenses, prevMonthIncome, prevCategoryBreakdown, getTotalSavings, insightsLoading]);

  // Auto-fetch insights once when data is loaded
  useEffect(() => {
    if (!expLoading && !incLoading && !insightsFetched.current && expenses.length > 0) {
      insightsFetched.current = true;
      fetchInsights();
    }
  }, [expLoading, incLoading, expenses.length]);

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
  const [timeRange, setTimeRange] = useState<'3M' | '6M' | '1Y' | 'ALL'>('6M');
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const monthCount = useMemo(() => {
    if (timeRange === '3M') return 3;
    if (timeRange === '6M') return 6;
    if (timeRange === '1Y') return 12;
    const now = new Date();
    let earliest = now;
    for (const e of expenses) {
      const d = e.date.toDate();
      if (d < earliest) earliest = d;
    }
    for (const i of incomes) {
      const d = i.date.toDate();
      if (d < earliest) earliest = d;
    }
    const months = (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1;
    return Math.max(months, 2);
  }, [timeRange, expenses, incomes]);

  const { netWorthData, expenseBarData } = useMemo(() => {
    const now = new Date();
    const currentSavings = getTotalSavings();

    let investSnap = 0;
    for (const acct of investmentAccounts) {
      const h = investmentHoldings.get(acct.id) ?? [];
      for (const holding of h) {
        const quote = quotes.get(holding.ticker?.toUpperCase());
        investSnap += quote ? holding.shares * quote.price : holding.costBasis;
      }
    }

    const monthBuckets: { year: number; month: number; income: number; expense: number }[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.push({ year: d.getFullYear(), month: d.getMonth(), income: 0, expense: 0 });
    }

    let priorIncome = 0;
    let priorExpense = 0;
    const windowStart = monthBuckets[0];

    for (const e of expenses) {
      const d = e.date.toDate();
      const y = d.getFullYear();
      const m = d.getMonth();
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

    let cumulativeInc = priorIncome;
    let cumulativeExp = priorExpense;
    const showYear = monthCount > 12;

    const nwData = monthBuckets.map((b) => {
      cumulativeInc += b.income;
      cumulativeExp += b.expense;
      const checking = cumulativeInc - cumulativeExp;
      return {
        label: showYear ? `${MONTH_NAMES[b.month]} '${String(b.year).slice(2)}` : MONTH_NAMES[b.month],
        value: checking + currentSavings + investSnap,
      };
    });

    const barData = monthBuckets.map((b) => ({
      label: showYear ? `${MONTH_NAMES[b.month]} '${String(b.year).slice(2)}` : MONTH_NAMES[b.month],
      value: b.expense,
    }));

    return { netWorthData: nwData, expenseBarData: barData };
  }, [expenses, incomes, monthCount, getTotalSavings, investmentAccounts, investmentHoldings, quotes]);

  const TIME_RANGES: ('3M' | '6M' | '1Y' | 'ALL')[] = ['3M', '6M', '1Y', 'ALL'];

  // Budget progress animation
  const budgetProgressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (budgetTotal > 0) {
      Animated.spring(budgetProgressAnim, {
        toValue: Math.min(budgetSpent / budgetTotal, 1),
        useNativeDriver: false,
        damping: 20,
        stiffness: 100,
      }).start();
    }
  }, [budgetSpent, budgetTotal]);

  if (expLoading || incLoading) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  const budgetPercent = budgetTotal > 0 ? (budgetSpent / budgetTotal) * 100 : 0;
  const budgetColor = budgetPercent > 90 ? colors.danger : budgetPercent >= 75 ? colors.warning : colors.success;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      {dataError && (
        <ErrorBanner
          message={`Failed to load data: ${dataError}`}
          onRetry={() => {
            if (user?.uid) {
              subscribeToExpenses(user.uid);
              subscribeToIncome(user.uid);
            }
          }}
        />
      )}

      {/* Net Worth Hero Card */}
      <FadeInView delay={50}>
        <View
          style={[
            styles.netWorthCard,
            {
              backgroundColor: isDark ? colors.primary + '15' : colors.primary + '0A',
              borderRadius: borderRadius.xl,
              borderWidth: 1,
              borderColor: isDark ? colors.primary + '25' : colors.primary + '18',
            },
          ]}
        >
          {/* Decorative background circles */}
          <View style={[styles.heroCircle, styles.heroCircle1, { backgroundColor: colors.primary + '08' }]} />
          <View style={[styles.heroCircle, styles.heroCircle2, { backgroundColor: colors.primary + '06' }]} />

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
                fontWeight: fontWeight.heavy,
              },
            ]}
          >
            {formatCurrency(netWorth)}
          </Text>

          {/* Quick stat pills */}
          <View style={styles.quickStatRow}>
            <View style={[styles.quickStat, { backgroundColor: isDark ? colors.surface : '#fff', borderRadius: borderRadius.full }]}>
              <View style={[styles.quickStatDot, { backgroundColor: colors.income }]} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                +{formatCurrency(monthlyIncome)}
              </Text>
            </View>
            <View style={[styles.quickStat, { backgroundColor: isDark ? colors.surface : '#fff', borderRadius: borderRadius.full }]}>
              <View style={[styles.quickStatDot, { backgroundColor: colors.expense }]} />
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>
                -{formatCurrency(monthlyExpenses)}
              </Text>
            </View>
          </View>
        </View>
      </FadeInView>

      {/* AI Insights */}
      {(insights || insightsLoading) && (
        <FadeInView delay={100}>
          <View
            style={[
              styles.insightsCard,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
                ...(isDark
                  ? { borderWidth: 1, borderColor: colors.border }
                  : shadows.md),
              },
            ]}
          >
            <Pressable
              onPress={() => setShowInsights((v) => !v)}
              style={styles.insightsHeader}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.insightsIconBg, { backgroundColor: colors.primary + '12', borderRadius: borderRadius.sm }]}>
                  <Ionicons name="flash" size={14} color={colors.primary} />
                </View>
                <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                  AI Insights
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {!insightsLoading && (
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); insightsFetched.current = false; fetchInsights(); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="refresh" size={16} color={colors.textTertiary} />
                  </Pressable>
                )}
                <Ionicons
                  name={showInsights ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textTertiary}
                />
              </View>
            </Pressable>
            {showInsights && (
              <View style={{ marginTop: spacing.sm }}>
                {insightsLoading ? (
                  <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs }}>
                      Analyzing your finances...
                    </Text>
                  </View>
                ) : insights ? (
                  insights.map((insight, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: i < insights.length - 1 ? spacing.sm : 0, alignItems: 'flex-start' }}>
                      <View style={[styles.insightDot, { backgroundColor: colors.primary }]} />
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, flex: 1, lineHeight: 20 }}>
                        {insight}
                      </Text>
                    </View>
                  ))
                ) : null}
              </View>
            )}
          </View>
        </FadeInView>
      )}

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
                ...(isDark
                  ? { borderWidth: 1, borderColor: colors.border }
                  : shadows.md),
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
              <View style={[styles.timeRangeRow, { gap: 2, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.sm, padding: 2 }]}>
                {TIME_RANGES.map((range) => (
                  <Pressable
                    key={range}
                    onPress={() => setTimeRange(range)}
                    style={[
                      styles.timeRangeButton,
                      {
                        backgroundColor:
                          timeRange === range ? (isDark ? colors.surface : '#fff') : 'transparent',
                        borderRadius: borderRadius.sm - 2,
                        paddingHorizontal: spacing.sm,
                        paddingVertical: spacing.xs,
                        ...(timeRange === range && !isDark ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 } : {}),
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: timeRange === range ? colors.text : colors.textTertiary,
                        fontSize: fontSize.xs,
                        fontWeight:
                          timeRange === range ? fontWeight.semibold : fontWeight.medium,
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
                key={timeRange}
                data={netWorthData}
                height={timeRange === 'ALL' && netWorthData.length > 12 ? 180 : 140}
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
                ...(isDark
                  ? { borderWidth: 1, borderColor: colors.border }
                  : shadows.md),
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

      {/* Section header */}
      <FadeInView delay={190}>
        <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm, marginLeft: spacing.xs }}>
          Overview
        </Text>
      </FadeInView>

      {/* Summary Cards - 2x2 Grid */}
      <View style={[styles.gridRow, { gap: spacing.sm }]}>
        <SummaryCard
          label="Expenses"
          amount={monthlyExpenses}
          accentColor={colors.expense}
          icon="arrow-up-circle"
          delay={200}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
          shadows={shadows}
          isDark={isDark}
        />
        <SummaryCard
          label="Income"
          amount={monthlyIncome}
          accentColor={colors.income}
          icon="arrow-down-circle"
          delay={230}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
          shadows={shadows}
          isDark={isDark}
          onPress={() => router.push('/(tabs)/income' as any)}
        />
      </View>
      <View style={[styles.gridRow, { gap: spacing.sm }]}>
        <SummaryCard
          label="Investments"
          amount={investmentTotal}
          accentColor={colors.investment}
          icon="bar-chart"
          delay={260}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
          shadows={shadows}
          isDark={isDark}
          onPress={() => router.push('/(tabs)/investments' as any)}
        />
        <SummaryCard
          label="Savings"
          amount={getTotalSavings()}
          accentColor={colors.savings}
          icon="shield-checkmark"
          delay={290}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
          shadows={shadows}
          isDark={isDark}
          onPress={() => router.push('/savings/' as any)}
        />
      </View>

      {/* Checking Balance */}
      <FadeInView delay={310}>
        <Pressable
          style={[
            styles.infoRow,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginBottom: spacing.sm,
              ...(isDark
                ? { borderWidth: 1, borderColor: colors.border }
                : shadows.sm),
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary + '12', borderRadius: borderRadius.md }]}>
              <Ionicons name="wallet" size={18} color={colors.primary} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
              Checking
            </Text>
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
            {formatCurrency(checkingBalance)}
          </Text>
        </Pressable>
      </FadeInView>

      {/* Subscriptions Card */}
      <FadeInView delay={340}>
        <Pressable
          onPress={() => router.push('/(tabs)/subscriptions' as any)}
          style={({ pressed }) => [
            styles.infoRow,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginBottom: spacing.sm,
              opacity: pressed ? 0.8 : 1,
              ...(isDark
                ? { borderWidth: 1, borderColor: colors.border }
                : shadows.sm),
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={[styles.summaryIconContainer, { backgroundColor: colors.subscription + '12', borderRadius: borderRadius.md }]}>
              <Ionicons name="repeat" size={18} color={colors.subscription} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
              Subscriptions
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
              {formatCurrency(monthlySubscriptions)}
              <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, fontWeight: fontWeight.normal }}>/mo</Text>
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </View>
        </Pressable>
      </FadeInView>

      {/* Budget Card */}
      {budgetTargets.length > 0 && (
        <FadeInView delay={360}>
          <Pressable
            onPress={() => router.push('/budget/' as any)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.sm,
                opacity: pressed ? 0.8 : 1,
                ...(isDark
                  ? { borderWidth: 1, borderColor: colors.border }
                  : shadows.sm),
              },
            ]}
          >
            <View style={[styles.infoRow, { marginBottom: spacing.sm }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={[styles.summaryIconContainer, { backgroundColor: colors.warning + '12', borderRadius: borderRadius.md }]}>
                  <Ionicons name="pie-chart" size={18} color={colors.warning} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
                  Budget
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
                  {formatCurrency(budgetSpent)}
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, fontWeight: fontWeight.normal }}> / {formatCurrency(budgetTotal)}</Text>
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            </View>
            <View
              style={[
                styles.budgetProgressBg,
                {
                  backgroundColor: colors.border,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              <Animated.View
                style={{
                  height: '100%',
                  width: budgetProgressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: budgetColor,
                  borderRadius: borderRadius.full,
                }}
              />
            </View>
          </Pressable>
        </FadeInView>
      )}

      {/* Business Summary */}
      {(totalBusinessExpenses > 0 || businessIncome > 0) && (
        <FadeInView delay={380}>
          <Pressable
            onPress={() => router.push('/(tabs)/expenses' as any)}
            style={({ pressed }) => [
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.md,
                opacity: pressed ? 0.8 : 1,
                ...(isDark
                  ? { borderWidth: 1, borderColor: colors.border }
                  : shadows.sm),
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.primary + '12', borderRadius: borderRadius.md }]}>
                <Ionicons name="briefcase" size={18} color={colors.primary} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }}>
                Business This Month
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
            </View>
            <View style={styles.businessRow}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.income, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{formatCurrency(businessIncome)}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Income</Text>
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: fontSize.lg }}>-</Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.expense, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>{formatCurrency(totalBusinessExpenses)}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Expenses</Text>
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: fontSize.lg }}>=</Text>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: businessIncome - totalBusinessExpenses >= 0 ? colors.income : colors.expense, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
                  {formatCurrency(businessIncome - totalBusinessExpenses)}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Net</Text>
              </View>
            </View>
          </Pressable>
        </FadeInView>
      )}

      {/* Ask AI button */}
      <FadeInView delay={400}>
        <Pressable
          onPress={() => router.push('/chat/' as any)}
          style={({ pressed }) => [
            styles.askAiButton,
            {
              backgroundColor: pressed ? colors.primaryDark : colors.primary,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginBottom: spacing.md,
              ...(isDark ? {} : shadows.colored(colors.primary)),
            },
          ]}
        >
          <View style={styles.askAiIconBg}>
            <Ionicons name="chatbubbles" size={18} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.sm }}>
            Ask AI about your finances
          </Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
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
    paddingVertical: 28,
    paddingHorizontal: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  heroCircle1: {
    width: 200,
    height: 200,
    top: -60,
    right: -40,
  },
  heroCircle2: {
    width: 150,
    height: 150,
    bottom: -40,
    left: -30,
  },
  netWorthLabel: {
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  netWorthValue: {
    fontSize: 38,
    letterSpacing: -0.5,
  },
  quickStatRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  quickStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryCard: {
    padding: 16,
    overflow: 'hidden',
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    marginTop: 4,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryValue: {
    letterSpacing: -0.3,
  },
  insightsCard: {},
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightsIconBg: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetProgressBg: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  askAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  askAiIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
