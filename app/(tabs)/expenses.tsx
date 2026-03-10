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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/useTheme';
import { Card, EmptyState } from '@/src/components/ui';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate, formatMonthYear } from '@/src/utils/date';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import { Ionicons } from '@expo/vector-icons';
import type { Expense } from '@/src/types';

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

interface DateGroup {
  dateKey: string;
  dateLabel: string;
  data: Expense[];
}

function AnimatedExpenseRow({
  expense,
  index,
  onPress,
  onDelete,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
}: {
  expense: Expense;
  index: number;
  onPress: () => void;
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
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const cat = categoryMap.get(expense.category);
  const accentColor = CATEGORY_ACCENT_COLORS[expense.category] ?? colors.primary;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Card
        style={[styles.expenseRow, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}
        onPress={onPress}
      >
        <View style={[styles.accentBar, { backgroundColor: accentColor, borderTopLeftRadius: borderRadius.md, borderBottomLeftRadius: borderRadius.md }]} />
        <View style={[styles.rowContent, { paddingVertical: spacing.md, paddingRight: spacing.md, paddingLeft: spacing.md }]}>
          <View style={styles.rowLeft}>
            <Ionicons name={(cat?.icon ?? 'ellipsis-horizontal') as any} size={24} color={accentColor} style={styles.categoryIcon} />
            <View style={styles.rowText}>
              <Text style={[styles.description, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }]} numberOfLines={1}>
                {expense.description || cat?.name || 'Expense'}
              </Text>
              <Text style={[styles.categoryName, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
                {cat?.name ?? expense.category}
              </Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.amount, { color: colors.expense, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
              -{formatCurrency(expense.amount)}
            </Text>
            <View onStartShouldSetResponder={() => true}>
              <Pressable
                onPress={() => onDelete()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: pressed ? colors.border : 'transparent', borderRadius: borderRadius.sm }]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

export default function ExpensesScreen() {
  const { isDark, colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { expenses, loading, subscribeToExpenses, deleteExpense } = useExpenseStore();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToExpenses(user.uid);
    return unsubscribe;
  }, [user?.uid]);

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

  const flatData = useMemo(() => {
    const items: ({ type: 'header'; dateLabel: string; key: string } | { type: 'expense'; expense: Expense; key: string; index: number })[] = [];
    let itemIndex = 0;
    for (const group of groups) {
      items.push({ type: 'header', dateLabel: group.dateLabel, key: `header-${group.dateKey}` });
      for (const expense of group.data) {
        items.push({ type: 'expense', expense, key: expense.id, index: itemIndex++ });
      }
    }
    return items;
  }, [groups]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof flatData)[number] }) => {
      if (item.type === 'header') {
        return (
          <Text style={[styles.sectionHeader, { color: colors.textTertiary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginHorizontal: spacing.md }]}>
            {item.dateLabel}
          </Text>
        );
      }

      return (
        <AnimatedExpenseRow
          expense={item.expense}
          index={item.index}
          onPress={() => router.push(`/expense/${item.expense.id}`)}
          onDelete={() => handleDelete(item.expense.id)}
          colors={colors}
          spacing={spacing}
          borderRadius={borderRadius}
          fontSize={fontSize}
          fontWeight={fontWeight}
        />
      );
    },
    [colors, spacing, borderRadius, fontSize, fontWeight, router, handleDelete],
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Monthly total card with accent bar */}
      <View style={[styles.totalCard, { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
        {!isDark && <View style={styles.totalCardShadow} />}
        <View style={[styles.totalAccentBar, { backgroundColor: colors.expense, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
        <View style={[styles.totalContent, { padding: spacing.lg }]}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
            Monthly Spending
          </Text>
          <Text style={[styles.totalAmount, { color: colors.expense, fontSize: fontSize.hero, fontWeight: fontWeight.heavy }]}>
            {formatCurrency(monthlyTotal)}
          </Text>
        </View>
      </View>

      {/* Month selector pills */}
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

      {/* Expense list */}
      {flatData.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="No expenses yet"
          subtitle="Tap the + button to add your first expense for this month."
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

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
        onPress={() => router.push('/expense/add')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
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
    overflow: 'hidden',
    flexDirection: 'row',
  },
  totalCardShadow: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  totalAccentBar: {
    width: 5,
  },
  totalContent: {
    flex: 1,
  },
  totalLabel: {
    marginBottom: 4,
  },
  totalAmount: {
    letterSpacing: -0.5,
  },
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
  expenseRow: {
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
  categoryIcon: {
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  description: {
    marginBottom: 2,
  },
  categoryName: {
    marginTop: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {},
  deleteButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  deleteIcon: {},
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  fabText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '600',
    lineHeight: 32,
  },
});
