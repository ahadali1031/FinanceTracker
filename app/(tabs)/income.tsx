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
import { Card, EmptyState, FadeInView } from '@/src/components/ui';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate, formatMonthYear } from '@/src/utils/date';
import { Ionicons } from '@expo/vector-icons';
import type { Income } from '@/src/types';

function AnimatedIncomeRow({
  item,
  index,
  onDelete,
  onPress,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
}: {
  item: Income;
  index: number;
  onDelete: () => void;
  onPress: () => void;
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

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Pressable onPress={onPress}>
      <Card style={[styles.incomeRow, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        <View style={[styles.accentBar, { backgroundColor: colors.income, borderTopLeftRadius: borderRadius.md, borderBottomLeftRadius: borderRadius.md }]} />
        <View style={[styles.rowContent, { paddingVertical: spacing.md, paddingRight: spacing.md, paddingLeft: spacing.md }]}>
          <View style={styles.rowLeft}>
            <Ionicons name="cash" size={24} color={colors.income} style={styles.sourceIcon} />
            <View style={styles.rowText}>
              <View style={styles.sourceRow}>
                <Text style={[styles.source, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }]} numberOfLines={1}>
                  {item.source}
                </Text>
                {item.isRecurring && (
                  <View style={[styles.badge, { backgroundColor: colors.primary + '18', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                    <Text style={[styles.badgeText, { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
                      Recurring
                    </Text>
                  </View>
                )}
              </View>
              {!!item.description && (
                <Text
                  style={[styles.description, { color: colors.textSecondary, fontSize: fontSize.sm }]}
                  numberOfLines={1}
                >
                  {item.description}
                </Text>
              )}
              <Text style={[styles.date, { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs }]}>
                {formatDate(item.date)}
              </Text>
            </View>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.amount, { color: colors.income, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
              +{formatCurrency(item.amount)}
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
      </Pressable>
    </Animated.View>
  );
}

export default function IncomeScreen() {
  const { isDark, colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { incomes, loading, subscribeToIncome, deleteIncome } = useIncomeStore();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToIncome(user.uid);
    return unsubscribe;
  }, [user?.uid]);

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
      if (Platform.OS === 'web') {
        if (window.confirm('Are you sure you want to delete this income entry?')) {
          deleteIncome(user.uid, id);
        }
      } else {
        Alert.alert('Delete Income', 'Are you sure you want to delete this income entry?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => deleteIncome(user.uid, id),
          },
        ]);
      }
    },
    [user?.uid, deleteIncome],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Income; index: number }) => (
      <AnimatedIncomeRow
        item={item}
        index={index}
        onDelete={() => handleDelete(item.id)}
        onPress={() => router.push(`/income/${item.id}` as any)}
        colors={colors}
        spacing={spacing}
        borderRadius={borderRadius}
        fontSize={fontSize}
        fontWeight={fontWeight}
      />
    ),
    [colors, spacing, borderRadius, fontSize, fontWeight, handleDelete, router],
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
      <FadeInView delay={100}>
        <View style={[styles.totalCard, { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          {!isDark && <View style={styles.totalCardShadow} />}
          <View style={[styles.totalAccentBar, { backgroundColor: colors.income, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
          <View style={[styles.totalContent, { padding: spacing.lg }]}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium }]}>
              Monthly Income
            </Text>
            <Text style={[styles.totalAmount, { color: colors.income, fontSize: fontSize.hero, fontWeight: fontWeight.heavy }]}>
              {formatCurrency(monthlyTotal)}
            </Text>
          </View>
        </View>
      </FadeInView>

      {/* Month selector pills */}
      <FadeInView delay={200}>
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

      {/* Income list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="cash-outline"
          title="No income yet"
          subtitle="Tap the + button to add your first income entry for this month."
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
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
  incomeRow: {
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
  sourceIcon: {
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
    flexShrink: 1,
  },
  badge: {},
  badgeText: {},
  description: {
    marginTop: 2,
  },
  date: {},
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
});
