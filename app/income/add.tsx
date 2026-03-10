import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { AmountInput, Button, Input, CalendarPicker } from '@/src/components/ui';
import { useIncomeStore } from '@/src/stores/incomeStore';
import { useAuthStore } from '@/src/stores/authStore';
import { formatDate } from '@/src/utils/date';

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

export default function AddIncomeScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const addIncome = useIncomeStore((s) => s.addIncome);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
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
        isBusiness,
      });
      router.back();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to save income.');
      } else {
        Alert.alert('Error', 'Failed to save income. Please try again.');
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
          <Button title="Save Income" onPress={handleSave} loading={saving} disabled={saving} />
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
