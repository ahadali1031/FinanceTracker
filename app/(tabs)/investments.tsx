import React, { useEffect, useMemo, useCallback, useRef } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { Card, EmptyState } from '@/src/components/ui';
import { useInvestmentStore } from '@/src/stores/investmentStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';
import { useQuotes } from '@/src/hooks/useQuotes';
import { INVESTMENT_ACCOUNT_TYPES } from '@/src/utils/categories';
import type { InvestmentAccount, Holding } from '@/src/types';
import type { StockQuote } from '@/src/lib/stock-api';

const accountTypeMap = new Map(INVESTMENT_ACCOUNT_TYPES.map((t) => [t.id, t.name]));

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  brokerage: 'bar-chart',
  '401k': 'business',
  roth_ira: 'shield-checkmark',
  traditional_ira: 'shield',
  hsa: 'medkit',
};

function FadeInView({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
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

function AnimatedAccountRow({
  account,
  holdings,
  quotes,
  index,
  onPress,
  onDelete,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
}: {
  account: InvestmentAccount;
  holdings: Holding[];
  quotes: Map<string, StockQuote>;
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

  const totalCostBasis = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  let marketValue = 0;
  for (const h of holdings) {
    const q = quotes.get(h.ticker.toUpperCase());
    marketValue += q ? q.price * h.shares : h.costBasis;
  }
  const hasQuotes = quotes.size > 0;
  const gainLoss = marketValue - totalCostBasis;
  const gainLossPercent = totalCostBasis > 0 ? (gainLoss / totalCostBasis) * 100 : 0;
  const holdingCount = holdings.length;
  const iconName = ACCOUNT_TYPE_ICONS[account.accountType] ?? 'bar-chart';
  const typeName = accountTypeMap.get(account.accountType) ?? account.accountType;

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Card style={[styles.accountRow, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        <View style={[styles.accentBar, { backgroundColor: colors.investment, borderTopLeftRadius: borderRadius.md, borderBottomLeftRadius: borderRadius.md }]} />
        <View style={[styles.rowContent, { paddingVertical: spacing.md, paddingRight: spacing.md, paddingLeft: spacing.md }]}>
          <Pressable style={styles.rowLeft} onPress={onPress}>
            <Ionicons name={iconName as any} size={24} color={colors.investment} style={styles.rowIcon} />
            <View style={styles.rowText}>
              <Text style={[styles.accountName, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }]} numberOfLines={1}>
                {account.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.accountType, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
                  {typeName}
                </Text>
                {account.institution ? (
                  <Text style={[styles.institution, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
                    {account.institution}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.holdingCount, { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }]}>
                {holdingCount} holding{holdingCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </Pressable>
          <View style={styles.rowRight}>
            <Text style={[styles.amount, { color: colors.investment, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
              {formatCurrency(hasQuotes ? marketValue : totalCostBasis)}
            </Text>
            {hasQuotes && holdingCount > 0 ? (
              <Text style={[styles.costLabel, { color: gainLoss >= 0 ? colors.income : colors.expense, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
                {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPercent.toFixed(1)}%)
              </Text>
            ) : (
              <Text style={[styles.costLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
                cost basis
              </Text>
            )}
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

export default function InvestmentsScreen() {
  const { isDark, colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { accounts, holdings, loading, subscribeToAccounts, deleteAccount } = useInvestmentStore();

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToAccounts(user.uid);
    return unsub;
  }, [user?.uid]);

  // Collect all tickers across all accounts for batch quote fetch
  const allTickers = useMemo(() => {
    const tickers: string[] = [];
    for (const account of accounts) {
      const h = holdings.get(account.id) ?? [];
      for (const holding of h) {
        tickers.push(holding.ticker);
      }
    }
    return tickers;
  }, [accounts, holdings]);

  const { quotes, loading: quotesLoading } = useQuotes(allTickers);

  const totalPortfolioValue = useMemo(() => {
    let total = 0;
    for (const account of accounts) {
      const h = holdings.get(account.id) ?? [];
      for (const holding of h) {
        const q = quotes.get(holding.ticker.toUpperCase());
        total += q ? q.price * holding.shares : holding.costBasis;
      }
    }
    return total;
  }, [accounts, holdings, quotes]);

  const totalCostBasis = useMemo(() => {
    let total = 0;
    for (const account of accounts) {
      const h = holdings.get(account.id) ?? [];
      for (const holding of h) {
        total += holding.costBasis;
      }
    }
    return total;
  }, [accounts, holdings]);

  const totalHoldings = useMemo(() => {
    let count = 0;
    for (const account of accounts) {
      count += (holdings.get(account.id) ?? []).length;
    }
    return count;
  }, [accounts, holdings]);

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (!user?.uid) return;
      if (Platform.OS === 'web') {
        if (window.confirm(`Delete "${name}" and all its holdings?`)) {
          deleteAccount(user.uid, id);
        }
      } else {
        Alert.alert('Delete Account', `Delete "${name}" and all its holdings?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteAccount(user.uid, id) },
        ]);
      }
    },
    [user?.uid, deleteAccount],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: InvestmentAccount; index: number }) => (
      <AnimatedAccountRow
        account={item}
        holdings={holdings.get(item.id) ?? []}
        quotes={quotes}
        index={index}
        onPress={() => router.push(`/investment/${item.id}`)}
        onDelete={() => handleDelete(item.id, item.name)}
        colors={colors}
        spacing={spacing}
        borderRadius={borderRadius}
        fontSize={fontSize}
        fontWeight={fontWeight}
      />
    ),
    [colors, spacing, borderRadius, fontSize, fontWeight, handleDelete, holdings, quotes, router],
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
      {/* Portfolio summary */}
      <FadeInView delay={100}>
        <View style={[styles.summaryRow, { marginHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm }]}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={[styles.summaryAccent, { backgroundColor: colors.investment, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
            <View style={[styles.summaryContent, { padding: spacing.md }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Total Portfolio</Text>
              <Text style={[styles.summaryAmount, { color: colors.investment, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                {formatCurrency(totalPortfolioValue)}
              </Text>
              {quotes.size > 0 && totalCostBasis > 0 && (
                <Text style={[{ color: totalPortfolioValue - totalCostBasis >= 0 ? colors.income : colors.expense, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginTop: 2 }]}>
                  {totalPortfolioValue - totalCostBasis >= 0 ? '+' : ''}{formatCurrency(totalPortfolioValue - totalCostBasis)} ({((totalPortfolioValue - totalCostBasis) / totalCostBasis * 100).toFixed(1)}%)
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={[styles.summaryAccent, { backgroundColor: colors.primary, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
            <View style={[styles.summaryContent, { padding: spacing.md }]}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>Accounts</Text>
              <Text style={[styles.summaryAmount, { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                {accounts.length}
              </Text>
            </View>
          </View>
        </View>
      </FadeInView>

      {/* Info row */}
      <FadeInView delay={200}>
        <View style={[styles.infoRow, { marginHorizontal: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
          <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            {totalHoldings} total holding{totalHoldings !== 1 ? 's' : ''}
          </Text>
          <Pressable
            onPress={() => router.push('/investment/add-account' as any)}
            style={({ pressed }) => [styles.addAccountButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="add-circle" size={18} color={colors.investment} />
            <Text style={[{ color: colors.investment, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: 4 }]}>
              Add Account
            </Text>
          </Pressable>
        </View>
      </FadeInView>

      {/* Account list */}
      {accounts.length === 0 ? (
        <EmptyState
          icon="trending-up-outline"
          title="No investment accounts"
          subtitle="Add an account to start tracking your investments."
        />
      ) : (
        <FlatList
          data={accounts}
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
  addAccountButton: { flexDirection: 'row', alignItems: 'center' },
  accountRow: { overflow: 'hidden', flexDirection: 'row', padding: 0 },
  accentBar: { width: 4 },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  rowIcon: { marginRight: 12 },
  rowText: { flex: 1 },
  accountName: { flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  accountType: {},
  institution: {},
  holdingCount: {},
  rowRight: { alignItems: 'flex-end', gap: 4 },
  amount: {},
  costLabel: {},
  deleteButton: { paddingHorizontal: 6, paddingVertical: 4, marginTop: 2 },
});
