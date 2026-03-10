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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { Button, Input, FadeInView } from '@/src/components/ui';
import { useSavingsStore } from '@/src/stores/savingsStore';
import { useAuthStore } from '@/src/stores/authStore';

const ACCOUNT_TYPES = [
  { id: 'savings', name: 'Savings Account', icon: 'wallet' },
  { id: 'high_yield', name: 'High-Yield Savings', icon: 'trending-up' },
  { id: 'checking', name: 'Checking Account', icon: 'card' },
  { id: 'money_market', name: 'Money Market', icon: 'cash' },
  { id: 'cd', name: 'Certificate of Deposit', icon: 'lock-closed' },
  { id: 'emergency', name: 'Emergency Fund', icon: 'shield-checkmark' },
] as const;

export default function AddSavingsAccountScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addAccount = useSavingsStore((s) => s.addAccount);

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState('savings');
  const [institution, setInstitution] = useState('');
  const [saving, setSaving] = useState(false);

  const isEmergencyFund = accountType === 'emergency';

  const handleSave = async () => {
    if (!user?.uid) return;

    const typeDef = ACCOUNT_TYPES.find((t) => t.id === accountType);
    const finalName = name.trim() || `${typeDef?.name ?? 'Savings'} Account`;

    setSaving(true);
    try {
      await addAccount(user.uid, {
        name: finalName,
        institution: institution.trim(),
        isEmergencyFund,
      } as any);
      router.back();
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Failed to create account.');
      } else {
        Alert.alert('Error', 'Failed to create account.');
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
        {/* Account Name */}
        <FadeInView delay={100}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
            <Input
              label="Account Name (optional)"
              placeholder="Auto-generated from type if empty"
              value={name}
              onChangeText={setName}
            />
          </View>
        </FadeInView>

        {/* Account Type */}
        <FadeInView delay={200}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Account Type</Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((type) => {
                const selected = accountType === type.id;
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => setAccountType(type.id)}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: selected ? colors.savings + '15' : colors.surface,
                        borderRadius: borderRadius.md,
                        borderWidth: selected ? 2 : 1,
                        borderColor: selected ? colors.savings : colors.border,
                        paddingVertical: spacing.md,
                        paddingHorizontal: spacing.md,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    <Ionicons name={type.icon as any} size={20} color={selected ? colors.savings : colors.textSecondary} />
                    <Text
                      style={{
                        color: selected ? colors.savings : colors.text,
                        fontSize: fontSize.sm,
                        fontWeight: selected ? fontWeight.semibold : fontWeight.normal,
                        marginLeft: spacing.sm,
                      }}
                    >
                      {type.name}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.savings} style={{ marginLeft: 'auto' }} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </FadeInView>

        {/* Institution */}
        <FadeInView delay={300}>
          <View style={[styles.fieldSection, { marginBottom: spacing.lg }]}>
            <Input
              label="Institution (optional)"
              placeholder="e.g. Marcus, Ally Bank, Capital One"
              value={institution}
              onChangeText={setInstitution}
            />
          </View>
        </FadeInView>

        {/* Actions */}
        <FadeInView delay={400}>
          <View style={[styles.actions, { gap: spacing.md }]}>
            <Button title="Create Account" onPress={handleSave} loading={saving} disabled={saving} />
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [styles.ghostButton, { opacity: pressed ? 0.6 : 1, paddingVertical: spacing.md }]}
            >
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
  content: {},
  fieldSection: {},
  fieldLabel: {},
  typeGrid: {},
  typeButton: { flexDirection: 'row', alignItems: 'center' },
  actions: { marginTop: 8 },
  ghostButton: { alignItems: 'center', justifyContent: 'center' },
});
