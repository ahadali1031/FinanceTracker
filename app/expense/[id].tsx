import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AmountInput, Button, Input, CategoryPicker } from '@/src/components/ui';
import { useExpenseStore } from '@/src/stores/expenseStore';
import { useAuthStore } from '@/src/stores/authStore';
import { EXPENSE_CATEGORIES } from '@/src/utils/categories';
import { formatDate } from '@/src/utils/date';

export default function EditExpenseScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const user = useAuthStore((s) => s.user);
  const { expenses, updateExpense, deleteExpense } = useExpenseStore();

  const expense = expenses.find((e) => e.id === id);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill form when expense loads
  useEffect(() => {
    if (expense && !initialized) {
      setAmount(expense.amount.toFixed(2));
      setCategory(expense.category);
      setDescription(expense.description);
      setDate(expense.date.toDate());
      setInitialized(true);
    }
  }, [expense, initialized]);

  const handleSave = async () => {
    if (!user?.uid || !id) return;

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
      await updateExpense(user.uid, id, {
        amount: parsedAmount,
        category,
        description: description.trim(),
        date: Timestamp.fromDate(date),
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update expense. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!user?.uid || !id) return;
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense(user.uid, id);
            router.back();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete expense.');
          }
        },
      },
    ]);
  };

  if (!expense) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading expense...</Text>
      </View>
    );
  }

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
        />

        <View style={styles.actions}>
          <Button title="Save Changes" onPress={handleSave} loading={saving} disabled={saving} />
          <Button title="Delete Expense" onPress={handleDelete} variant="danger" />
          <Button title="Cancel" onPress={() => router.back()} variant="secondary" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
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
  actions: {
    marginTop: 24,
    gap: 12,
  },
});
