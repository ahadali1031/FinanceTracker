import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { AmountInput, Button, Input, CategoryPicker, CalendarPicker, FadeInView } from '@/src/components/ui';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useAuthStore } from '@/src/stores/authStore';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import { formatDate } from '@/src/utils/date';
import { useToastStore } from '@/src/stores/toastStore';
import { suggestCategory, parseExpenseFromText } from '@/src/lib/gemini';

export default function AddExpenseScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const addExpense = useExpenseStore((s) => s.addExpense);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({});
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [quickAddText, setQuickAddText] = useState('');
  const [quickAddParsing, setQuickAddParsing] = useState(false);

  const handleQuickAdd = async () => {
    if (!quickAddText.trim() || quickAddParsing) return;
    setQuickAddParsing(true);
    try {
      const parsed = await parseExpenseFromText(quickAddText.trim());
      if (!parsed) {
        if (Platform.OS === 'web') window.alert('Could not parse. Try something like "$14.50 chipotle lunch".');
        else Alert.alert('Parse Error', 'Could not parse. Try something like "$14.50 chipotle lunch".');
        return;
      }
      setAmount(String(parsed.amount));
      setCategory(parsed.category);
      setDescription(parsed.description);
      setIsBusiness(parsed.isBusiness);
      if (parsed.date) setDate(new Date(parsed.date));
      setErrors({});
      setQuickAddText('');
    } catch {
      if (Platform.OS === 'web') window.alert('AI parsing failed. Fill in the form manually.');
      else Alert.alert('Error', 'AI parsing failed. Fill in the form manually.');
    } finally {
      setQuickAddParsing(false);
    }
  };

  const handleDescriptionBlur = async () => {
    if (category || !description.trim() || suggestingCategory) return;
    setSuggestingCategory(true);
    try {
      const suggested = await suggestCategory(description.trim());
      if (suggested && !category) {
        setCategory(suggested);
        if (errors.category) setErrors((e) => ({ ...e, category: undefined }));
      }
    } catch {
      // silently fail — user can still pick manually
    } finally {
      setSuggestingCategory(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { amount?: string; category?: string } = {};
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      newErrors.amount = 'Enter an amount greater than zero';
    }
    if (!category) {
      newErrors.category = 'Please select a category';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    if (!validate()) return;

    const parsedAmount = parseFloat(amount);
    setSaving(true);
    try {
      await addExpense(user.uid, {
        amount: parsedAmount,
        category,
        description: description.trim(),
        date: Timestamp.fromDate(date),
        isBusiness,
        isRecurring,
      });
      showToast('Expense added');
      router.back();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to save expense.');
      } else {
        Alert.alert('Error', 'Failed to save expense. Please try again.');
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
        {/* AI Quick Add */}
        <FadeInView delay={0}>
          <View style={[styles.quickAddBar, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: quickAddText.trim() ? colors.primary : colors.border, paddingHorizontal: spacing.md, marginBottom: spacing.lg }]}>
            <Ionicons name="flash" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
            <TextInput
              value={quickAddText}
              onChangeText={setQuickAddText}
              placeholder='"$14 chipotle lunch"'
              placeholderTextColor={colors.textTertiary}
              style={{ color: colors.text, fontSize: fontSize.sm, flex: 1, paddingVertical: spacing.sm, outlineStyle: 'none' } as any}
              onSubmitEditing={handleQuickAdd}
              returnKeyType="go"
              editable={!quickAddParsing}
            />
            {quickAddParsing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : quickAddText.trim().length > 0 ? (
              <Pressable onPress={handleQuickAdd} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="arrow-up-circle" size={24} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        </FadeInView>

        {/* Hero amount */}
        <FadeInView delay={0}>
          <View style={[styles.amountSection, { marginBottom: spacing.lg }]}>
            <AmountInput label="Amount" value={amount} onChangeText={(val) => { setAmount(val); if (errors.amount) setErrors((e) => ({ ...e, amount: undefined })); }} />
            {errors.amount && (
              <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.amount}</Text>
            )}
          </View>
        </FadeInView>

        {/* Category */}
        <FadeInView delay={80}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Category</Text>
            <CategoryPicker
              categories={[...EXPENSE_CATEGORIES]}
              selected={category}
              onSelect={(val) => { setCategory(val); if (errors.category) setErrors((e) => ({ ...e, category: undefined })); }}
            />
            {errors.category && (
              <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.category}</Text>
            )}
          </View>
        </FadeInView>

        {/* Description */}
        <FadeInView delay={160}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
            <Input
              label="Description"
              placeholder="What was this expense for?"
              value={description}
              onChangeText={setDescription}
              onBlur={handleDescriptionBlur}
            />
          </View>
        </FadeInView>

        {/* Business toggle */}
        <FadeInView delay={240}>
          <View style={[styles.switchRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>Business Expense</Text>
              <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }}>Flag as business-related</Text>
            </View>
            <Switch
              value={isBusiness}
              onValueChange={setIsBusiness}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={isBusiness ? colors.primary : '#fff'}
            />
          </View>
        </FadeInView>

        {/* Recurring toggle */}
        <FadeInView delay={320}>
          <View style={[styles.switchRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>Recurring Expense</Text>
              <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }}>Repeats monthly</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={isRecurring ? colors.primary : '#fff'}
            />
          </View>
        </FadeInView>

        {/* Date */}
        <FadeInView delay={400}>
          <View style={[styles.fieldSection, { marginBottom: spacing.lg }]}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Date</Text>
            <Pressable
              onPress={() => setShowCalendar(!showCalendar)}
              style={[styles.dateDisplay, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showCalendar ? colors.primary : colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}
            >
              <Ionicons name="calendar" size={20} color={showCalendar ? colors.primary : colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>{formatDate(date)}</Text>
              {date.toDateString() === new Date().toDateString() && (
                <View style={[styles.dateBadge, { backgroundColor: colors.primary + '15', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                  <Text style={[{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>Today</Text>
                </View>
              )}
              {date > new Date(new Date().setHours(23, 59, 59)) && (
                <View style={[styles.dateBadge, { backgroundColor: colors.subscription + '15', borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 }]}>
                  <Text style={[{ color: colors.subscription, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>Scheduled</Text>
                </View>
              )}
              <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
            </Pressable>
            {showCalendar && (
              <View style={{ marginTop: spacing.sm }}>
                <CalendarPicker
                  value={date}
                  onChange={(d) => {
                    setDate(d);
                    setShowCalendar(false);
                  }}
                />
              </View>
            )}
          </View>
        </FadeInView>

        {/* Actions */}
        <FadeInView delay={480}>
          <View style={[styles.actions, { gap: spacing.md }]}>
            <Button title="Save Expense" onPress={handleSave} loading={saving} disabled={saving} />
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
  quickAddBar: { flexDirection: 'row', alignItems: 'center' },
  amountSection: { alignItems: 'center' },
  fieldSection: {},
  fieldLabel: {},
  errorText: {},
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: { flex: 1 },
  dateBadge: {},
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { marginTop: 8 },
  ghostButton: { alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: {},
});
