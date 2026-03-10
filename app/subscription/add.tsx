import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { AmountInput, Button, Input, CategoryPicker, CalendarPicker, FadeInView } from '@/src/components/ui';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { useAuthStore } from '@/src/stores/authStore';
import { SUBSCRIPTION_CATEGORIES } from '@/src/utils/categories';
import { formatDate } from '@/src/utils/date';
import { useToastStore } from '@/src/stores/toastStore';

function computeNextBillingDate(startDate: Date, frequency: 'monthly' | 'yearly'): Date {
  const now = new Date();
  const next = new Date(startDate);

  while (next <= now) {
    if (frequency === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setFullYear(next.getFullYear() + 1);
    }
  }
  return next;
}

export default function AddSubscriptionScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const addSubscription = useSubscriptionStore((s) => s.addSubscription);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndCalendar, setShowEndCalendar] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; amount?: string; category?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Enter a subscription name';
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) newErrors.amount = 'Enter an amount greater than zero';
    if (!category) newErrors.category = 'Select a category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    if (!validate()) return;

    const parsedAmount = parseFloat(amount);
    const nextBilling = computeNextBillingDate(startDate, frequency);

    setSaving(true);
    try {
      await addSubscription(user.uid, {
        name: name.trim(),
        amount: parsedAmount,
        frequency,
        category,
        startDate: Timestamp.fromDate(startDate),
        endDate: hasEndDate && endDate ? Timestamp.fromDate(endDate) : null,
        isActive: true,
        nextBillingDate: Timestamp.fromDate(nextBilling),
        isBusiness,
      });
      showToast('Subscription added');
      router.back();
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert('Failed to save subscription.');
      } else {
        Alert.alert('Error', 'Failed to save subscription.');
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
        {/* Amount */}
        <FadeInView delay={0}>
          <View style={[styles.amountSection, { marginBottom: spacing.lg }]}>
            <AmountInput label="Amount" value={amount} onChangeText={(val) => { setAmount(val); if (errors.amount) setErrors((e) => ({ ...e, amount: undefined })); }} />
            {errors.amount && (
              <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.amount}</Text>
            )}
          </View>
        </FadeInView>

        {/* Name */}
        <FadeInView delay={80}>
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Input
            label="Subscription Name"
            placeholder="e.g. Netflix, Spotify, iCloud"
            value={name}
            onChangeText={(val) => { setName(val); if (errors.name) setErrors((e) => ({ ...e, name: undefined })); }}
          />
          {errors.name && (
            <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.name}</Text>
          )}
        </View>

        </FadeInView>

        {/* Frequency */}
        <FadeInView delay={160}>
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Frequency</Text>
          <View style={[styles.freqRow, { gap: spacing.sm }]}>
            {(['monthly', 'yearly'] as const).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                style={[
                  styles.freqButton,
                  {
                    backgroundColor: frequency === f ? colors.primary : colors.surface,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: frequency === f ? colors.primary : colors.border,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                  },
                ]}
              >
                <Text
                  style={{
                    color: frequency === f ? '#fff' : colors.text,
                    fontSize: fontSize.md,
                    fontWeight: frequency === f ? fontWeight.semibold : fontWeight.normal,
                  }}
                >
                  {f === 'monthly' ? 'Monthly' : 'Yearly'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        </FadeInView>

        {/* Category */}
        <FadeInView delay={240}>
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Category</Text>
          <CategoryPicker
            categories={[...SUBSCRIPTION_CATEGORIES]}
            selected={category}
            onSelect={(val) => { setCategory(val); if (errors.category) setErrors((e) => ({ ...e, category: undefined })); }}
          />
          {errors.category && (
            <Text style={[styles.errorText, { color: colors.danger, fontSize: fontSize.sm, marginTop: spacing.xs }]}>{errors.category}</Text>
          )}
        </View>

        </FadeInView>

        {/* Business toggle */}
        <FadeInView delay={300}>
          <View style={[styles.switchRow, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md }]}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>Business Subscription</Text>
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

        {/* Start Date */}
        <FadeInView delay={380}>
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Start Date</Text>
          <Pressable
            onPress={() => setShowCalendar(!showCalendar)}
            style={[styles.dateDisplay, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showCalendar ? colors.primary : colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}
          >
            <Ionicons name="calendar" size={20} color={showCalendar ? colors.primary : colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>{formatDate(startDate)}</Text>
            <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
          </Pressable>
          {showCalendar && (
            <View style={{ marginTop: spacing.sm }}>
              <CalendarPicker value={startDate} onChange={(d) => { setStartDate(d); setShowCalendar(false); }} />
            </View>
          )}
        </View>

        </FadeInView>

        {/* End Date (optional) */}
        <FadeInView delay={460}>
        <View style={[styles.fieldSection, { marginBottom: spacing.lg }]}>
          <Pressable
            onPress={() => {
              setHasEndDate(!hasEndDate);
              if (!hasEndDate && !endDate) {
                const d = new Date(startDate);
                d.setFullYear(d.getFullYear() + 1);
                setEndDate(d);
              }
            }}
            style={[styles.optionalRow, { paddingVertical: spacing.sm }]}
          >
            <Ionicons
              name={hasEndDate ? 'checkbox' : 'square-outline'}
              size={22}
              color={hasEndDate ? colors.primary : colors.textTertiary}
            />
            <Text style={[{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium, marginLeft: spacing.sm }]}>
              Set end date
            </Text>
          </Pressable>
          {hasEndDate && endDate && (
            <>
              <Pressable
                onPress={() => setShowEndCalendar(!showEndCalendar)}
                style={[styles.dateDisplay, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showEndCalendar ? colors.primary : colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.sm }]}
              >
                <Ionicons name="calendar" size={20} color={showEndCalendar ? colors.primary : colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>{formatDate(endDate)}</Text>
                <Ionicons name={showEndCalendar ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
              </Pressable>
              {showEndCalendar && (
                <View style={{ marginTop: spacing.sm }}>
                  <CalendarPicker value={endDate} onChange={(d) => { setEndDate(d); setShowEndCalendar(false); }} />
                </View>
              )}
            </>
          )}
        </View>

        </FadeInView>

        {/* Actions */}
        <FadeInView delay={540}>
          <View style={[styles.actions, { gap: spacing.md }]}>
            <Button title="Save Subscription" onPress={handleSave} loading={saving} disabled={saving} />
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
  freqRow: { flexDirection: 'row' },
  freqButton: { flex: 1, alignItems: 'center' },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionalRow: { flexDirection: 'row', alignItems: 'center' },
  actions: { marginTop: 8 },
  ghostButton: { alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: {},
});
