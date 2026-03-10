import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { Card, EmptyState } from '@/src/components/ui';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';
import { SUBSCRIPTION_CATEGORIES } from '@/src/utils/categories';
import type { Subscription } from '@/src/types';

const categoryMap = new Map(SUBSCRIPTION_CATEGORIES.map((c) => [c.id, c]));

const CATEGORY_COLORS: Record<string, string> = {
  streaming: '#E50914',
  music: '#1DB954',
  software: '#3B82F6',
  gaming: '#8B5CF6',
  news: '#F59E0B',
  fitness: '#EF4444',
  cloud_storage: '#06B6D4',
  other: '#6B7280',
};

function AnimatedSubscriptionRow({
  item,
  index,
  onToggle,
  onPress,
  onDelete,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
}: {
  item: Subscription;
  index: number;
  onToggle: (isActive: boolean) => void;
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
      delay: Math.min(index * 50, 400),
      useNativeDriver: true,
    }).start();
  }, []);

  const cat = categoryMap.get(item.category);
  const accentColor = CATEGORY_COLORS[item.category] ?? colors.subscription;
  const nextBilling = item.nextBillingDate?.toDate?.();
  const nextBillingLabel = nextBilling
    ? nextBilling.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Card style={[styles.row, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        <View style={[styles.accentBar, { backgroundColor: item.isActive ? accentColor : colors.border, borderTopLeftRadius: borderRadius.md, borderBottomLeftRadius: borderRadius.md }]} />
        <View style={[styles.rowContent, { paddingVertical: spacing.md, paddingRight: spacing.md, paddingLeft: spacing.md }]}>
          <Pressable style={styles.rowLeft} onPress={onPress}>
            <Ionicons
              name={(cat?.icon ?? 'ellipsis-horizontal') as any}
              size={24}
              color={item.isActive ? accentColor : colors.textTertiary}
              style={styles.rowIcon}
            />
            <View style={styles.rowText}>
              <Text
                style={[
                  styles.rowTitle,
                  {
                    color: item.isActive ? colors.text : colors.textTertiary,
                    fontSize: fontSize.md,
                    fontWeight: fontWeight.bold,
                  },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
                  {item.frequency === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
                {nextBillingLabel && item.isActive && (
                  <Text style={[styles.rowSubtitle, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
                    Next: {nextBillingLabel}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
          <View style={styles.rowRight}>
            <Text
              style={[
                styles.rowAmount,
                {
                  color: item.isActive ? colors.subscription : colors.textTertiary,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                },
              ]}
            >
              {formatCurrency(item.amount)}
              <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.regular }}>
                /{item.frequency === 'monthly' ? 'mo' : 'yr'}
              </Text>
            </Text>
            <View style={styles.rowActions}>
              <Switch
                value={item.isActive}
                onValueChange={onToggle}
                trackColor={{ false: colors.border, true: colors.subscription }}
                thumbColor="#fff"
                style={styles.toggle}
              />
              <Pressable
                onPress={onDelete}
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

export default function SubscriptionsScreen() {
  const { isDark, colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const {
    subscriptions,
    loading,
    subscribeToSubscriptions,
    toggleActive,
    deleteSubscription,
    getMonthlyTotal,
    getYearlyTotal,
    getUpcomingRenewals,
  } = useSubscriptionStore();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToSubscriptions(user.uid);
    return unsub;
  }, [user?.uid]);

  const monthlyTotal = useMemo(() => getMonthlyTotal(), [subscriptions]);
  const yearlyTotal = useMemo(() => getYearlyTotal(), [subscriptions]);
  const upcoming = useMemo(() => getUpcomingRenewals(7), [subscriptions]);

  const activeCount = useMemo(() => subscriptions.filter((s) => s.isActive).length, [subscriptions]);

  const handleToggle = useCallback(
    (id: string, isActive: boolean) => {
      if (!user?.uid) return;
      toggleActive(user.uid, id, isActive);
    },
    [user?.uid, toggleActive],
  );

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (!user?.uid) return;
      if (Platform.OS === 'web') {
        if (window.confirm(`Delete "${name}"?`)) {
          deleteSubscription(user.uid, id);
        }
      } else {
        Alert.alert('Delete Subscription', `Delete "${name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteSubscription(user.uid, id) },
        ]);
      }
    },
    [user?.uid, deleteSubscription],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Subscription; index: number }) => (
      <AnimatedSubscriptionRow
        item={item}
        index={index}
        onToggle={(isActive) => handleToggle(item.id, isActive)}
        onPress={() => router.push(`/subscription/${item.id}`)}
        onDelete={() => handleDelete(item.id, item.name)}
        colors={colors}
        spacing={spacing}
        borderRadius={borderRadius}
        fontSize={fontSize}
        fontWeight={fontWeight}
      />
    ),
    [colors, spacing, borderRadius, fontSize, fontWeight, handleToggle, handleDelete, router],
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
      {/* Summary cards */}
      <View style={[styles.summaryRow, { marginHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm }]}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <View style={[styles.summaryAccent, { backgroundColor: colors.subscription, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
          <View style={[styles.summaryContent, { padding: spacing.md }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Monthly</Text>
            <Text style={[styles.summaryAmount, { color: colors.subscription, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
              {formatCurrency(monthlyTotal)}
            </Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
          <View style={[styles.summaryAccent, { backgroundColor: colors.expense, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
          <View style={[styles.summaryContent, { padding: spacing.md }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Yearly</Text>
            <Text style={[styles.summaryAmount, { color: colors.expense, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
              {formatCurrency(yearlyTotal)}
            </Text>
          </View>
        </View>
      </View>

      {/* Active count + upcoming */}
      <View style={[styles.infoRow, { marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
        <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
          {activeCount} active subscription{activeCount !== 1 ? 's' : ''}
        </Text>
        {upcoming.length > 0 && (
          <Text style={[styles.infoText, { color: colors.subscription, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }]}>
            {upcoming.length} renewing soon
          </Text>
        )}
      </View>

      {/* Subscription list */}
      {subscriptions.length === 0 ? (
        <EmptyState
          icon="repeat-outline"
          title="No subscriptions yet"
          subtitle="Tap the + button to track your first subscription."
        />
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => item.id}
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
        onPress={() => router.push('/subscription/add')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row' },
  summaryCard: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  summaryAccent: { width: 4 },
  summaryContent: { flex: 1 },
  summaryLabel: { marginBottom: 4 },
  summaryAmount: { letterSpacing: -0.3 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoText: {},
  row: { overflow: 'hidden', flexDirection: 'row', padding: 0 },
  accentBar: { width: 4 },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  rowIcon: { marginRight: 12 },
  rowText: { flex: 1 },
  rowTitle: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  rowSubtitle: {},
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: {},
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggle: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  deleteButton: { paddingHorizontal: 6, paddingVertical: 4 },
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
});
