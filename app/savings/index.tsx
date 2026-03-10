import React, { useEffect, useRef, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useSavingsStore } from '@/src/stores/savingsStore';
import { formatCurrency } from '@/src/utils/currency';
import { EmptyState, FadeInView } from '@/src/components/ui';
import type { SavingsAccount } from '@/src/types';

function AnimatedAccountRow({
  account,
  balance,
  index,
  onPress,
  onDelete,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
}: {
  account: SavingsAccount;
  balance: number;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  colors: any;
  spacing: any;
  borderRadius: any;
  fontSize: any;
  fontWeight: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 60, 400),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Pressable
        onPress={onPress}
        style={[styles.accountCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.md }]}
      >
        <View style={[styles.accountAccent, { backgroundColor: colors.savings, borderRadius: borderRadius.sm }]} />
        <View style={styles.accountContent}>
          <View style={styles.accountTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }} numberOfLines={1}>
                  {account.name}
                </Text>
                {account.isEmergencyFund && (
                  <View style={{ backgroundColor: colors.warning + '18', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2, marginLeft: spacing.sm }}>
                    <Text style={{ color: colors.warning, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>Emergency</Text>
                  </View>
                )}
              </View>
              {!!account.institution && (
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }}>{account.institution}</Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.savings, fontSize: fontSize.lg, fontWeight: fontWeight.bold }}>
                {formatCurrency(balance)}
              </Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => ({ paddingHorizontal: 6, paddingVertical: 4, backgroundColor: pressed ? colors.border : 'transparent', borderRadius: borderRadius.sm, marginLeft: spacing.sm })}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export default function SavingsScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { accounts, snapshots, loading, subscribeToAccounts, deleteAccount, getTotalSavings } = useSavingsStore();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToAccounts(user.uid);
    return unsub;
  }, [user?.uid]);

  const getLatestBalance = useCallback((accountId: string) => {
    const snaps = snapshots.get(accountId);
    if (snaps && snaps.length > 0) return snaps[0].balance;
    return 0;
  }, [snapshots]);

  const handleDelete = useCallback((account: SavingsAccount) => {
    if (!user?.uid) return;
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${account.name}"?`)) {
        deleteAccount(user.uid, account.id);
      }
    } else {
      Alert.alert('Delete Account', `Delete "${account.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteAccount(user.uid, account.id) },
      ]);
    }
  }, [user?.uid, deleteAccount]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalSavings = getTotalSavings();

  const ListHeader = (
    <View>
      {/* Total Savings */}
      <FadeInView delay={100}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.md, padding: spacing.lg }]}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: 4 }}>Total Savings</Text>
          <Text style={{ color: colors.text, fontSize: fontSize.hero, fontWeight: fontWeight.bold }}>{formatCurrency(totalSavings)}</Text>
        </View>
      </FadeInView>

      {/* Subheader row with count + add link */}
      <FadeInView delay={200}>
        <View style={[styles.subheaderRow, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}>
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.sm }}>
            {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </Text>
          <Pressable
            onPress={() => router.push('/savings/add' as any)}
            style={({ pressed }) => [styles.addLink, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="add-circle" size={18} color={colors.savings} />
            <Text style={{ color: colors.savings, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: 4 }}>
              Add Account
            </Text>
          </Pressable>
        </View>
      </FadeInView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <EmptyState
            icon="wallet-outline"
            title="No savings accounts"
            subtitle="Add your first savings account to track your balances."
          />
        }
        renderItem={({ item, index }) => (
          <AnimatedAccountRow
            account={item}
            balance={getLatestBalance(item.id)}
            index={index}
            onPress={() => router.push(`/savings/${item.id}`)}
            onDelete={() => handleDelete(item)}
            colors={colors}
            spacing={spacing}
            borderRadius={borderRadius}
            fontSize={fontSize}
            fontWeight={fontWeight}
          />
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { alignItems: 'center' },
  subheaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLink: { flexDirection: 'row', alignItems: 'center' },
  accountCard: { flexDirection: 'row', alignItems: 'center' },
  accountAccent: { width: 4, height: '70%', marginRight: 12 },
  accountContent: { flex: 1 },
  accountTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
});
