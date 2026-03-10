import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/useTheme';
import { Card, EmptyState, CardSkeleton, ListItemSkeleton } from '@/src/components/ui';
import { DonutChart } from '@/src/components/charts';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate, formatMonthYear } from '@/src/utils/date';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import { Ionicons } from '@expo/vector-icons';
import type { Expense, Income } from '@/src/types';

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
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 350,
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

const categoryMap = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c]));

const CATEGORY_ACCENT_COLORS: Record<string, string> = {
  food: '#FF6B6B',
  transport: '#4ECDC4',
  entertainment: '#45B7D1',
  shopping: '#96CEB4',
  bills: '#FFEAA7',
  health: '#DDA0DD',
  education: '#98D8C8',
  travel: '#F7DC6F',
  other: '#BB8FCE',
  transfer: '#6C5CE7',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Transaction =
  | { type: 'expense'; data: Expense; dateMs: number }
  | { type: 'income'; data: Income; dateMs: number };

type FlatItem =
  | { kind: 'header'; dateLabel: string; key: string }
  | { kind: 'transaction'; transaction: Transaction; key: string; index: number };

function AnimatedTransactionRow({
  transaction,
  index,
  onPress,
  onDelete,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
}: {
  transaction: Transaction;
  index: number;
  onPress?: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
  fontSize: ReturnType<typeof useTheme>['fontSize'];
  fontWeight: ReturnType<typeof useTheme>['fontWeight'];
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 50, 400),
      useNativeDriver: true,
    }).start();
  }, []);

  if (transaction.type === 'expense') {
    const expense = transaction.data;
    const cat = categoryMap.get(expense.category);
    const accentColor = CATEGORY_ACCENT_COLORS[expense.category] ?? colors.primary;

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
        <Card style={[styles.row, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}>
          <View style={[styles.accentBar, { backgroundColor: accentColor, borderTopLeftRadius: borderRadius.md, borderBottomLeftRadius: borderRadius.md }]} />
          <View style={[styles.rowContent, { paddingVertical: spacing.md, paddingRight: spacing.md, paddingLeft: spacing.md }]}>
            <Pressable style={styles.rowLeft} onPress={onPress}>
              <Ionicons name={(cat?.icon ?? 'ellipsis-horizontal') as any} size={24} color={accentColor} style={styles.rowIcon} />
              <View style={styles.rowText}>
                <View style={styles.titleRow}>
                  <Text style={[styles.rowTitle, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }]} numberOfLines={1}>
                    {expense.description || cat?.name || 'Expense'}
                  </Text>
                  {expense.isBusiness && (
                    <View style={[styles.badge, { backgroundColor: colors.primary + '18', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                      <Text style={[styles.badgeText, { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>Business</Text>
                    </View>
                  )}
                  {expense.isRecurring && (
                    <View style={[styles.badge, { backgroundColor: colors.subscription + '18', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                      <Text style={[styles.badgeText, { color: colors.subscription, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>Recurring</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
                  {cat?.name ?? expense.category}
                </Text>
              </View>
            </Pressable>
            <View style={styles.rowRight}>
              <Text style={[styles.rowAmount, { color: colors.expense, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
                -{formatCurrency(expense.amount)}
              </Text>
              <Pressable
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: pressed ? colors.border : 'transparent', borderRadius: borderRadius.sm }]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  }

  // Income row
  const income = transaction.data;
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Card style={[styles.row, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        <View style={[styles.accentBar, { backgroundColor: colors.income, borderTopLeftRadius: borderRadius.md, borderBottomLeftRadius: borderRadius.md }]} />
        <View style={[styles.rowContent, { paddingVertical: spacing.md, paddingRight: spacing.md, paddingLeft: spacing.md }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="cash" size={24} color={colors.income} style={styles.rowIcon} />
            <View style={styles.rowText}>
              <View style={styles.titleRow}>
                <Text style={[styles.rowTitle, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }]} numberOfLines={1}>
                  {income.source}
                </Text>
                {income.isBusiness && (
                  <View style={[styles.badge, { backgroundColor: colors.primary + '18', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                    <Text style={[styles.badgeText, { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>Business</Text>
                  </View>
                )}
                {income.isRecurring && (
                  <View style={[styles.badge, { backgroundColor: colors.income + '18', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                    <Text style={[styles.badgeText, { color: colors.income, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
                      Recurring
                    </Text>
                  </View>
                )}
              </View>
              {!!income.description && (
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary, fontSize: fontSize.sm }]} numberOfLines={1}>
                  {income.description}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.rowAmount, { color: colors.income, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
              +{formatCurrency(income.amount)}
            </Text>
            <Pressable
              onPress={onDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => [styles.deleteButton, { backgroundColor: pressed ? colors.border : 'transparent', borderRadius: borderRadius.sm }]}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

function GroupedBarChart({
  data,
  height = 160,
  personalColor,
  businessColor,
}: {
  data: { label: string; personal: number; business: number }[];
  height?: number;
  personalColor: string;
  businessColor: string;
}) {
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  const animProgress = useRef(new Animated.Value(0)).current;
  const maxValue = Math.max(...data.map((d) => Math.max(d.personal, d.business)), 1);

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs }}>
      {data.map((item, i) => {
        const pRatio = item.personal / maxValue;
        const bRatio = item.business / maxValue;
        const pHeight = animProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, pRatio * height * 0.85],
        });
        const bHeight = animProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, bRatio * height * 0.85],
        });

        return (
          <View key={`${item.label}-${i}`} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', width: '90%', gap: 2 }}>
              {/* Personal bar */}
              <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'stretch' }}>
                <Animated.View
                  style={{
                    height: pHeight,
                    backgroundColor: personalColor,
                    borderTopLeftRadius: borderRadius.sm,
                    borderTopRightRadius: borderRadius.sm,
                    minHeight: item.personal > 0 ? 2 : 0,
                  }}
                />
              </View>
              {/* Business bar */}
              <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'stretch' }}>
                <Animated.View
                  style={{
                    height: bHeight,
                    backgroundColor: businessColor,
                    borderTopLeftRadius: borderRadius.sm,
                    borderTopRightRadius: borderRadius.sm,
                    minHeight: item.business > 0 ? 2 : 0,
                  }}
                />
              </View>
            </View>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: fontSize.xs,
                marginTop: 6,
                textAlign: 'center',
              }}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

type TypeFilter = 'all' | 'expenses' | 'income';
type BusinessFilter = 'all' | 'business' | 'personal';

const TYPE_OPTIONS: { id: TypeFilter; label: string }[] = [
  { id: 'all', label: 'All Transactions' },
  { id: 'expenses', label: 'Expenses Only' },
  { id: 'income', label: 'Income Only' },
];

const BIZ_OPTIONS: { id: BusinessFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'business', label: 'Business' },
  { id: 'personal', label: 'Personal' },
];

export default function TransactionsScreen() {
  const { isDark, colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { expenses, loading: expLoading, subscribeToExpenses, deleteExpense } = useExpenseStore();
  const { incomes, loading: incLoading, subscribeToIncome, deleteIncome } = useIncomeStore();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [bizFilter, setBizFilter] = useState<BusinessFilter>('all');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showBizDropdown, setShowBizDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCharts, setShowCharts] = useState(true);
  const [showBizCharts, setShowBizCharts] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub1 = subscribeToExpenses(user.uid);
    const unsub2 = subscribeToIncome(user.uid);
    return () => { unsub1(); unsub2(); };
  }, [user?.uid]);

  const loading = expLoading || incLoading;

  const { monthlyExpenses, monthlyIncome, businessExpenses, businessIncome, flatData } = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // Build unified transaction list
    const allTransactions: Transaction[] = [];

    let expTotal = 0;
    let bizExpTotal = 0;
    for (const e of expenses) {
      const d = e.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        expTotal += e.amount;
        if (e.isBusiness) bizExpTotal += e.amount;
        allTransactions.push({ type: 'expense', data: e, dateMs: d.getTime() });
      }
    }

    let incTotal = 0;
    let bizIncTotal = 0;
    for (const i of incomes) {
      const d = i.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        incTotal += i.amount;
        if (i.isBusiness) bizIncTotal += i.amount;
        allTransactions.push({ type: 'income', data: i, dateMs: d.getTime() });
      }
    }

    // Apply filters
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const transactions = allTransactions.filter((t) => {
      if (typeFilter === 'expenses' && t.type !== 'expense') return false;
      if (typeFilter === 'income' && t.type !== 'income') return false;
      if (bizFilter === 'business' && !t.data.isBusiness) return false;
      if (bizFilter === 'personal' && t.data.isBusiness) return false;
      if (trimmedQuery) {
        if (t.type === 'expense') {
          const expense = t.data as Expense;
          const catInfo = categoryMap.get(expense.category);
          const catDisplayName = catInfo?.name ?? '';
          const match =
            (expense.description ?? '').toLowerCase().includes(trimmedQuery) ||
            expense.category.toLowerCase().includes(trimmedQuery) ||
            catDisplayName.toLowerCase().includes(trimmedQuery);
          if (!match) return false;
        } else {
          const income = t.data as Income;
          const match =
            income.source.toLowerCase().includes(trimmedQuery) ||
            (income.description ?? '').toLowerCase().includes(trimmedQuery);
          if (!match) return false;
        }
      }
      return true;
    });

    // Sort by date descending
    transactions.sort((a, b) => b.dateMs - a.dateMs);

    // Group by date
    const groupMap = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const d = new Date(t.dateMs);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const existing = groupMap.get(key);
      if (existing) existing.push(t);
      else groupMap.set(key, [t]);
    }

    const sortedKeys = [...groupMap.keys()].sort((a, b) => b.localeCompare(a));
    const items: FlatItem[] = [];
    let itemIndex = 0;
    for (const key of sortedKeys) {
      const group = groupMap.get(key)!;
      const firstDate = group[0].type === 'expense' ? group[0].data.date : group[0].data.date;
      items.push({ kind: 'header', dateLabel: formatDate(firstDate), key: `header-${key}` });
      for (const t of group) {
        const id = t.type === 'expense' ? t.data.id : t.data.id;
        items.push({ kind: 'transaction', transaction: t, key: `${t.type}-${id}`, index: itemIndex++ });
      }
    }

    return { monthlyExpenses: expTotal, monthlyIncome: incTotal, businessExpenses: bizExpTotal, businessIncome: bizIncTotal, flatData: items };
  }, [expenses, incomes, selectedMonth, typeFilter, bizFilter, searchQuery]);

  // Compute donut chart data: expense breakdown by category for current month
  const donutData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const catTotals = new Map<string, number>();

    for (const e of expenses) {
      const d = e.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + e.amount);
      }
    }

    return Array.from(catTotals.entries())
      .map(([catId, value]) => ({
        label: categoryMap.get(catId)?.name ?? catId,
        value,
        color: CATEGORY_ACCENT_COLORS[catId] ?? colors.primary,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, selectedMonth, colors.primary]);

  const bizVsPersonalData = useMemo(() => {
    const now = new Date();
    const months: { label: string; personal: number; business: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      let personal = 0;
      let business = 0;
      for (const e of expenses) {
        const ed = e.date.toDate();
        if (ed.getFullYear() === y && ed.getMonth() === m) {
          if (e.isBusiness) business += e.amount;
          else personal += e.amount;
        }
      }
      months.push({ label: MONTH_NAMES[m], personal, business });
    }
    return months;
  }, [expenses]);

  const bizDonutData = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const catTotals = new Map<string, number>();
    for (const e of expenses) {
      if (!e.isBusiness) continue;
      const d = e.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + e.amount);
      }
    }
    return Array.from(catTotals.entries())
      .map(([catId, value]) => ({
        label: categoryMap.get(catId)?.name ?? catId,
        value,
        color: CATEGORY_ACCENT_COLORS[catId] ?? colors.primary,
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, selectedMonth, colors.primary]);

  const hasBothBizAndPersonal = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    let hasBiz = false;
    let hasPersonal = false;
    for (const e of expenses) {
      const d = e.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        if (e.isBusiness) hasBiz = true;
        else hasPersonal = true;
        if (hasBiz && hasPersonal) return true;
      }
    }
    return false;
  }, [expenses, selectedMonth]);

  const handlePrevMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }, []);

  const confirmDelete = useCallback(
    (label: string, onConfirm: () => void) => {
      if (Platform.OS === 'web') {
        if (window.confirm(`Are you sure you want to delete this ${label}?`)) {
          onConfirm();
        }
      } else {
        Alert.alert(`Delete ${label}`, `Are you sure you want to delete this ${label}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: onConfirm },
        ]);
      }
    },
    [],
  );

  const handleDeleteExpense = useCallback(
    (id: string) => {
      if (!user?.uid) return;
      confirmDelete('expense', () => deleteExpense(user.uid, id));
    },
    [user?.uid, deleteExpense, confirmDelete],
  );

  const handleDeleteIncome = useCallback(
    (id: string) => {
      if (!user?.uid) return;
      confirmDelete('income', () => deleteIncome(user.uid, id));
    },
    [user?.uid, deleteIncome, confirmDelete],
  );

  const renderItem = useCallback(
    ({ item }: { item: FlatItem }) => {
      if (item.kind === 'header') {
        return (
          <Text style={[styles.sectionHeader, { color: colors.textTertiary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginHorizontal: spacing.md }]}>
            {item.dateLabel}
          </Text>
        );
      }

      const { transaction } = item;
      if (transaction.type === 'expense') {
        return (
          <AnimatedTransactionRow
            transaction={transaction}
            index={item.index}
            onPress={() => router.push(`/expense/${transaction.data.id}`)}
            onDelete={() => handleDeleteExpense(transaction.data.id)}
            colors={colors}
            spacing={spacing}
            borderRadius={borderRadius}
            fontSize={fontSize}
            fontWeight={fontWeight}
          />
        );
      }

      return (
        <AnimatedTransactionRow
          transaction={transaction}
          index={item.index}
          onPress={() => router.push(`/income/${transaction.data.id}`)}
          onDelete={() => handleDeleteIncome(transaction.data.id)}
          colors={colors}
          spacing={spacing}
          borderRadius={borderRadius}
          fontSize={fontSize}
          fontWeight={fontWeight}
        />
      );
    },
    [colors, spacing, borderRadius, fontSize, fontWeight, router, handleDeleteExpense, handleDeleteIncome],
  );

  // Close dropdowns when tapping outside
  const closeDropdowns = useCallback(() => {
    setShowTypeDropdown(false);
    setShowBizDropdown(false);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md }]}>
        <CardSkeleton />
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
          <View style={{ flex: 1 }}><CardSkeleton /></View>
          <View style={{ flex: 1 }}><CardSkeleton /></View>
        </View>
        {[1,2,3,4,5].map(i => <ListItemSkeleton key={i} />)}
      </View>
    );
  }

  const netCash = monthlyIncome - monthlyExpenses;

  const ListHeader = (
    <Pressable onPress={closeDropdowns} style={{ zIndex: 1 }}>
      {/* Summary cards */}
      <FadeInView delay={100}>
        <View style={[styles.summaryRow, { marginHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm }]}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={[styles.summaryAccent, { backgroundColor: colors.income, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
            <View style={[styles.summaryContent, { padding: spacing.md }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Income</Text>
              <Text style={[styles.summaryAmount, { color: colors.income, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={[styles.summaryAccent, { backgroundColor: colors.expense, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
            <View style={[styles.summaryContent, { padding: spacing.md }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Expenses</Text>
              <Text style={[styles.summaryAmount, { color: colors.expense, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                {formatCurrency(monthlyExpenses)}
              </Text>
            </View>
          </View>
        </View>
      </FadeInView>

      {/* Net cash flow */}
      <FadeInView delay={150}>
        <View style={[styles.netCashRow, { marginHorizontal: spacing.md, marginTop: spacing.sm }]}>
          <Text style={[styles.netCashLabel, { color: colors.textSecondary, fontSize: fontSize.sm }]}>Net Cash Flow</Text>
          <Text style={[styles.netCashAmount, { color: netCash >= 0 ? colors.income : colors.expense, fontSize: fontSize.md, fontWeight: fontWeight.bold }]}>
            {netCash >= 0 ? '+' : ''}{formatCurrency(netCash)}
          </Text>
        </View>
      </FadeInView>

      {/* Category Breakdown Chart — collapsible */}
      {donutData.length > 0 && (
        <FadeInView delay={175}>
          <Pressable
            onPress={() => setShowCharts((prev) => !prev)}
            style={[
              styles.chartToggle,
              {
                marginHorizontal: spacing.md,
                marginTop: spacing.sm,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.xs,
              },
            ]}
          >
            <Ionicons
              name={showCharts ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={colors.textTertiary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                marginLeft: spacing.xs,
              }}
            >
              Category Breakdown
            </Text>
          </Pressable>
          {showCharts && (
            <Card
              style={{
                marginHorizontal: spacing.md,
                marginBottom: spacing.sm,
              }}
            >
              <DonutChart
                data={donutData}
                centerLabel="Total"
                centerValue={formatCurrency(monthlyExpenses)}
              />
            </Card>
          )}
        </FadeInView>
      )}

      {/* Business vs Personal Charts — collapsible */}
      {hasBothBizAndPersonal && (
        <FadeInView delay={185}>
          <Pressable
            onPress={() => setShowBizCharts((prev) => !prev)}
            style={[
              styles.chartToggle,
              {
                marginHorizontal: spacing.md,
                marginTop: spacing.sm,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.xs,
              },
            ]}
          >
            <Ionicons
              name={showBizCharts ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={colors.textTertiary}
            />
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
                marginLeft: spacing.xs,
              }}
            >
              Business vs Personal
            </Text>
          </Pressable>
          {showBizCharts && (
            <>
              {/* Grouped bar chart — last 6 months */}
              <Card
                style={{
                  marginHorizontal: spacing.md,
                  marginBottom: spacing.sm,
                  padding: spacing.md,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }}>
                  Last 6 Months
                </Text>
                {/* Legend */}
                <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.expense }} />
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Personal</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
                    <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>Business</Text>
                  </View>
                </View>
                {/* Bars */}
                <GroupedBarChart data={bizVsPersonalData} height={160} personalColor={colors.expense} businessColor={colors.primary} />
              </Card>

              {/* Business category donut */}
              {bizDonutData.length > 0 && (
                <Card
                  style={{
                    marginHorizontal: spacing.md,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginBottom: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.md }}>
                    Business Expenses by Category
                  </Text>
                  <DonutChart
                    data={bizDonutData}
                    centerLabel="Business"
                    centerValue={formatCurrency(bizDonutData.reduce((s, d) => s + d.value, 0))}
                  />
                </Card>
              )}
            </>
          )}
        </FadeInView>
      )}

      {/* Filter dropdowns — overlays, not push-down */}
      <FadeInView delay={200}>
        <View style={[styles.filterRow, { marginHorizontal: spacing.md, marginTop: spacing.sm, gap: spacing.sm, zIndex: 100 }]}>
          {/* Type filter */}
          <View style={{ flex: 1, zIndex: 101 }}>
            <Pressable
              onPress={() => { setShowTypeDropdown(!showTypeDropdown); setShowBizDropdown(false); }}
              style={[styles.dropdownButton, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showTypeDropdown ? colors.primary : colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
            >
              <Text style={{ color: colors.text, fontSize: fontSize.sm, flex: 1 }}>
                {TYPE_OPTIONS.find((o) => o.id === typeFilter)?.label}
              </Text>
              <Ionicons name={showTypeDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
            </Pressable>
            {showTypeDropdown && (
              <View style={[styles.dropdown, { backgroundColor: colors.surfaceElevated ?? colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginTop: 4 }]}>
                {TYPE_OPTIONS.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => { setTypeFilter(o.id); setShowTypeDropdown(false); }}
                    style={({ pressed }) => [styles.dropdownItem, { backgroundColor: pressed ? colors.border + '40' : typeFilter === o.id ? colors.primary + '10' : 'transparent', paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
                  >
                    <Text style={{ color: typeFilter === o.id ? colors.primary : colors.text, fontSize: fontSize.sm, fontWeight: typeFilter === o.id ? fontWeight.semibold : fontWeight.normal }}>
                      {o.label}
                    </Text>
                    {typeFilter === o.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Business/Personal filter */}
          <View style={{ flex: 1, zIndex: 101 }}>
            <Pressable
              onPress={() => { setShowBizDropdown(!showBizDropdown); setShowTypeDropdown(false); }}
              style={[styles.dropdownButton, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showBizDropdown ? colors.primary : colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
            >
              <Text style={{ color: colors.text, fontSize: fontSize.sm, flex: 1 }}>
                {BIZ_OPTIONS.find((o) => o.id === bizFilter)?.label}
              </Text>
              <Ionicons name={showBizDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
            </Pressable>
            {showBizDropdown && (
              <View style={[styles.dropdown, { backgroundColor: colors.surfaceElevated ?? colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginTop: 4 }]}>
                {BIZ_OPTIONS.map((o) => (
                  <Pressable
                    key={o.id}
                    onPress={() => { setBizFilter(o.id); setShowBizDropdown(false); }}
                    style={({ pressed }) => [styles.dropdownItem, { backgroundColor: pressed ? colors.border + '40' : bizFilter === o.id ? colors.primary + '10' : 'transparent', paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
                  >
                    <Text style={{ color: bizFilter === o.id ? colors.primary : colors.text, fontSize: fontSize.sm, fontWeight: bizFilter === o.id ? fontWeight.semibold : fontWeight.normal }}>
                      {o.label}
                    </Text>
                    {bizFilter === o.id && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </FadeInView>

      {/* Search bar */}
      <FadeInView delay={225}>
        <View style={[styles.searchBar, { marginHorizontal: spacing.md, marginTop: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }]}>
          <Ionicons name="search" size={18} color={colors.textTertiary} style={{ marginRight: spacing.sm }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text, fontSize: fontSize.sm, flex: 1, paddingVertical: spacing.sm, outlineStyle: 'none' } as any]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </FadeInView>

      {/* Business summary — show when business filter or has business transactions */}
      {(businessExpenses > 0 || businessIncome > 0) && (
        <FadeInView delay={250}>
          <View style={[styles.businessSummary, { marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0, padding: spacing.md }]}>
            <View style={[styles.businessAccent, { backgroundColor: colors.primary, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 4 }}>Business This Month</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Income</Text>
                  <Text style={{ color: colors.income, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{formatCurrency(businessIncome)}</Text>
                </View>
                <View>
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Expenses</Text>
                  <Text style={{ color: colors.expense, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>{formatCurrency(businessExpenses)}</Text>
                </View>
                <View>
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>Net</Text>
                  <Text style={{ color: businessIncome - businessExpenses >= 0 ? colors.income : colors.expense, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
                    {businessIncome - businessExpenses >= 0 ? '+' : ''}{formatCurrency(businessIncome - businessExpenses)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </FadeInView>
      )}

      {/* Month selector */}
      <FadeInView delay={300}>
        <View style={[styles.monthSelector, { paddingVertical: spacing.md }]}>
          <Pressable
            onPress={handlePrevMonth}
            style={({ pressed }) => [styles.monthArrow, { backgroundColor: pressed ? colors.border : colors.surface, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.monthArrowText, { color: colors.primary, fontSize: fontSize.lg }]}>{'\u2039'}</Text>
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.semibold }]}>
            {formatMonthYear(selectedMonth)}
          </Text>
          <Pressable
            onPress={handleNextMonth}
            style={({ pressed }) => [styles.monthArrow, { backgroundColor: pressed ? colors.border : colors.surface, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.monthArrowText, { color: colors.primary, fontSize: fontSize.lg }]}>{'\u203A'}</Text>
          </Pressable>
        </View>
      </FadeInView>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {flatData.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <EmptyState
              icon="swap-horizontal-outline"
              title="No transactions yet"
              subtitle="Tap the + button to add your first expense or income for this month."
            />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  summaryAccent: {
    width: 4,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    marginBottom: 4,
  },
  summaryAmount: {
    letterSpacing: -0.3,
  },
  netCashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  netCashLabel: {},
  netCashAmount: {},
  searchBar: { flexDirection: 'row', alignItems: 'center' },
  searchInput: { },
  filterRow: { flexDirection: 'row' },
  dropdownButton: { flexDirection: 'row', alignItems: 'center' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  businessSummary: { flexDirection: 'row', overflow: 'hidden' },
  businessAccent: { width: 4 },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  monthArrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowText: {
    lineHeight: 22,
  },
  monthLabel: {
    minWidth: 160,
    textAlign: 'center',
  },
  sectionHeader: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    overflow: 'hidden',
    flexDirection: 'row',
    padding: 0,
  },
  accentBar: {
    width: 4,
  },
  rowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  rowIcon: {
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowTitle: {
    flexShrink: 1,
  },
  rowSubtitle: {
    marginTop: 2,
  },
  badge: {},
  badgeText: {},
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  rowAmount: {},
  deleteButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  chartToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
