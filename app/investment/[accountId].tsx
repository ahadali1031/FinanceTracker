import React, { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { Card, EmptyState } from '@/src/components/ui';
import { useInvestmentStore } from '@/src/stores/investmentStore';
import { useAuthStore } from '@/src/stores/authStore';
import { useQuotes } from '@/src/hooks/useQuotes';
import { formatCurrency } from '@/src/utils/currency';
import { formatDate } from '@/src/utils/date';
import { INVESTMENT_ACCOUNT_TYPES } from '@/src/utils/categories';
import type { Holding, InvestmentTransaction } from '@/src/types';
import type { StockQuote } from '@/src/lib/stock-api';

const accountTypeMap = new Map(INVESTMENT_ACCOUNT_TYPES.map((t) => [t.id, t.name]));

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

function getTransactionTypeConfig(colors: any): Record<string, { icon: string; color: string; prefix: string }> {
  return {
    buy: { icon: 'arrow-down-circle', color: colors.income, prefix: 'Bought' },
    sell: { icon: 'arrow-up-circle', color: colors.expense, prefix: 'Sold' },
    dividend: { icon: 'cash', color: colors.warning, prefix: 'Dividend' },
    employer_match: { icon: 'gift', color: colors.income, prefix: 'Match' },
  };
}

export default function InvestmentAccountScreen() {
  const { isDark, colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const TRANSACTION_TYPE_CONFIG = useMemo(() => getTransactionTypeConfig(colors), [colors]);
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const { accounts, holdings, transactions, subscribeToAccounts, subscribeToTransactions, updateAccount, updateHolding, removeHolding, updateTransaction, deleteTransaction } = useInvestmentStore();

  const [activeTab, setActiveTab] = useState<'holdings' | 'transactions'>('holdings');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToAccounts(user.uid);
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid || !accountId) return;
    const unsub = subscribeToTransactions(user.uid, accountId);
    return unsub;
  }, [user?.uid, accountId]);

  const account = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId]);
  const accountHoldings = useMemo(() => holdings.get(accountId) ?? [], [holdings, accountId]);
  const accountTransactions = useMemo(() => transactions.get(accountId) ?? [], [transactions, accountId]);

  // Fetch live quotes for all holdings
  const tickers = useMemo(() => accountHoldings.map((h) => h.ticker), [accountHoldings]);
  const { quotes, loading: quotesLoading } = useQuotes(tickers);

  const totalCostBasis = useMemo(() => accountHoldings.reduce((sum, h) => sum + h.costBasis, 0), [accountHoldings]);

  const totalMarketValue = useMemo(() => {
    let total = 0;
    for (const h of accountHoldings) {
      const quote = quotes.get(h.ticker.toUpperCase());
      if (quote) {
        total += quote.price * h.shares;
      } else {
        total += h.costBasis; // fallback to cost basis if no quote
      }
    }
    return total;
  }, [accountHoldings, quotes]);

  const totalGainLoss = totalMarketValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  const handleDeleteHolding = useCallback(
    (holdingId: string, ticker: string) => {
      if (!user?.uid || !accountId) return;
      if (Platform.OS === 'web') {
        if (window.confirm(`Remove ${ticker} holding?`)) {
          removeHolding(user.uid, accountId, holdingId);
        }
      } else {
        Alert.alert('Remove Holding', `Remove ${ticker} holding?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => removeHolding(user.uid, accountId, holdingId) },
        ]);
      }
    },
    [user?.uid, accountId, removeHolding],
  );

  const handleEditTransaction = useCallback(
    async (txId: string, data: Partial<Omit<InvestmentTransaction, 'id'>>) => {
      if (!user?.uid || !accountId) return;
      await updateTransaction(user.uid, accountId, txId, data);
    },
    [user?.uid, accountId, updateTransaction],
  );

  const handleDeleteTransaction = useCallback(
    (txId: string) => {
      if (!user?.uid || !accountId) return;
      if (Platform.OS === 'web') {
        if (window.confirm('Delete this transaction?')) {
          deleteTransaction(user.uid, accountId, txId);
        }
      } else {
        Alert.alert('Delete Transaction', 'Delete this transaction?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(user.uid, accountId, txId) },
        ]);
      }
    },
    [user?.uid, accountId, deleteTransaction],
  );

  if (!account) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const typeName = accountTypeMap.get(account.accountType) ?? account.accountType;
  const hasQuotes = quotes.size > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Account header */}
        <FadeInView delay={100}>
          <View style={[styles.headerCard, { backgroundColor: colors.surface, marginHorizontal: spacing.md, marginTop: spacing.md, borderRadius: borderRadius.lg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
            <View style={[styles.headerAccent, { backgroundColor: colors.investment, borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg }]} />
            <View style={[styles.headerContent, { padding: spacing.lg }]}>
              <View>
                {editingName ? (
                  <View style={styles.editNameRow}>
                    <TextInput
                      style={[styles.editNameInput, { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold, borderBottomColor: colors.investment, borderBottomWidth: 2, paddingBottom: 2, flex: 1, outlineStyle: 'none' } as any]}
                      value={editName}
                      onChangeText={setEditName}
                      autoFocus
                      onBlur={() => {
                        const trimmed = editName.trim();
                        if (trimmed && trimmed !== account.name && user?.uid) {
                          updateAccount(user.uid, accountId, { name: trimmed });
                        }
                        setEditingName(false);
                      }}
                      onSubmitEditing={() => {
                        const trimmed = editName.trim();
                        if (trimmed && trimmed !== account.name && user?.uid) {
                          updateAccount(user.uid, accountId, { name: trimmed });
                        }
                        setEditingName(false);
                      }}
                    />
                  </View>
                ) : (
                  <Pressable onPress={() => { setEditName(account.name); setEditingName(true); }} style={styles.editNameTouchable}>
                    <Text style={[styles.accountName, { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                      {account.name}
                    </Text>
                    <Ionicons name="pencil" size={14} color={colors.textTertiary} style={{ marginLeft: 6 }} />
                  </Pressable>
                )}
                <Text style={[styles.accountMeta, { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }]}>
                  {typeName}{account.institution ? ` · ${account.institution}` : ''}
                </Text>
              </View>
              <View style={[styles.statsRow, { marginTop: spacing.md, gap: spacing.lg }]}>
                <View>
                  <Text style={[styles.statLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
                    {hasQuotes ? 'Market Value' : 'Cost Basis'}
                  </Text>
                  <Text style={[styles.statValue, { color: colors.investment, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
                    {formatCurrency(hasQuotes ? totalMarketValue : totalCostBasis)}
                  </Text>
                </View>
                {hasQuotes && (
                  <View>
                    <Text style={[styles.statLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>Gain/Loss</Text>
                    <Text style={[styles.statValue, { color: totalGainLoss >= 0 ? colors.income : colors.expense, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                      {totalGainLoss >= 0 ? '+' : ''}{formatCurrency(totalGainLoss)}
                    </Text>
                    <Text style={[{ color: totalGainLoss >= 0 ? colors.income : colors.expense, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>
                      {totalGainLossPercent >= 0 ? '+' : ''}{totalGainLossPercent.toFixed(2)}%
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={[styles.statLabel, { color: colors.textTertiary, fontSize: fontSize.xs }]}>Holdings</Text>
                  <Text style={[styles.statValue, { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
                    {accountHoldings.length}
                  </Text>
                </View>
              </View>
              {quotesLoading && quotes.size === 0 && accountHoldings.length > 0 && (
                <View style={[styles.quotesLoadingRow, { marginTop: spacing.sm }]}>
                  <ActivityIndicator size="small" color={colors.investment} />
                  <Text style={[{ color: colors.textTertiary, fontSize: fontSize.xs, marginLeft: spacing.xs }]}>Fetching live prices...</Text>
                </View>
              )}
            </View>
          </View>
        </FadeInView>

        {/* Tab switcher */}
        <FadeInView delay={200}>
          <View style={[styles.tabRow, { marginHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm }]}>
            {(['holdings', 'transactions'] as const).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: activeTab === tab ? colors.investment + '15' : colors.surface,
                    borderRadius: borderRadius.md,
                    borderWidth: activeTab === tab ? 2 : 1,
                    borderColor: activeTab === tab ? colors.investment : colors.border,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.lg,
                  },
                ]}
              >
                <Text
                  style={{
                    color: activeTab === tab ? colors.investment : colors.textSecondary,
                    fontSize: fontSize.sm,
                    fontWeight: activeTab === tab ? fontWeight.semibold : fontWeight.normal,
                  }}
                >
                  {tab === 'holdings' ? `Holdings (${accountHoldings.length})` : `Transactions (${accountTransactions.length})`}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => router.push({ pathname: '/investment/add-transaction', params: { accountId, accountName: account.name } } as any)}
              style={({ pressed }) => [styles.addButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Ionicons name="add-circle" size={28} color={colors.investment} />
            </Pressable>
          </View>
        </FadeInView>

        {/* Content */}
        {activeTab === 'holdings' ? (
          accountHoldings.length === 0 ? (
            <EmptyState
              icon="pie-chart-outline"
              title="No holdings"
              subtitle="Add a buy transaction to create holdings."
            />
          ) : (
            <View style={{ paddingTop: spacing.sm }}>
              {accountHoldings.map((holding, index) => (
                <HoldingRow
                  key={holding.id}
                  holding={holding}
                  quote={quotes.get(holding.ticker.toUpperCase())}
                  index={index}
                  onDelete={() => handleDeleteHolding(holding.id, holding.ticker)}
                  onUpdateRecurring={(data) => {
                    if (user?.uid && accountId) {
                      updateHolding(user.uid, accountId, holding.id, data);
                    }
                  }}
                  colors={colors}
                  spacing={spacing}
                  borderRadius={borderRadius}
                  fontSize={fontSize}
                  fontWeight={fontWeight}
                />
              ))}
            </View>
          )
        ) : (
          accountTransactions.length === 0 ? (
            <EmptyState
              icon="swap-vertical-outline"
              title="No transactions"
              subtitle="Record buy, sell, or dividend transactions."
            />
          ) : (
            <View style={{ paddingTop: spacing.sm }}>
              {accountTransactions.map((tx, index) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  index={index}
                  onEdit={(data) => handleEditTransaction(tx.id, data)}
                  onDelete={() => handleDeleteTransaction(tx.id)}
                  colors={colors}
                  spacing={spacing}
                  borderRadius={borderRadius}
                  fontSize={fontSize}
                  fontWeight={fontWeight}
                />
              ))}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

function HoldingRow({
  holding,
  quote,
  index,
  onDelete,
  onUpdateRecurring,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
}: {
  holding: Holding;
  quote?: StockQuote;
  index: number;
  onDelete: () => void;
  onUpdateRecurring: (data: { isRecurring?: boolean; recurringDay?: number; recurringAmount?: number }) => void;
  colors: any;
  spacing: any;
  borderRadius: any;
  fontSize: any;
  fontWeight: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState(String(holding.recurringDay ?? 1));
  const [recurringAmount, setRecurringAmount] = useState(String(holding.recurringAmount ?? ''));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const avgCost = holding.shares > 0 ? holding.costBasis / holding.shares : 0;
  const marketValue = quote ? quote.price * holding.shares : null;
  const gainLoss = marketValue !== null ? marketValue - holding.costBasis : null;
  const gainLossPercent = gainLoss !== null && holding.costBasis > 0 ? (gainLoss / holding.costBasis) * 100 : null;
  const isPositive = gainLoss !== null && gainLoss >= 0;

  const handleSaveRecurring = () => {
    const day = Math.min(28, Math.max(1, parseInt(recurringDay) || 1));
    const amount = parseFloat(recurringAmount) || 0;
    if (amount > 0) {
      onUpdateRecurring({ isRecurring: true, recurringDay: day, recurringAmount: amount });
      setShowRecurring(false);
    }
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Card style={[styles.holdingRow, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        <View style={[styles.holdingContent, { paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}>
          <View style={styles.holdingLeft}>
            <View>
              <View style={[styles.tickerBadge, { backgroundColor: colors.investment + '15', borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 }]}>
                <Text style={[styles.ticker, { color: colors.investment, fontSize: fontSize.md, fontWeight: fontWeight.bold }]}>
                  {holding.ticker}
                </Text>
              </View>
              {quote && (
                <Text style={[{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 4, textAlign: 'center' }]}>
                  ${quote.price.toFixed(2)}
                </Text>
              )}
            </View>
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={[{ color: colors.text, fontSize: fontSize.sm }]}>
                {holding.shares % 1 === 0 ? holding.shares : holding.shares.toFixed(4)} shares
              </Text>
              <Text style={[{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }]}>
                Avg ${avgCost.toFixed(2)}/share
              </Text>
              {gainLoss !== null && (
                <View style={[styles.gainRow, { marginTop: 4 }]}>
                  <Ionicons
                    name={isPositive ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={isPositive ? colors.income : colors.expense}
                  />
                  <Text style={[{ color: isPositive ? colors.income : colors.expense, fontSize: fontSize.xs, fontWeight: fontWeight.semibold, marginLeft: 3 }]}>
                    {isPositive ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPercent!.toFixed(2)}%)
                  </Text>
                </View>
              )}
              {holding.isRecurring && (
                <Pressable onPress={() => setShowRecurring(!showRecurring)} style={{ marginTop: 4 }}>
                  <View style={[styles.gainRow]}>
                    <Ionicons name="repeat" size={12} color={colors.investment} />
                    <Text style={{ color: colors.investment, fontSize: fontSize.xs, marginLeft: 3 }}>
                      ${holding.recurringAmount}/mo on day {holding.recurringDay}
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
          <View style={styles.holdingRight}>
            <Text style={[{ color: colors.investment, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
              {formatCurrency(marketValue ?? holding.costBasis)}
            </Text>
            {marketValue !== null && (
              <Text style={[{ color: colors.textTertiary, fontSize: fontSize.xs }]}>
                cost {formatCurrency(holding.costBasis)}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Pressable
                onPress={() => setShowRecurring(!showRecurring)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: pressed ? colors.border : 'transparent', borderRadius: borderRadius.sm }]}
              >
                <Ionicons name="repeat" size={16} color={holding.isRecurring ? colors.investment : colors.textTertiary} />
              </Pressable>
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
        {/* Recurring settings expandable */}
        {showRecurring && (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }}>Auto-Invest</Text>
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 4 }}>Day of month (1-28)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text, fontSize: fontSize.md, outlineStyle: 'none' } as any}
                    value={recurringDay}
                    onChangeText={setRecurringDay}
                    keyboardType="number-pad"
                    placeholder="1"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 4 }}>Amount ($)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text, fontSize: fontSize.md, outlineStyle: 'none' } as any}
                    value={recurringAmount}
                    onChangeText={setRecurringAmount}
                    keyboardType="decimal-pad"
                    placeholder="100"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Pressable
                  onPress={handleSaveRecurring}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: pressed ? colors.investment + '30' : colors.investment + '15',
                    borderRadius: borderRadius.md,
                    paddingVertical: spacing.sm,
                    alignItems: 'center',
                  })}
                >
                  <Text style={{ color: colors.investment, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                    {holding.isRecurring ? 'Update' : 'Enable'}
                  </Text>
                </Pressable>
                {holding.isRecurring && (
                  <Pressable
                    onPress={() => {
                      onUpdateRecurring({ isRecurring: false, recurringDay: undefined, recurringAmount: undefined });
                      setShowRecurring(false);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: pressed ? colors.danger + '30' : colors.danger + '15',
                      borderRadius: borderRadius.md,
                      paddingVertical: spacing.sm,
                      alignItems: 'center',
                    })}
                  >
                    <Text style={{ color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                      Disable
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

function TransactionRow({
  transaction,
  index,
  onEdit,
  onDelete,
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
}: {
  transaction: InvestmentTransaction;
  index: number;
  onEdit: (data: Partial<Omit<InvestmentTransaction, 'id'>>) => void;
  onDelete: () => void;
  colors: any;
  spacing: any;
  borderRadius: any;
  fontSize: any;
  fontWeight: any;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [editing, setEditing] = useState(false);
  const [editShares, setEditShares] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editTotal, setEditTotal] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const txTypeConfig = getTransactionTypeConfig(colors);
  const config = txTypeConfig[transaction.type] ?? txTypeConfig.buy;
  const dateStr = transaction.date?.toDate?.() ? formatDate(transaction.date) : '';
  const isDividend = transaction.type === 'dividend';
  const isMatch = transaction.type === 'employer_match';

  const handleSaveEdit = () => {
    if (isDividend) {
      const total = parseFloat(editTotal);
      if (!total || total <= 0) return;
      onEdit({ totalAmount: total });
    } else {
      const s = parseFloat(editShares);
      const p = parseFloat(editPrice);
      if (!s || s <= 0 || !p || p <= 0) return;
      onEdit({ shares: s, pricePerShare: p, totalAmount: s * p });
    }
    setEditing(false);
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <Card style={[styles.holdingRow, { marginHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        <View style={[styles.accentBar, { backgroundColor: config.color, borderTopLeftRadius: borderRadius.md, borderBottomLeftRadius: borderRadius.md }]} />
        <Pressable onPress={() => { if (!editing) { setEditing(true); setEditShares(String(transaction.shares)); setEditPrice(String(transaction.pricePerShare)); setEditTotal(String(transaction.totalAmount)); } }} style={[styles.holdingContent, { paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}>
          <View style={styles.holdingLeft}>
            <Ionicons name={config.icon as any} size={22} color={config.color} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={[{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }]}>
                {config.prefix} {transaction.ticker}
              </Text>
              <Text style={[{ color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }]}>
                {isDividend
                  ? `${formatCurrency(transaction.totalAmount)}`
                  : `${transaction.shares} × $${transaction.pricePerShare.toFixed(2)}`}
              </Text>
              <Text style={[{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }]}>
                {dateStr}
                {isMatch && ' · Employer Match'}
                {transaction.isTransfer && ' · Transfer'}
              </Text>
            </View>
          </View>
          <View style={styles.holdingRight}>
            <Text style={[{ color: config.color, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>
              {transaction.type === 'sell' ? '+' : isMatch ? '+' : '-'}{formatCurrency(transaction.totalAmount)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setEditing(!editing)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: pressed ? colors.border : 'transparent', borderRadius: borderRadius.sm }]}
              >
                <Ionicons name="pencil" size={14} color={colors.textTertiary} />
              </Pressable>
              <Pressable
                onPress={onDelete}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={({ pressed }) => [styles.deleteButton, { backgroundColor: pressed ? colors.border : 'transparent', borderRadius: borderRadius.sm }]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </Pressable>
            </View>
          </View>
        </Pressable>
        {/* Inline edit form */}
        {editing && (
          <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }}>Edit Transaction</Text>
            {isDividend ? (
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 4 }}>Dividend Amount ($)</Text>
                <TextInput
                  style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text, fontSize: fontSize.md, outlineStyle: 'none' } as any}
                  value={editTotal}
                  onChangeText={setEditTotal}
                  keyboardType="decimal-pad"
                />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 4 }}>Shares</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text, fontSize: fontSize.md, outlineStyle: 'none' } as any}
                    value={editShares}
                    onChangeText={setEditShares}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginBottom: 4 }}>Price ($)</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text, fontSize: fontSize.md, outlineStyle: 'none' } as any}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
              <Pressable
                onPress={handleSaveEdit}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? config.color + '30' : config.color + '15',
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.sm,
                  alignItems: 'center' as const,
                })}
              >
                <Text style={{ color: config.color, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>Save</Text>
              </Pressable>
              <Pressable
                onPress={() => setEditing(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: pressed ? colors.border + '50' : colors.surface,
                  borderRadius: borderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingVertical: spacing.sm,
                  alignItems: 'center' as const,
                })}
              >
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: { overflow: 'hidden', flexDirection: 'row' },
  headerAccent: { width: 5 },
  headerContent: { flex: 1 },
  editNameRow: { flexDirection: 'row', alignItems: 'center' },
  editNameInput: { minWidth: 100 },
  editNameTouchable: { flexDirection: 'row', alignItems: 'center' },
  accountName: {},
  accountMeta: {},
  statsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  statLabel: { marginBottom: 2 },
  statValue: { letterSpacing: -0.3 },
  quotesLoadingRow: { flexDirection: 'row', alignItems: 'center' },
  tabRow: { flexDirection: 'row', alignItems: 'center' },
  tabButton: { flex: 1, alignItems: 'center' },
  addButton: {},
  holdingRow: { overflow: 'hidden', flexDirection: 'row', padding: 0 },
  accentBar: { width: 4 },
  holdingContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  holdingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  tickerBadge: {},
  ticker: {},
  gainRow: { flexDirection: 'row', alignItems: 'center' },
  holdingRight: { alignItems: 'flex-end', gap: 4 },
  deleteButton: { paddingHorizontal: 6, paddingVertical: 4 },
});
