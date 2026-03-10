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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { AmountInput, Button, Input, CategoryPicker, CalendarPicker } from '@/src/components/ui';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useAuthStore } from '@/src/stores/authStore';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import { formatDate } from '@/src/utils/date';

export default function AddExpenseScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const addExpense = useExpenseStore((s) => s.addExpense);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; category?: string }>({});

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
      });
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
        {/* Hero amount */}
        <View style={[styles.amountSection, { marginBottom: spacing.lg }]}>
          <AmountInput label="Amount" value={amount} onChangeText={(val) => { setAmount(val); if (errors.amount) setErrors((e) => ({ ...e, amount: undefined })); }} />
          {errors.amount && (
            <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.amount}</Text>
          )}
        </View>

        {/* Category */}
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

        {/* Description */}
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Input
            label="Description"
            placeholder="What was this expense for?"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Date */}
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

        {/* Actions */}
        <View style={[styles.actions, { gap: spacing.md }]}>
          <Button title="Save Expense" onPress={handleSave} loading={saving} disabled={saving} />
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ghostButton, { opacity: pressed ? 0.6 : 1, paddingVertical: spacing.md }]}
          >
            <Text style={[styles.ghostButtonText, { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }]}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
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
  actions: { marginTop: 8 },
  ghostButton: { alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: {},
});
