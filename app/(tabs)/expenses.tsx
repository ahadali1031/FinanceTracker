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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/useTheme';
import { Card, EmptyState } from '@/src/components/ui';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate, formatMonthYear } from '@/src/utils/date';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import { Ionicons } from '@expo/vector-icons';
import type { Expense, Income } from '@/src/types';

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
};

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
                <Text style={[styles.rowTitle, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }]} numberOfLines={1}>
                  {expense.description || cat?.name || 'Expense'}
                </Text>
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
                {income.isRecurring && (
                  <View style={[styles.badge, { backgroundColor: colors.primary + '18', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                    <Text style={[styles.badgeText, { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
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

export default function TransactionsScreen() {
  const { isDark, colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { expenses, loading: expLoading, subscribeToExpenses, deleteExpense } = useExpenseStore();
  const { incomes, loading: incLoading, subscribeToIncome, deleteIncome } = useIncomeStore();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  useEffect(() => {
    if (!user?.uid) return;
    const unsub1 = subscribeToExpenses(user.uid);
    const unsub2 = subscribeToIncome(user.uid);
    return () => { unsub1(); unsub2(); };
  }, [user?.uid]);

  const loading = expLoading || incLoading;

  const { monthlyExpenses, monthlyIncome, flatData } = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // Build unified transaction list
    const transactions: Transaction[] = [];

    let expTotal = 0;
    for (const e of expenses) {
      const d = e.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        expTotal += e.amount;
        transactions.push({ type: 'expense', data: e, dateMs: d.getTime() });
      }
    }

    let incTotal = 0;
    for (const i of incomes) {
      const d = i.date.toDate();
      if (d.getFullYear() === year && d.getMonth() === month) {
        incTotal += i.amount;
        transactions.push({ type: 'income', data: i, dateMs: d.getTime() });
      }
    }

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

    return { monthlyExpenses: expTotal, monthlyIncome: incTotal, flatData: items };
  }, [expenses, incomes, selectedMonth]);

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

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const netCash = monthlyIncome - monthlyExpenses;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Summary cards */}
      <View style={[styles.summaryRow, { marginHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm }]}>
        {/* Income card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <View style={[styles.summaryAccent, { backgroundColor: colors.income, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
          <View style={[styles.summaryContent, { padding: spacing.md }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Income</Text>
            <Text style={[styles.summaryAmount, { color: colors.income, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
              {formatCurrency(monthlyIncome)}
            </Text>
          </View>
        </View>
        {/* Expenses card */}
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

      {/* Net cash flow */}
      <View style={[styles.netCashRow, { marginHorizontal: spacing.md, marginTop: spacing.sm }]}>
        <Text style={[styles.netCashLabel, { color: colors.textSecondary, fontSize: fontSize.sm }]}>Net Cash Flow</Text>
        <Text style={[styles.netCashAmount, { color: netCash >= 0 ? colors.income : colors.expense, fontSize: fontSize.md, fontWeight: fontWeight.bold }]}>
          {netCash >= 0 ? '+' : ''}{formatCurrency(netCash)}
        </Text>
      </View>

      {/* Month selector */}
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

      {/* Transaction list */}
      {flatData.length === 0 ? (
        <EmptyState
          icon="swap-horizontal-outline"
          title="No transactions yet"
          subtitle="Tap the + button to add your first expense or income for this month."
        />
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
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
});
