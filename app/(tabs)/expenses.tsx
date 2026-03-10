import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Card, EmptyState } from '@/src/components/ui';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate, formatMonthYear } from '@/src/utils/date';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import type { Expense } from '@/src/types';

const categoryMap = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c]));

interface DateGroup {
  dateKey: string;
  dateLabel: string;
  data: Expense[];
}

export default function ExpensesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { expenses, loading, subscribeToExpenses, deleteExpense } = useExpenseStore();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  // Subscribe to expenses on mount
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToExpenses(user.uid);
    return unsubscribe;
  }, [user?.uid]);

  // Filter expenses for selected month and group by date
  const { monthlyTotal, groups } = useMemo(() => {
    const filtered = expenses.filter((e) => {
      const d = e.date.toDate();
      return (
        d.getFullYear() === selectedMonth.getFullYear() &&
        d.getMonth() === selectedMonth.getMonth()
      );
    });

    let total = 0;
    const groupMap = new Map<string, Expense[]>();

    for (const expense of filtered) {
      total += expense.amount;
      const d = expense.date.toDate();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(expense);
      } else {
        groupMap.set(key, [expense]);
      }
    }

    // Sort by date key descending
    const sortedKeys = [...groupMap.keys()].sort((a, b) => b.localeCompare(a));
    const dateGroups: DateGroup[] = sortedKeys.map((key) => {
      const items = groupMap.get(key)!;
      return {
        dateKey: key,
        dateLabel: formatDate(items[0].date),
        data: items,
      };
    });

    return { monthlyTotal: total, groups: dateGroups };
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

  const handleDelete = useCallback(
    (id: string) => {
      if (!user?.uid) return;
      Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteExpense(user.uid, id),
        },
      ]);
    },
    [user?.uid, deleteExpense],
  );

  // Flatten groups into FlatList data with section headers
  const flatData = useMemo(() => {
    const items: ({ type: 'header'; dateLabel: string; key: string } | { type: 'expense'; expense: Expense; key: string })[] = [];
    for (const group of groups) {
      items.push({ type: 'header', dateLabel: group.dateLabel, key: `header-${group.dateKey}` });
      for (const expense of group.data) {
        items.push({ type: 'expense', expense, key: expense.id });
      }
    }
    return items;
  }, [groups]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof flatData)[number] }) => {
      if (item.type === 'header') {
        return (
          <Text style={[styles.sectionHeader, { color: isDark ? '#8e8e93' : '#6e6e73' }]}>
            {item.dateLabel}
          </Text>
        );
      }

      const { expense } = item;
      const cat = categoryMap.get(expense.category);

      return (
        <Card
          style={styles.expenseRow}
          onPress={() => router.push(`/expense/${expense.id}`)}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.categoryIcon}>{cat?.icon ?? '📦'}</Text>
            <View style={styles.rowText}>
              <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
                {expense.description || cat?.name || 'Expense'}
              </Text>
              <Text style={[styles.categoryName, { color: isDark ? '#8e8e93' : '#6e6e73' }]}>
                {cat?.name ?? expense.category}
              </Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.amount, { color: '#ff3b30' }]}>
              -{formatCurrency(expense.amount)}
            </Text>
            <TouchableOpacity
              onPress={() => handleDelete(expense.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteIcon}>🗑</Text>
            </TouchableOpacity>
          </View>
        </Card>
      );
    },
    [isDark, colors, router, handleDelete],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Monthly total */}
      <Card style={styles.totalCard}>
        <Text style={[styles.totalLabel, { color: isDark ? '#8e8e93' : '#6e6e73' }]}>
          Monthly Spending
        </Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>
          {formatCurrency(monthlyTotal)}
        </Text>
      </Card>

      {/* Month selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrow}>
          <Text style={[styles.monthArrowText, { color: colors.tint }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.text }]}>
          {formatMonthYear(selectedMonth)}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
          <Text style={[styles.monthArrowText, { color: colors.tint }]}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      {/* Expense list */}
      {flatData.length === 0 ? (
        <EmptyState
          icon="💸"
          title="No expenses yet"
          subtitle="Tap the + button to add your first expense for this month."
        />
      ) : (
        <FlatList
          data={flatData}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/expense/add')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
  totalCard: {
    marginHorizontal: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  monthArrow: {
    padding: 8,
  },
  monthArrowText: {
    fontSize: 22,
    fontWeight: '600',
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '600',
    minWidth: 160,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 6,
    marginHorizontal: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryName: {
    fontSize: 13,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteIcon: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 30,
  },
});
