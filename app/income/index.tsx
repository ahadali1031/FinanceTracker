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
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate, formatMonthYear } from '@/src/utils/date';
import type { Income } from '@/src/types';

export default function IncomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { incomes, loading, subscribeToIncome, deleteIncome } = useIncomeStore();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  // Subscribe to incomes on mount
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToIncome(user.uid);
    return unsubscribe;
  }, [user?.uid]);

  // Filter for selected month
  const { monthlyTotal, filtered } = useMemo(() => {
    const monthIncomes = incomes.filter((i) => {
      const d = i.date.toDate();
      return (
        d.getFullYear() === selectedMonth.getFullYear() &&
        d.getMonth() === selectedMonth.getMonth()
      );
    });

    let total = 0;
    for (const income of monthIncomes) {
      total += income.amount;
    }

    return { monthlyTotal: total, filtered: monthIncomes };
  }, [incomes, selectedMonth]);

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
      Alert.alert('Delete Income', 'Are you sure you want to delete this income entry?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteIncome(user.uid, id),
        },
      ]);
    },
    [user?.uid, deleteIncome],
  );

  const renderItem = useCallback(
    ({ item }: { item: Income }) => (
      <Card style={styles.incomeRow}>
        <View style={styles.rowLeft}>
          <Text style={styles.sourceIcon}>💵</Text>
          <View style={styles.rowText}>
            <View style={styles.sourceRow}>
              <Text style={[styles.source, { color: colors.text }]} numberOfLines={1}>
                {item.source}
              </Text>
              {item.isRecurring && (
                <View style={[styles.badge, { backgroundColor: isDark ? '#1a3a2a' : '#d4f5e2' }]}>
                  <Text style={[styles.badgeText, { color: isDark ? '#34c759' : '#137a30' }]}>
                    Recurring
                  </Text>
                </View>
              )}
            </View>
            {!!item.description && (
              <Text
                style={[styles.description, { color: isDark ? '#8e8e93' : '#6e6e73' }]}
                numberOfLines={1}
              >
                {item.description}
              </Text>
            )}
            <Text style={[styles.date, { color: isDark ? '#8e8e93' : '#6e6e73' }]}>
              {formatDate(item.date)}
            </Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.amount, { color: '#34c759' }]}>
            +{formatCurrency(item.amount)}
          </Text>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteIcon}>🗑</Text>
          </TouchableOpacity>
        </View>
      </Card>
    ),
    [colors, isDark, handleDelete],
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
          Monthly Income
        </Text>
        <Text style={[styles.totalAmount, { color: '#34c759' }]}>
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

      {/* Income list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="💰"
          title="No income yet"
          subtitle="Tap the + button to add your first income entry for this month."
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/income/add')}
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
  listContent: {
    paddingBottom: 100,
  },
  incomeRow: {
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
  sourceIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  rowText: {
    flex: 1,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  source: {
    fontSize: 16,
    fontWeight: '500',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
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
