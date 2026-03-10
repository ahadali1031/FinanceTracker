import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Animated,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { AmountInput, Button, Input, CategoryPicker, CalendarPicker } from '@/src/components/ui';
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { useAuthStore } from '@/src/stores/authStore';
import { SUBSCRIPTION_CATEGORIES } from '@/src/utils/categories';
import { formatDate } from '@/src/utils/date';
import { useToastStore } from '@/src/stores/toastStore';

function computeNextBillingDate(startDate: Date, frequency: 'monthly' | 'yearly'): Date {
  const now = new Date();
  const next = new Date(startDate);
  while (next <= now) {
    if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
    else next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

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

export default function SubscriptionDetailScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.showToast);
  const { subscriptions, updateSubscription, deleteSubscription } = useSubscriptionStore();

  const sub = useMemo(() => subscriptions.find((s) => s.id === id), [subscriptions, id]);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [showDateInput, setShowDateInput] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDateInput, setShowEndDateInput] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sub) return;
    setName(sub.name);
    setAmount(sub.amount.toFixed(2));
    setFrequency(sub.frequency);
    setCategory(sub.category);
    setStartDate(sub.startDate.toDate());
    setIsBusiness(sub.isBusiness ?? false);
    if (sub.endDate) {
      setHasEndDate(true);
      setEndDate(sub.endDate.toDate());
    }
  }, [sub]);

  const handleSave = async () => {
    if (!user?.uid || !id) return;
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0 || !name.trim() || !category) return;

    const nextBilling = computeNextBillingDate(startDate, frequency);

    setSaving(true);
    try {
      await updateSubscription(user.uid, id, {
        name: name.trim(),
        amount: parsed,
        frequency,
        category,
        startDate: Timestamp.fromDate(startDate),
        endDate: hasEndDate && endDate ? Timestamp.fromDate(endDate) : null,
        nextBillingDate: Timestamp.fromDate(nextBilling),
        isBusiness,
      });
      showToast('Subscription updated');
      router.back();
    } catch {
      if (Platform.OS === 'web') window.alert('Failed to update.');
      else Alert.alert('Error', 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!user?.uid || !id) return;
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${name}"?`)) {
        deleteSubscription(user.uid, id).then(() => router.back());
      }
    } else {
      Alert.alert('Delete Subscription', `Delete "${name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSubscription(user.uid, id).then(() => router.back()) },
      ]);
    }
  };

  if (!sub) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.md, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        {/* Amount */}
        <FadeInView delay={0}>
          <View style={[styles.amountSection, { marginBottom: spacing.lg }]}>
            <AmountInput label="Amount" value={amount} onChangeText={setAmount} />
          </View>
        </FadeInView>

        {/* Name */}
        <FadeInView delay={80}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
            <Input label="Subscription Name" value={name} onChangeText={setName} />
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
                <Text style={{ color: frequency === f ? '#fff' : colors.text, fontSize: fontSize.md, fontWeight: frequency === f ? fontWeight.semibold : fontWeight.normal }}>
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
          <CategoryPicker categories={[...SUBSCRIPTION_CATEGORIES]} selected={category} onSelect={setCategory} />
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
            onPress={() => setShowDateInput(!showDateInput)}
            style={[styles.dateDisplay, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showDateInput ? colors.primary : colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md }]}
          >
            <Ionicons name="calendar" size={20} color={showDateInput ? colors.primary : colors.textSecondary} />
            <Text style={[styles.dateText, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>{formatDate(startDate)}</Text>
            <Ionicons name={showDateInput ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
          </Pressable>
          {showDateInput && (
            <View style={{ marginTop: spacing.sm }}>
              <CalendarPicker value={startDate} onChange={(d) => { setStartDate(d); setShowDateInput(false); }} />
            </View>
          )}
        </View>

        </FadeInView>

        {/* End Date */}
        <FadeInView delay={460}>
        <View style={[styles.fieldSection, { marginBottom: spacing.lg }]}>
          <Pressable onPress={() => { setHasEndDate(!hasEndDate); if (!hasEndDate && !endDate) { const d = new Date(startDate); d.setFullYear(d.getFullYear() + 1); setEndDate(d); } }} style={[styles.optionalRow, { paddingVertical: spacing.sm }]}>
            <Ionicons name={hasEndDate ? 'checkbox' : 'square-outline'} size={22} color={hasEndDate ? colors.primary : colors.textTertiary} />
            <Text style={{ color: colors.text, fontSize: fontSize.md, marginLeft: spacing.sm }}>Set end date</Text>
          </Pressable>
          {hasEndDate && endDate && (
            <>
              <Pressable
                onPress={() => setShowEndDateInput(!showEndDateInput)}
                style={[styles.dateDisplay, { backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: showEndDateInput ? colors.primary : colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.md, marginTop: spacing.sm }]}
              >
                <Ionicons name="calendar" size={20} color={showEndDateInput ? colors.primary : colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }]}>{formatDate(endDate)}</Text>
                <Ionicons name={showEndDateInput ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
              </Pressable>
              {showEndDateInput && (
                <View style={{ marginTop: spacing.sm }}>
                  <CalendarPicker value={endDate} onChange={(d) => { setEndDate(d); setShowEndDateInput(false); }} />
                </View>
              )}
            </>
          )}
        </View>

        </FadeInView>

        {/* Actions */}
        <FadeInView delay={540}>
        <View style={[styles.actions, { gap: spacing.md }]}>
          <Button title="Save Changes" onPress={handleSave} loading={saving} disabled={saving} />
          <Pressable onPress={handleDelete} style={({ pressed }) => [styles.deleteRow, { opacity: pressed ? 0.6 : 1, paddingVertical: spacing.md }]}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={{ color: colors.danger, fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginLeft: spacing.sm }}>Delete Subscription</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.ghostButton, { opacity: pressed ? 0.6 : 1, paddingVertical: spacing.md }]}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>Cancel</Text>
          </Pressable>
        </View>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {},
  amountSection: { alignItems: 'center' },
  fieldSection: {},
  fieldLabel: {},
  freqRow: { flexDirection: 'row' },
  freqButton: { flex: 1, alignItems: 'center' },
  dateDisplay: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateText: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionalRow: { flexDirection: 'row', alignItems: 'center' },
  actions: { marginTop: 8 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  ghostButton: { alignItems: 'center', justifyContent: 'center' },
});
