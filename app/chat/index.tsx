import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { useSavingsStore } from '@/src/stores/savingsStore';
import { useInvestmentStore } from '@/src/stores/investmentStore';
import { useBudgetStore } from '@/src/stores/budgetStore';
import { askFinancialQuestion, type ChatMessage } from '@/src/lib/gemini';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';

const SUGGESTIONS = [
  'How much did I spend on food this month?',
  'What\'s my savings rate?',
  'Compare my spending this month vs last month',
  'What are my biggest expenses?',
  'How much do I spend on subscriptions?',
];

function TypingIndicator({ colors }: { colors: any }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createAnim = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ])
      );

    const a1 = createAnim(dot1, 0);
    const a2 = createAnim(dot2, 200);
    const a3 = createAnim(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={[styles.typingContainer, { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border }]}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            { backgroundColor: colors.primary, opacity: dot },
          ]}
        />
      ))}
    </View>
  );
}

export default function ChatScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight, isDark, shadows } = useTheme();

  const user = useAuthStore((s) => s.user);
  const expenses = useExpenseStore((s) => s.expenses);
  const incomes = useIncomeStore((s) => s.incomes);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const { getTotalSavings } = useSavingsStore();
  const { accounts: investmentAccounts, holdings: investmentHoldings } = useInvestmentStore();
  const budgetTargets = useBudgetStore((s) => s.targets);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const dataContext = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const prevDate = new Date(curYear, curMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();

    let curExpTotal = 0;
    let prevExpTotal = 0;
    let allTimeExp = 0;
    const curCats: Record<string, number> = {};
    const prevCats: Record<string, number> = {};

    for (const e of expenses) {
      const d = e.date.toDate();
      const y = d.getFullYear();
      const m = d.getMonth();
      allTimeExp += e.amount;
      if (y === curYear && m === curMonth) {
        curExpTotal += e.amount;
        const catName = EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.name ?? e.category;
        curCats[catName] = (curCats[catName] ?? 0) + e.amount;
      } else if (y === prevYear && m === prevMonth) {
        prevExpTotal += e.amount;
        const catName = EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.name ?? e.category;
        prevCats[catName] = (prevCats[catName] ?? 0) + e.amount;
      }
    }

    let curIncTotal = 0;
    let prevIncTotal = 0;
    let allTimeInc = 0;
    for (const i of incomes) {
      const d = i.date.toDate();
      allTimeInc += i.amount;
      if (d.getFullYear() === curYear && d.getMonth() === curMonth) curIncTotal += i.amount;
      else if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) prevIncTotal += i.amount;
    }

    let monthlySubTotal = 0;
    const subList: string[] = [];
    for (const s of subscriptions) {
      if (!s.isActive) continue;
      const monthly = s.frequency === 'monthly' ? s.amount : s.amount / 12;
      monthlySubTotal += monthly;
      subList.push(`${s.name}: $${monthly.toFixed(0)}/mo`);
    }

    const budgetLines: string[] = [];
    for (const t of budgetTargets) {
      let spent = 0;
      for (const e of expenses) {
        if (e.category !== t.category) continue;
        const d = e.date.toDate();
        if (d.getFullYear() === curYear && d.getMonth() === curMonth) spent += e.amount;
      }
      const catName = EXPENSE_CATEGORIES.find((c) => c.id === t.category)?.name ?? t.category;
      budgetLines.push(`${catName}: $${spent.toFixed(0)} / $${t.monthlyLimit.toFixed(0)}`);
    }

    let investTotal = 0;
    const holdingsList: string[] = [];
    for (const acct of investmentAccounts) {
      const h = investmentHoldings.get(acct.id) ?? [];
      let acctTotal = 0;
      for (const holding of h) {
        acctTotal += holding.costBasis;
        holdingsList.push(`${holding.ticker}: ${holding.shares} shares, cost $${holding.costBasis.toFixed(0)}`);
      }
      investTotal += acctTotal;
    }

    const savings = getTotalSavings();
    const checking = allTimeInc - allTimeExp;

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    return `Financial Data:

Current month (${monthNames[curMonth]} ${curYear}):
- Income: $${curIncTotal.toFixed(0)}
- Expenses: $${curExpTotal.toFixed(0)}
- Expenses by category: ${Object.entries(curCats).map(([k, v]) => `${k}: $${v.toFixed(0)}`).join(', ') || 'none yet'}

Previous month (${monthNames[prevMonth]} ${prevYear}):
- Income: $${prevIncTotal.toFixed(0)}
- Expenses: $${prevExpTotal.toFixed(0)}
- Expenses by category: ${Object.entries(prevCats).map(([k, v]) => `${k}: $${v.toFixed(0)}`).join(', ') || 'none'}

Active subscriptions ($${monthlySubTotal.toFixed(0)}/mo total):
${subList.length > 0 ? subList.join('\n') : 'None'}

Budget targets this month:
${budgetLines.length > 0 ? budgetLines.join('\n') : 'No budget targets set'}

Overall balances:
- Checking: $${checking.toFixed(0)}
- Savings: $${savings.toFixed(0)}
- Investments: $${investTotal.toFixed(0)} (cost basis)
- Net worth: $${(checking + savings + investTotal).toFixed(0)}

${holdingsList.length > 0 ? `Investment holdings:\n${holdingsList.join('\n')}` : ''}`;
  }, [expenses, incomes, subscriptions, budgetTargets, investmentAccounts, investmentHoldings, getTotalSavings]);

  const sendMessage = useCallback(async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: question };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const answer = await askFinancialQuestion(question, dataContext, newMessages);
      if (answer) {
        setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, dataContext]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, {
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        backgroundColor: isUser ? colors.primary : colors.surface,
        borderRadius: borderRadius.lg,
        borderBottomRightRadius: isUser ? 4 : borderRadius.lg,
        borderBottomLeftRadius: isUser ? borderRadius.lg : 4,
        maxWidth: '82%',
        padding: spacing.md,
        marginBottom: spacing.sm,
        marginHorizontal: spacing.md,
        ...(isUser
          ? (isDark ? {} : shadows.colored(colors.primary))
          : isDark
            ? { borderWidth: 1, borderColor: colors.border }
            : shadows.sm),
      }]}>
        <Text style={{
          color: isUser ? '#fff' : colors.text,
          fontSize: fontSize.sm,
          lineHeight: 21,
        }}>
          {item.text}
        </Text>
      </View>
    );
  }, [colors, spacing, borderRadius, fontSize, isDark, shadows]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.sm, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={[styles.emptyState, { padding: spacing.lg }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.primary + '10', borderRadius: borderRadius.full }]}>
              <Ionicons name="chatbubbles-outline" size={40} color={colors.primary + '60'} />
            </View>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: spacing.md }}>
              Ask me anything
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20 }}>
              I can answer questions about your spending,{'\n'}income, budget, and more.
            </Text>
            <View style={{ marginTop: spacing.lg, width: '100%' }}>
              {SUGGESTIONS.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => sendMessage(s)}
                  style={({ pressed }) => [styles.suggestion, {
                    backgroundColor: pressed ? colors.primary + '10' : colors.surface,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: pressed ? colors.primary + '30' : colors.border,
                    padding: spacing.sm + 2,
                    paddingHorizontal: spacing.md,
                    marginBottom: spacing.sm - 2,
                  }]}
                >
                  <Ionicons name="chatbubble-outline" size={14} color={colors.primary} style={{ marginRight: spacing.sm }} />
                  <Text style={{ color: colors.text, fontSize: fontSize.sm, flex: 1 }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Typing indicator */}
      {loading && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xs }}>
          <TypingIndicator colors={colors} />
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: spacing.sm,
        paddingHorizontal: spacing.md,
      }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your finances..."
          placeholderTextColor={colors.textTertiary}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSize.sm,
            paddingVertical: spacing.sm + 2,
            paddingHorizontal: spacing.md,
            backgroundColor: colors.background,
            borderRadius: borderRadius.full,
            borderWidth: 1,
            borderColor: colors.border,
            outlineStyle: 'none',
          } as any}
          onSubmitEditing={() => sendMessage()}
          returnKeyType="send"
          editable={!loading}
          multiline={false}
        />
        <Pressable
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          style={({ pressed }) => [{
            marginLeft: spacing.sm,
            opacity: (!input.trim() || loading) ? 0.3 : pressed ? 0.6 : 1,
          }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={[styles.sendButton, { backgroundColor: colors.primary, borderRadius: borderRadius.full }]}>
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </View>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIconBg: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  suggestion: { flexDirection: 'row', alignItems: 'center' },
  messageBubble: {},
  inputBar: { flexDirection: 'row', alignItems: 'center' },
  sendButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  typingContainer: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    marginLeft: 16,
    marginBottom: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
