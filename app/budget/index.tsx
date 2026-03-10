import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Platform,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useBudgetStore } from '@/src/stores/budgetStore';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { AmountInput, Button, CategoryPicker } from '@/src/components/ui';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import { formatCurrency } from '@/src/utils/currency';
import { useToastStore } from '@/src/stores/toastStore';

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

function getProgressColor(
  percentage: number,
  colors: { success: string; warning: string; danger: string },
) {
  if (percentage > 90) return colors.danger;
  if (percentage >= 75) return colors.warning;
  return colors.success;
}

function getCategoryInfo(categoryId: string) {
  return EXPENSE_CATEGORIES.find((c) => c.id === categoryId) ?? {
    id: categoryId,
    name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
    icon: 'ellipsis-horizontal',
  };
}

export default function BudgetScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { targets, loading, subscribeToTargets, setTarget, deleteTarget } =
    useBudgetStore();
  const { expenses, subscribeToExpenses, getCategoryTotals } =
    useExpenseStore();
  const showToast = useToastStore((s) => s.showToast);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [limitAmount, setLimitAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  // Subscribe to data
  useEffect(() => {
    if (!user?.uid) return;
    const unsubs = [
      subscribeToTargets(user.uid),
      subscribeToExpenses(user.uid),
    ];
    return () => unsubs.forEach((u) => u());
  }, [user?.uid]);

  // Current month category totals
  const categoryTotals = useMemo(
    () => getCategoryTotals(new Date()),
    [expenses],
  );

  // Categories not yet budgeted
  const availableCategories = useMemo(() => {
    const budgetedIds = new Set(targets.map((t) => t.category));
    return EXPENSE_CATEGORIES.filter((c) => !budgetedIds.has(c.id));
  }, [targets]);

  // Summary
  const { totalBudgeted, totalSpent, remaining } = useMemo(() => {
    let budgeted = 0;
    let spent = 0;
    for (const t of targets) {
      budgeted += t.monthlyLimit;
      spent += categoryTotals.get(t.category) ?? 0;
    }
    return {
      totalBudgeted: budgeted,
      totalSpent: spent,
      remaining: budgeted - spent,
    };
  }, [targets, categoryTotals]);

  // Auto-select first available category when form opens
  useEffect(() => {
    if (showAddForm && availableCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(availableCategories[0].id);
    }
  }, [showAddForm, availableCategories]);

  const handleSaveTarget = async () => {
    if (!user?.uid || !selectedCategory || !limitAmount) return;
    const amount = parseFloat(limitAmount);
    if (isNaN(amount) || amount <= 0) return;

    setSaving(true);
    try {
      await setTarget(user.uid, { category: selectedCategory, monthlyLimit: amount });
      setShowAddForm(false);
      setSelectedCategory('');
      setLimitAmount('');
      showToast('Budget target saved');
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to save budget target.');
      } else {
        Alert.alert('Error', 'Failed to save budget target.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTarget = async (category: string) => {
    if (!user?.uid || !editAmount) return;
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) return;

    try {
      await setTarget(user.uid, { category, monthlyLimit: amount });
      setEditingId(null);
      setEditAmount('');
      showToast('Budget updated');
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to update budget.');
      } else {
        Alert.alert('Error', 'Failed to update budget.');
      }
    }
  };

  const handleDeleteTarget = (id: string, categoryName: string) => {
    const doDelete = async () => {
      if (!user?.uid) return;
      try {
        await deleteTarget(user.uid, id);
        showToast(`${categoryName} budget removed`);
      } catch {
        if (Platform.OS === 'web') {
          window.alert('Failed to delete budget.');
        } else {
          Alert.alert('Error', 'Failed to delete budget.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove budget for ${categoryName}?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Budget', `Remove budget for ${categoryName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const renderBudgetRow = ({ item, index }: { item: (typeof targets)[0]; index: number }) => {
    const cat = getCategoryInfo(item.category);
    const spent = categoryTotals.get(item.category) ?? 0;
    const percentage = item.monthlyLimit > 0 ? Math.min((spent / item.monthlyLimit) * 100, 100) : 0;
    const displayPercentage = item.monthlyLimit > 0 ? Math.round((spent / item.monthlyLimit) * 100) : 0;
    const progressColor = getProgressColor(displayPercentage, colors);
    const isEditing = editingId === item.category;

    return (
      <FadeInView delay={100 + index * 60}>
        <Pressable
          onPress={() => {
            if (isEditing) return;
            setEditingId(item.category);
            setEditAmount(item.monthlyLimit.toFixed(2));
          }}
          style={[
            styles.budgetRow,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              marginBottom: spacing.sm,
            },
          ]}
        >
          {/* Main row */}
          <View style={styles.budgetRowTop}>
            <View style={styles.budgetRowLeft}>
              <View
                style={[
                  styles.categoryIcon,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Ionicons name={cat.icon as any} size={20} color={colors.primary} />
              </View>
              <View style={styles.categoryText}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: fontSize.md,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {cat.name}
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: fontSize.xs,
                  }}
                >
                  {formatCurrency(spent)} / {formatCurrency(item.monthlyLimit)}
                </Text>
              </View>
            </View>
            <View style={styles.budgetRowRight}>
              <View
                style={[
                  styles.percentBadge,
                  {
                    backgroundColor: progressColor + '20',
                    borderRadius: borderRadius.sm,
                  },
                ]}
              >
                <Text
                  style={{
                    color: progressColor,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.bold,
                  }}
                >
                  {displayPercentage}%
                </Text>
              </View>
              <Pressable
                onPress={() => handleDeleteTarget(item.category, cat.name)}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          </View>

          {/* Progress bar */}
          <View
            style={[
              styles.progressBarBg,
              {
                backgroundColor: colors.border,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${percentage}%` as any,
                  backgroundColor: progressColor,
                  borderRadius: borderRadius.sm,
                },
              ]}
            />
          </View>

          {/* Inline edit */}
          {isEditing && (
            <View style={[styles.editSection, { borderTopColor: colors.border }]}>
              <AmountInput
                value={editAmount}
                onChangeText={setEditAmount}
                label="Monthly Limit"
              />
              <View style={styles.editButtons}>
                <Button
                  title="Save"
                  onPress={() => handleUpdateTarget(item.category)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setEditingId(null);
                    setEditAmount('');
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </Pressable>
      </FadeInView>
    );
  };

  const ListHeader = () => (
    <>
      {/* Summary */}
      <FadeInView delay={50}>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: fontSize.xs,
                  marginBottom: 4,
                }}
              >
                Total Budgeted
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.bold,
                }}
              >
                {formatCurrency(totalBudgeted)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: fontSize.xs,
                  marginBottom: 4,
                }}
              >
                Total Spent
              </Text>
              <Text
                style={{
                  color: colors.expense,
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.bold,
                }}
              >
                {formatCurrency(totalSpent)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: fontSize.xs,
                  marginBottom: 4,
                }}
              >
                Remaining
              </Text>
              <Text
                style={{
                  color: remaining >= 0 ? colors.success : colors.danger,
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.bold,
                }}
              >
                {formatCurrency(remaining)}
              </Text>
            </View>
          </View>

          {/* Overall progress bar */}
          <View
            style={[
              styles.progressBarBg,
              {
                backgroundColor: colors.border,
                borderRadius: borderRadius.sm,
                marginTop: spacing.md,
              },
            ]}
          >
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0}%` as any,
                  backgroundColor: getProgressColor(
                    totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
                    colors,
                  ),
                  borderRadius: borderRadius.sm,
                },
              ]}
            />
          </View>
        </View>
      </FadeInView>

      {/* Add Budget Button / Form */}
      <FadeInView delay={100}>
        {!showAddForm ? (
          <Pressable
            onPress={() => {
              if (availableCategories.length === 0) {
                if (Platform.OS === 'web') {
                  window.alert('All categories already have budget targets.');
                } else {
                  Alert.alert('Info', 'All categories already have budget targets.');
                }
                return;
              }
              setShowAddForm(true);
            }}
            style={[
              styles.addButton,
              {
                backgroundColor: colors.primary,
                borderRadius: borderRadius.lg,
                marginBottom: spacing.md,
              },
            ]}
          >
            <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: fontSize.md,
                fontWeight: fontWeight.semibold,
                marginLeft: 8,
              }}
            >
              Add Budget
            </Text>
          </Pressable>
        ) : (
          <View
            style={[
              styles.addForm,
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
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
                marginBottom: spacing.sm,
              }}
            >
              New Budget Target
            </Text>
            <CategoryPicker
              categories={availableCategories as any}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
            <AmountInput
              value={limitAmount}
              onChangeText={setLimitAmount}
              label="Monthly Limit"
            />
            <View style={styles.addFormButtons}>
              <Button
                title="Save"
                onPress={handleSaveTarget}
                loading={saving}
                disabled={!selectedCategory || !limitAmount}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowAddForm(false);
                  setSelectedCategory('');
                  setLimitAmount('');
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </FadeInView>
    </>
  );

  const ListEmpty = () => (
    <FadeInView delay={200}>
      <View style={[styles.emptyState, { paddingVertical: spacing.xl }]}>
        <Ionicons
          name="wallet-outline"
          size={48}
          color={colors.textTertiary}
          style={{ marginBottom: spacing.md }}
        />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: fontSize.md,
            textAlign: 'center',
          }}
        >
          No budget targets yet.{'\n'}Tap "Add Budget" to get started.
        </Text>
      </View>
    </FadeInView>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <FlatList
        data={targets}
        keyExtractor={(item) => item.category}
        renderItem={renderBudgetRow}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={!loading ? ListEmpty : null}
        contentContainerStyle={[styles.content, { padding: spacing.md }]}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  summaryCard: {},
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  addForm: {},
  addFormButtons: {
    flexDirection: 'row',
  },
  budgetRow: {
    padding: 16,
  },
  budgetRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryText: {
    flex: 1,
  },
  budgetRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  percentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressBarBg: {
    height: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  editSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  editButtons: {
    flexDirection: 'row',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
