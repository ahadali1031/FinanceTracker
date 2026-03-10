import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { AmountInput, Button, Input, CalendarPicker } from '@/src/components/ui';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatDate } from '@/src/utils/date';
import { useToastStore } from '@/src/stores/toastStore';

function FadeInView({ delay = 0, children, style }: { delay?: number; children: React.ReactNode; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export default function EditIncomeScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const { incomes, updateIncome, deleteIncome } = useIncomeStore();

  const income = incomes.find((i) => i.id === id);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; source?: string }>({});

  useEffect(() => {
    if (!income || initialized) return;
    setAmount(income.amount.toFixed(2));
    setSource(income.source);
    setDescription(income.description);
    setDate(income.date?.toDate?.() ?? new Date());
    setIsBusiness(income.isBusiness ?? false);
    setIsRecurring(income.isRecurring ?? false);
    setInitialized(true);
  }, [income, initialized]);

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
    if (!user?.uid || !id) return;
    if (!validate()) return;

    const parsedAmount = parseFloat(amount);
    setSaving(true);
    try {
      await updateIncome(user.uid, id, {
        amount: parsedAmount,
        source: source.trim(),
        description: description.trim(),
        date: Timestamp.fromDate(date),
        isBusiness,
        isRecurring,
      });
      showToast('Income updated');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update income. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!user?.uid || !id) return;
    Alert.alert('Delete Income', 'Are you sure you want to delete this income?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteIncome(user.uid, id);
            router.back();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete income.');
          }
        },
      },
    ]);
  };

  if (!income) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: fontSize.md, marginTop: spacing.md }]}>
          Loading income...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        {/* Hero amount */}
        <FadeInView delay={0}>
          <View style={[styles.amountSection, { marginBottom: spacing.lg }]}>
            <AmountInput label="Amount" value={amount} onChangeText={(val) => { setAmount(val); if (errors.amount) setErrors((e) => ({ ...e, amount: undefined })); }} />
            {errors.amount && (
              <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.amount}</Text>
            )}
          </View>
        </FadeInView>

        {/* Source */}
        <FadeInView delay={80}>
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
        </FadeInView>

        {/* Description */}
        <FadeInView delay={160}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
            <Input
              label="Description"
              placeholder="Optional description"
              value={description}
              onChangeText={setDescription}
            />
          </View>
        </FadeInView>

        {/* Date */}
        <FadeInView delay={240}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
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

        {/* Business toggle */}
        <FadeInView delay={320}>
          <View style={[styles.switchRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm }]}>
            <View style={styles.switchLabelWrap}>
              <Text style={[styles.switchLabel, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>Business Income</Text>
              <Text style={[styles.switchHint, { color: colors.textTertiary, fontSize: fontSize.xs }]}>Flag as business-related</Text>
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
        <FadeInView delay={400}>
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
        </FadeInView>

        {/* Actions */}
        <FadeInView delay={480}>
          <View style={[styles.actions, { gap: spacing.md }]}>
            <Button title="Save Changes" onPress={handleSave} loading={saving} disabled={saving} />
            <Button title="Delete Income" onPress={handleDelete} variant="danger" />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {},
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelWrap: { flex: 1, marginRight: 12 },
  switchLabel: {},
  switchHint: { marginTop: 2 },
  actions: { marginTop: 8 },
  ghostButton: { alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: {},
});
