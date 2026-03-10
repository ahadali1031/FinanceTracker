import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AmountInput, Button, Input, CategoryPicker } from '@/src/components/ui';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useAuthStore } from '@/src/stores/authStore';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import { formatDate } from '@/src/utils/date';

export default function AddExpenseScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const addExpense = useExpenseStore((s) => s.addExpense);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.uid) return;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!category) {
      Alert.alert('No Category', 'Please select a category.');
      return;
    }

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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AmountInput label="Amount" value={amount} onChangeText={setAmount} />

        <Text style={[styles.fieldLabel, { color: colors.text }]}>Category</Text>
        <CategoryPicker
          categories={[...EXPENSE_CATEGORIES]}
          selected={category}
          onSelect={setCategory}
        />

        <Input
          label="Description"
          placeholder="What was this expense for?"
          value={description}
          onChangeText={setDescription}
        />

        <Input
          label="Date"
          placeholder="Date"
          value={formatDate(date)}
          onChangeText={() => {}}
          style={styles.dateInput}
        />

        <View style={styles.actions}>
          <Button title="Save Expense" onPress={handleSave} loading={saving} disabled={saving} />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  dateInput: {
    marginTop: 0,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    marginTop: 0,
  },
});
