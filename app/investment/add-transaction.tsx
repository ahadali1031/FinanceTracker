import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/constants/useTheme';
import { AmountInput, Button, Input, CalendarPicker } from '@/src/components/ui';
import { useInvestmentStore } from '@/src/stores/investmentStore';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatDate } from '@/src/utils/date';
import { searchSymbol } from '@/src/lib/stock-api';
import type { SymbolSearchResult } from '@/src/lib/stock-api';
import type { InvestmentTransactionType } from '@/src/types';
import { useToastStore } from '@/src/stores/toastStore';

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

function getTransactionTypes(colors: any): { id: InvestmentTransactionType; label: string; icon: string; color: string }[] {
  return [
    { id: 'buy', label: 'Buy', icon: 'arrow-down-circle', color: colors.income },
    { id: 'sell', label: 'Sell', icon: 'arrow-up-circle', color: colors.expense },
    { id: 'dividend', label: 'Dividend', icon: 'cash', color: colors.warning },
  ];
}

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  brokerage: 'bar-chart',
  '401k': 'business',
  roth_ira: 'shield-checkmark',
  traditional_ira: 'shield',
  hsa: 'medkit',
};

export default function AddTransactionScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const TRANSACTION_TYPES = useMemo(() => getTransactionTypes(colors), [colors]);
  const router = useRouter();
  const { accountId: paramAccountId, accountName } = useLocalSearchParams<{ accountId?: string; accountName?: string }>();

  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const { accounts, transactions, addTransaction, addHolding, subscribeToAccounts, subscribeToTransactions } = useInvestmentStore();
  const { addExpense } = useExpenseStore();

  const [selectedAccountId, setSelectedAccountId] = useState(paramAccountId ?? '');
  const accountId = paramAccountId || selectedAccountId;
  const selectedAccount = useMemo(() => accounts.find((a) => a.id === accountId), [accounts, accountId]);
  const is401k = selectedAccount?.accountType === '401k';

  // Compute YTD employer match total to enforce annual cap
  const ytdMatchTotal = useMemo(() => {
    const txs = transactions.get(accountId) ?? [];
    const currentYear = new Date().getFullYear();
    return txs
      .filter((t) => t.type === 'employer_match' && t.date.toDate().getFullYear() === currentYear)
      .reduce((sum, t) => sum + t.totalAmount, 0);
  }, [transactions, accountId]);

  const remainingCap = selectedAccount?.employerMatchCap
    ? Math.max(0, selectedAccount.employerMatchCap - ytdMatchTotal)
    : Infinity;

  // Subscribe to accounts if we need to pick one
  useEffect(() => {
    if (!paramAccountId && user?.uid) {
      const unsub = subscribeToAccounts(user.uid);
      return unsub;
    }
  }, [user?.uid, paramAccountId]);

  // Subscribe to transactions for the selected account (needed for YTD match calc)
  useEffect(() => {
    if (user?.uid && accountId) {
      const unsub = subscribeToTransactions(user.uid, accountId);
      return unsub;
    }
  }, [user?.uid, accountId]);

  const [txType, setTxType] = useState<InvestmentTransactionType>('buy');
  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [pricePerShare, setPricePerShare] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ ticker?: string; shares?: string; price?: string; amount?: string }>({});
  const [isReinvested, setIsReinvested] = useState(false);
  const [isTransfer, setIsTransfer] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SymbolSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    const query = ticker.trim();
    if (!query) return;
    setSearching(true);
    try {
      const results = await searchSymbol(query);
      setSearchResults(results);
      setShowResults(true);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSymbol = (symbol: string) => {
    setTicker(symbol);
    setShowResults(false);
    setSearchResults([]);
    if (errors.ticker) setErrors((e) => ({ ...e, ticker: undefined }));
  };

  // Auto-calculate total when shares and price change
  const computedTotal = (() => {
    const s = parseFloat(shares);
    const p = parseFloat(pricePerShare);
    if (!isNaN(s) && !isNaN(p) && s > 0 && p > 0) return s * p;
    return 0;
  })();

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!ticker.trim()) newErrors.ticker = 'Enter a ticker symbol';

    if (txType === 'dividend') {
      const amt = parseFloat(totalAmount);
      if (!amt || amt <= 0) newErrors.amount = 'Enter the dividend amount';
    } else {
      const s = parseFloat(shares);
      if (!s || s <= 0) newErrors.shares = 'Enter number of shares';
      const p = parseFloat(pricePerShare);
      if (!p || p <= 0) newErrors.price = 'Enter price per share';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.uid || !accountId) return;
    if (!validate()) return;

    const parsedShares = parseFloat(shares) || 0;
    const parsedPrice = parseFloat(pricePerShare) || 0;
    const finalTotal = txType === 'dividend' ? parseFloat(totalAmount) : parsedShares * parsedPrice;

    setSaving(true);
    try {
      const tickerUpper = ticker.trim().toUpperCase();
      const txDate = Timestamp.fromDate(date);

      // Add the transaction
      const writes: Promise<void>[] = [
        addTransaction(user.uid, accountId, {
          ticker: tickerUpper,
          type: txType,
          shares: parsedShares,
          pricePerShare: parsedPrice,
          totalAmount: finalTotal,
          date: txDate,
          ...(txType === 'dividend' && { isReinvested }),
          ...((txType === 'buy' || txType === 'sell') && { isTransfer }),
        }),
      ];

      // For buy transactions, also add/update the holding
      if (txType === 'buy') {
        writes.push(addHolding(user.uid, accountId, {
          ticker: tickerUpper,
          shares: parsedShares,
          costBasis: finalTotal,
        }));

        // Auto-generate employer match for 401k accounts
        if (is401k && selectedAccount?.employerMatch && selectedAccount?.employerMatchCap) {
          const matchRate = selectedAccount.employerMatch / 100;
          const cappedMatch = Math.min(finalTotal * matchRate, remainingCap);

          if (cappedMatch > 0) {
            const matchShares = cappedMatch / parsedPrice;
            writes.push(
              addTransaction(user.uid, accountId, {
                ticker: tickerUpper,
                type: 'employer_match',
                shares: matchShares,
                pricePerShare: parsedPrice,
                totalAmount: cappedMatch,
                date: txDate,
              }),
              addHolding(user.uid, accountId, {
                ticker: tickerUpper,
                shares: matchShares,
                costBasis: cappedMatch,
              }),
            );
          }
        }
      }

      // For reinvested dividends, add shares as a holding too
      if (txType === 'dividend' && isReinvested && parsedPrice > 0) {
        const reinvestedShares = finalTotal / parsedPrice;
        writes.push(addHolding(user.uid, accountId, {
          ticker: tickerUpper,
          shares: reinvestedShares,
          costBasis: finalTotal,
        }));
      }

      // Auto-create transfer expense for checking balance
      if (isTransfer && txType === 'buy') {
        writes.push(addExpense(user.uid, {
          amount: finalTotal,
          category: 'transfer',
          description: `Transfer to ${selectedAccount?.name ?? 'investment'} — ${tickerUpper}`,
          date: txDate,
          isTransfer: true,
          transferTo: accountId,
        }));
      }
      // For sell with transfer, we'd add income — but sells adding to checking is handled differently

      await Promise.all(writes);

      showToast('Transaction saved');
      router.back();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to save transaction.');
      } else {
        Alert.alert('Error', 'Failed to save transaction.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        {/* Account selector */}
        {paramAccountId ? (
          accountName && (
            <View style={[styles.accountBadge, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md }]}>
              <Ionicons name="business-outline" size={16} color={colors.investment} />
              <Text style={[{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginLeft: spacing.sm }]}>
                {accountName}
              </Text>
            </View>
          )
        ) : (
          <FadeInView delay={0}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Investment Account</Text>
            {accounts.length === 0 ? (
              <Pressable
                onPress={() => router.push('/investment/add-account' as any)}
                style={[styles.accountBadge, { backgroundColor: colors.investment + '15', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.investment, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginBottom: spacing.sm }]}
              >
                <Ionicons name="add-circle" size={20} color={colors.investment} />
                <Text style={{ color: colors.investment, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: spacing.sm }}>
                  Create an account first
                </Text>
              </Pressable>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {accounts.map((acc) => {
                  const selected = selectedAccountId === acc.id;
                  const iconName = ACCOUNT_TYPE_ICONS[acc.accountType] ?? 'bar-chart';
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => setSelectedAccountId(acc.id)}
                      style={[
                        styles.accountPickerItem,
                        {
                          backgroundColor: selected ? colors.investment + '15' : colors.surface,
                          borderRadius: borderRadius.md,
                          borderWidth: selected ? 2 : 1,
                          borderColor: selected ? colors.investment : colors.border,
                          paddingVertical: spacing.md,
                          paddingHorizontal: spacing.md,
                        },
                      ]}
                    >
                      <Ionicons name={iconName as any} size={20} color={selected ? colors.investment : colors.textSecondary} />
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={{ color: selected ? colors.investment : colors.text, fontSize: fontSize.sm, fontWeight: selected ? fontWeight.semibold : fontWeight.normal }}>
                          {acc.name}
                        </Text>
                        {acc.institution ? (
                          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>{acc.institution}</Text>
                        ) : null}
                      </View>
                      {selected && <Ionicons name="checkmark-circle" size={18} color={colors.investment} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
          </FadeInView>
        )}

        {/* Transaction Type */}
        <FadeInView delay={100}>
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Type</Text>
          <View style={[styles.typeRow, { gap: spacing.sm }]}>
            {TRANSACTION_TYPES.map((type) => {
              const selected = txType === type.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => setTxType(type.id)}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: selected ? type.color + '15' : colors.surface,
                      borderRadius: borderRadius.md,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? type.color : colors.border,
                      paddingVertical: spacing.md,
                    },
                  ]}
                >
                  <Ionicons name={type.icon as any} size={20} color={selected ? type.color : colors.textSecondary} />
                  <Text
                    style={{
                      color: selected ? type.color : colors.text,
                      fontSize: fontSize.sm,
                      fontWeight: selected ? fontWeight.semibold : fontWeight.normal,
                      marginTop: 4,
                    }}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        </FadeInView>

        {/* Ticker */}
        <FadeInView delay={200}>
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Ticker Symbol</Text>
          <View style={[styles.searchRow, { gap: spacing.sm }]}>
            <View style={{ flex: 1 }}>
              <Input
                placeholder="e.g. AAPL, FXAIX, BTC"
                value={ticker}
                onChangeText={(val) => { const clean = val.replace(/[^A-Za-z]/g, '').toUpperCase(); setTicker(clean); setShowResults(false); if (errors.ticker) setErrors((e) => ({ ...e, ticker: undefined })); }}
                onSubmitEditing={handleSearch}
                autoCapitalize="characters"
                style={{ marginBottom: 0 }}
              />
            </View>
            <Pressable
              onPress={handleSearch}
              style={({ pressed }) => [
                styles.searchButton,
                {
                  backgroundColor: pressed ? colors.investment + '30' : colors.investment + '15',
                  borderRadius: borderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.investment,
                  paddingHorizontal: spacing.md,
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 48,
                },
              ]}
            >
              {searching ? (
                <ActivityIndicator size="small" color={colors.investment} />
              ) : (
                <Ionicons name="search" size={20} color={colors.investment} />
              )}
            </Pressable>
          </View>
          {errors.ticker && (
            <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.ticker}</Text>
          )}
          {showResults && (
            <View style={[styles.searchResults, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm }]}>
              {searchResults.length === 0 ? (
                <View style={[styles.searchResultItem, { padding: spacing.md }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>No results found</Text>
                </View>
              ) : (
                searchResults.slice(0, 8).map((result, index) => (
                  <Pressable
                    key={`${result.symbol}-${index}`}
                    onPress={() => handleSelectSymbol(result.symbol)}
                    style={({ pressed }) => [
                      styles.searchResultItem,
                      {
                        padding: spacing.md,
                        backgroundColor: pressed ? colors.border + '50' : 'transparent',
                        borderBottomWidth: index < Math.min(searchResults.length, 8) - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.searchResultLeft}>
                      <Text style={{ color: colors.investment, fontSize: fontSize.md, fontWeight: fontWeight.bold }}>
                        {result.symbol}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }} numberOfLines={1}>
                        {result.name}
                      </Text>
                    </View>
                    <View style={[styles.searchResultBadge, { backgroundColor: colors.border + '50', borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                      <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>
                        {result.type}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>
        </FadeInView>

        <FadeInView delay={300}>
        {txType === 'dividend' ? (
          <>
            {/* Dividend amount */}
            <View style={[styles.amountSection, { marginBottom: spacing.md }]}>
              <AmountInput
                label="Dividend Amount"
                value={totalAmount}
                onChangeText={(val) => { setTotalAmount(val); if (errors.amount) setErrors((e) => ({ ...e, amount: undefined })); }}
              />
              {errors.amount && (
                <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.amount}</Text>
              )}
            </View>

            {/* DRIP toggle */}
            <View style={[styles.switchRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>Reinvested (DRIP)</Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>Dividend was used to buy more shares</Text>
              </View>
              <Switch
                value={isReinvested}
                onValueChange={setIsReinvested}
                trackColor={{ false: colors.border, true: colors.investment + '60' }}
                thumbColor={isReinvested ? colors.investment : colors.textSecondary}
              />
            </View>

            {/* If reinvested, need price per share to calculate shares added */}
            {isReinvested && (
              <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
                <AmountInput
                  label="Price per Share (at reinvestment)"
                  value={pricePerShare}
                  onChangeText={setPricePerShare}
                />
              </View>
            )}
          </>
        ) : (
          <>
            {/* Shares */}
            <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
              <Input
                label="Number of Shares"
                placeholder="e.g. 10, 0.5"
                value={shares}
                onChangeText={(val) => { const clean = val.replace(/[^0-9.]/g, ''); setShares(clean); if (errors.shares) setErrors((e) => ({ ...e, shares: undefined })); }}
                keyboardType="decimal-pad"
              />
              {errors.shares && (
                <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.shares}</Text>
              )}
            </View>

            {/* Price per share */}
            <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
              <AmountInput
                label="Price per Share"
                value={pricePerShare}
                onChangeText={(val) => { setPricePerShare(val); if (errors.price) setErrors((e) => ({ ...e, price: undefined })); }}
              />
              {errors.price && (
                <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.price}</Text>
              )}
            </View>

            {/* Computed total */}
            {computedTotal > 0 && (
              <View style={[styles.totalRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md }]}>
                <Text style={[{ color: colors.textSecondary, fontSize: fontSize.sm }]}>Total</Text>
                <Text style={[{ color: colors.investment, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
                  ${computedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            )}
          </>
        )}
        </FadeInView>

        {/* Transfer from Checking toggle — for buy/sell */}
        {(txType === 'buy' || txType === 'sell') && (
          <FadeInView delay={350}>
            <View style={[styles.switchRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>
                  {txType === 'buy' ? 'Transfer from Checking' : 'Transfer to Checking'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                  {txType === 'buy' ? 'Deducts from your checking balance' : 'Adds to your checking balance'}
                </Text>
              </View>
              <Switch
                value={isTransfer}
                onValueChange={setIsTransfer}
                trackColor={{ false: colors.border, true: colors.investment + '60' }}
                thumbColor={isTransfer ? colors.investment : colors.textSecondary}
              />
            </View>
            {is401k && txType === 'buy' && selectedAccount?.employerMatch && (
              <View style={[styles.matchPreview, { backgroundColor: colors.income + '10', borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.income + '30', padding: spacing.md, marginBottom: spacing.md }]}>
                <Ionicons name="gift" size={18} color={colors.income} />
                <Text style={{ color: colors.income, fontSize: fontSize.sm, marginLeft: spacing.sm, flex: 1 }}>
                  Employer matches {selectedAccount.employerMatch}%{selectedAccount.employerMatchCap ? ` — $${remainingCap.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining this year` : ''}
                  {computedTotal > 0 && ` — +$${Math.min(computedTotal * (selectedAccount.employerMatch / 100), remainingCap).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} match`}
                </Text>
              </View>
            )}
          </FadeInView>
        )}

        {/* Date */}
        <FadeInView delay={txType === 'dividend' ? 400 : 450}>
        <View style={[styles.fieldSection, { marginBottom: spacing.lg }]}>
          <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Date</Text>
          <Pressable
            onPress={() => setShowCalendar(!showCalendar)}
            style={[styles.dateDisplay, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showCalendar ? colors.primary : colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}
          >
            <Ionicons name="calendar" size={20} color={showCalendar ? colors.primary : colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>{formatDate(date)}</Text>
            <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
          </Pressable>
          {showCalendar && (
            <View style={{ marginTop: spacing.sm }}>
              <CalendarPicker value={date} onChange={(d) => { setDate(d); setShowCalendar(false); }} />
            </View>
          )}
        </View>
        </FadeInView>

        {/* Actions */}
        <FadeInView delay={txType === 'dividend' ? 500 : 550}>
        <View style={[styles.actions, { gap: spacing.md }]}>
          <Button
            title={txType === 'dividend' ? 'Record Dividend' : txType === 'buy' ? 'Record Purchase' : 'Record Sale'}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ghostButton, { opacity: pressed ? 0.6 : 1, paddingVertical: spacing.md }]}
          >
            <Text style={[styles.ghostButtonText, { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>Cancel</Text>
          </Pressable>
        </View>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  accountBadge: { flexDirection: 'row', alignItems: 'center' },
  accountPickerItem: { flexDirection: 'row', alignItems: 'center' },
  fieldSection: {},
  fieldLabel: {},
  amountSection: { alignItems: 'center' },
  errorText: {},
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchButton: {},
  searchResults: { maxHeight: 300, overflow: 'hidden' },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchResultLeft: { flex: 1, marginRight: 8 },
  searchResultBadge: {},
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  matchPreview: { flexDirection: 'row', alignItems: 'center' },
  typeRow: { flexDirection: 'row' },
  typeButton: { flex: 1, alignItems: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { flex: 1 },
  actions: { marginTop: 8 },
  ghostButton: { alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: {},
});
