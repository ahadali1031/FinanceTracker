import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AmountInput, Button, Input } from '@/src/components/ui';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatDate } from '@/src/utils/date';

export default function AddIncomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const addIncome = useIncomeStore((s) => s.addIncome);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [date] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.uid) return;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than zero.');
      return;
    }
    if (!source.trim()) {
      Alert.alert('No Source', 'Please enter an income source.');
      return;
    }

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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AmountInput label="Amount" value={amount} onChangeText={setAmount} />

        <Input
          label="Source"
          placeholder="e.g. Salary, Freelance, Dividends"
          value={source}
          onChangeText={setSource}
        />

        <Input
          label="Description"
          placeholder="Optional description"
          value={description}
          onChangeText={setDescription}
        />

        <Input
          label="Date"
          placeholder="Date"
          value={formatDate(date)}
          onChangeText={() => {}}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Recurring Income</Text>
          <Switch
            value={isRecurring}
            onValueChange={setIsRecurring}
            trackColor={{ false: isDark ? '#38383a' : '#d1d1d6', true: '#34c759' }}
            thumbColor="#fff"
          />
        </View>

        <View style={styles.actions}>
          <Button title="Save Income" onPress={handleSave} loading={saving} disabled={saving} />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
});
