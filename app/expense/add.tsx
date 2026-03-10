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
import { AmountInput, Button, Input, CategoryPicker } from '@/src/components/ui';
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
  const [showDateInput, setShowDateInput] = useState(false);
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
      Alert.alert('Error', 'Failed to save expense. Please try again.');
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
          {showDateInput ? (
            <View style={[styles.dateInputRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }]}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Input
                value={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`}
                onChangeText={(val) => {
                  const parsed = new Date(val + 'T12:00:00');
                  if (!isNaN(parsed.getTime())) setDate(parsed);
                }}
                placeholder="YYYY-MM-DD"
                style={{ flex: 1, borderWidth: 0, backgroundColor: 'transparent' }}
              />
              <Pressable onPress={() => setShowDateInput(false)}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowDateInput(true)}
              style={[styles.dateDisplay, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}
            >
              <Ionicons name="calendar" size={20} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>{formatDate(date)}</Text>
              {date.toDateString() === new Date().toDateString() && (
                <Text style={[styles.todayBadge, { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>Today</Text>
              )}
              {date > new Date() && (
                <Text style={[styles.todayBadge, { color: colors.subscription, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>Scheduled</Text>
              )}
            </Pressable>
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
  container: {
    flex: 1,
  },
  content: {},
  amountSection: {
    alignItems: 'center',
  },
  fieldSection: {},
  fieldLabel: {},
  errorText: {},
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    flex: 1,
  },
  todayBadge: {},
  actions: {
    marginTop: 8,
  },
  ghostButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {},
});
