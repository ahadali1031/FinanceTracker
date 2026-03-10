import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { AmountInput, Button, Input } from '@/src/components/ui';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatDate } from '@/src/utils/date';

export default function AddIncomeScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const addIncome = useIncomeStore((s) => s.addIncome);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [date] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; source?: string }>({});

  const validate = (): boolean => {
    const newErrors: { amount?: string; source?: string } = {};
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      newErrors.amount = 'Enter an amount greater than zero';
    }
    if (!source.trim()) {
      newErrors.source = 'Please enter an income source';
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
      await addIncome(user.uid, {
        amount: parsedAmount,
        source: source.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(date),
        isRecurring,
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save income. Please try again.');
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

        {/* Source */}
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Input
            label="Source"
            placeholder="e.g. Salary, Freelance, Dividends"
            value={source}
            onChangeText={(val) => { setSource(val); if (errors.source) setErrors((e) => ({ ...e, source: undefined })); }}
          />
          {errors.source && (
            <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.source}</Text>
          )}
        </View>

        {/* Description */}
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Input
            label="Description"
            placeholder="Optional description"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Date */}
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Date</Text>
          <Pressable style={[styles.dateDisplay, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}>
            <Ionicons name="calendar" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>{formatDate(date)}</Text>
            <Text style={[styles.todayBadge, { color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.semibold }]}>Today</Text>
          </Pressable>
        </View>

        {/* Recurring toggle */}
        <View style={[styles.switchRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.lg }]}>
          <View style={styles.switchLabelWrap}>
            <Text style={[styles.switchLabel, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>Recurring Income</Text>
            <Text style={[styles.switchHint, { color: colors.textTertiary, fontSize: fontSize.xs }]}>Repeats every month</Text>
          </View>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: colors.border, true: colors.income }}
            thumbColor="#fff"
          />
        </View>

        {/* Actions */}
        <View style={[styles.actions, { gap: spacing.md }]}>
          <Button title="Save Income" onPress={handleSave} loading={saving} disabled={saving} />
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
  dateEmoji: {},
  dateText: {
    flex: 1,
  },
  todayBadge: {},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelWrap: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {},
  switchHint: {
    marginTop: 2,
  },
  actions: {
    marginTop: 8,
  },
  ghostButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {},
});
