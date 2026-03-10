import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useSavingsStore } from '@/src/stores/savingsStore';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate } from '@/src/utils/date';
import { AmountInput, Button, CalendarPicker } from '@/src/components/ui';
import type { SavingsSnapshot } from '@/src/types';

function FadeInView({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export default function SavingsAccountDetailScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const { accounts, snapshots, addSnapshot, deleteAccount } = useSavingsStore();

  const account = useMemo(() => accounts.find((a) => a.id === id), [accounts, id]);
  const accountSnapshots = useMemo(() => snapshots.get(id ?? '') ?? [], [snapshots, id]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [balance, setBalance] = useState('');
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  const currentBalance = accountSnapshots.length > 0 ? accountSnapshots[0].balance : 0;
  const previousBalance = accountSnapshots.length > 1 ? accountSnapshots[1].balance : null;
  const change = previousBalance !== null ? currentBalance - previousBalance : null;

  const handleAddSnapshot = async () => {
    if (!user?.uid || !id) return;
    const parsed = parseFloat(balance);
    if (!parsed || parsed < 0) return;

    setSaving(true);
    try {
      await addSnapshot(user.uid, id, {
        balance: parsed,
        snapshotDate: Timestamp.fromDate(date),
      } as any);
      setBalance('');
      setDate(new Date());
      setShowAddForm(false);
    } catch {
      Alert.alert('Error', 'Failed to add balance update.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!user?.uid || !id) return;
    const doDelete = async () => {
      try {
        await deleteAccount(user.uid, id);
        router.back();
      } catch {
        Alert.alert('Error', 'Failed to delete account.');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${account?.name}"? This will remove all balance history.`)) doDelete();
    } else {
      Alert.alert('Delete Account', `Delete "${account?.name}"? This will remove all balance history.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (!account) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.md }}>Loading...</Text>
      </View>
    );
  }

  const ListHeader = (
    <View>
      {/* Hero balance */}
      <FadeInView delay={100}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.md, padding: spacing.lg }]}>
          <View style={styles.heroTop}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{account.name}</Text>
            {account.isEmergencyFund && (
              <View style={{ backgroundColor: colors.warning + '18', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                <Text style={{ color: colors.warning, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>Emergency Fund</Text>
              </View>
            )}
          </View>
          {!!account.institution && (
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }}>{account.institution}</Text>
          )}
          <Text style={{ color: colors.text, fontSize: fontSize.hero, fontWeight: fontWeight.bold, marginTop: spacing.sm }}>
            {formatCurrency(currentBalance)}
          </Text>
          {change !== null && (
            <View style={[styles.changeRow, { marginTop: spacing.xs }]}>
              <Ionicons
                name={change >= 0 ? 'arrow-up' : 'arrow-down'}
                size={14}
                color={change >= 0 ? colors.income : colors.expense}
              />
              <Text style={{ color: change >= 0 ? colors.income : colors.expense, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: 4 }}>
                {change >= 0 ? '+' : ''}{formatCurrency(change)} since last update
              </Text>
            </View>
          )}
        </View>
      </FadeInView>

      {/* Update balance button */}
      <FadeInView delay={200}>
        <Pressable
          onPress={() => setShowAddForm(!showAddForm)}
          style={[styles.addButton, { backgroundColor: colors.savings, borderRadius: borderRadius.md, marginHorizontal: spacing.md, marginBottom: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
        >
          <Ionicons name={showAddForm ? 'close' : 'add'} size={20} color="#fff" />
          <Text style={{ color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.sm }}>
            {showAddForm ? 'Cancel' : 'Update Balance'}
          </Text>
        </Pressable>
      </FadeInView>

      {/* Add balance form */}
      {showAddForm && (
        <FadeInView delay={0}>
          <View style={[styles.addForm, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md }]}>
            <AmountInput label="Current Balance" value={balance} onChangeText={setBalance} />
            <View style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }}>Date</Text>
              <Pressable
                onPress={() => setShowCalendar(!showCalendar)}
                style={[styles.dateDisplay, { backgroundColor: colors.background, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showCalendar ? colors.primary : colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}
              >
                <Ionicons name="calendar" size={18} color={showCalendar ? colors.primary : colors.textSecondary} />
                <Text style={{ color: colors.text, fontSize: fontSize.md, flex: 1, marginLeft: spacing.sm }}>{formatDate(date)}</Text>
                <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
              </Pressable>
              {showCalendar && (
                <View style={{ marginTop: spacing.sm }}>
                  <CalendarPicker value={date} onChange={(d) => { setDate(d); setShowCalendar(false); }} />
                </View>
              )}
            </View>
            <View style={{ marginTop: spacing.md }}>
              <Button title="Save Balance" onPress={handleAddSnapshot} loading={saving} disabled={saving || !balance} />
            </View>
          </View>
        </FadeInView>
      )}

      {/* Delete account */}
      <FadeInView delay={300}>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteRow, { opacity: pressed ? 0.6 : 1, marginHorizontal: spacing.md, marginBottom: spacing.md, paddingVertical: spacing.sm }]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={{ color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: spacing.xs }}>Delete Account</Text>
        </Pressable>
      </FadeInView>

      {/* History header */}
      {accountSnapshots.length > 0 && (
        <FadeInView delay={350}>
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, letterSpacing: 1, textTransform: 'uppercase', marginHorizontal: spacing.md, marginBottom: spacing.sm }}>
            Balance History
          </Text>
        </FadeInView>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={accountSnapshots}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        renderItem={({ item, index }) => {
          const prev = index < accountSnapshots.length - 1 ? accountSnapshots[index + 1] : null;
          const diff = prev ? item.balance - prev.balance : null;
          return (
            <FadeInView delay={Math.min(index * 50, 300)}>
              <View style={[styles.snapshotRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.md, marginBottom: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
                    {formatCurrency(item.balance)}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }}>
                    {formatDate(item.snapshotDate)}
                  </Text>
                </View>
                {diff !== null && (
                  <View style={[styles.changeRow]}>
                    <Ionicons name={diff >= 0 ? 'arrow-up' : 'arrow-down'} size={12} color={diff >= 0 ? colors.income : colors.expense} />
                    <Text style={{ color: diff >= 0 ? colors.income : colors.expense, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: 2 }}>
                      {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                    </Text>
                  </View>
                )}
              </View>
            </FadeInView>
          );
        }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: {},
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  changeRow: { flexDirection: 'row', alignItems: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addForm: {},
  dateDisplay: { flexDirection: 'row', alignItems: 'center' },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  snapshotRow: { flexDirection: 'row', alignItems: 'center' },
});
