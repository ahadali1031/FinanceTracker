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
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';
import { Button, Input, FadeInView } from '@/src/components/ui';
import { useInvestmentStore } from '@/src/stores/investmentStore';
import { useAuthStore } from '@/src/stores/authStore';
import { INVESTMENT_ACCOUNT_TYPES } from '@/src/utils/categories';
import type { InvestmentAccountType } from '@/src/types';

const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  brokerage: 'bar-chart',
  '401k': 'business',
  roth_ira: 'shield-checkmark',
  traditional_ira: 'shield',
  hsa: 'medkit',
};

export default function AddAccountScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const addAccount = useInvestmentStore((s) => s.addAccount);

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<InvestmentAccountType>('brokerage');
  const [institution, setInstitution] = useState('');
  const [employerMatch, setEmployerMatch] = useState('100');
  const [employerMatchCap, setEmployerMatchCap] = useState('11750');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSave = async () => {
    if (!user?.uid) return;

    // Auto-generate name from type if not provided
    const typeDef = INVESTMENT_ACCOUNT_TYPES.find((t) => t.id === accountType);
    const finalName = name.trim() || `${typeDef?.name ?? 'Investment'} Account`;

    setSaving(true);
    try {
      await addAccount(user.uid, {
        name: finalName,
        accountType,
        institution: institution.trim(),
        ...(accountType === '401k' && employerMatch ? { employerMatch: parseFloat(employerMatch) } : {}),
        ...(accountType === '401k' && employerMatchCap ? { employerMatchCap: parseFloat(employerMatchCap) } : {}),
      });
      router.back();
    } catch (error) {
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
            {INVESTMENT_ACCOUNT_TYPES.map((type) => {
              const selected = accountType === type.id;
              const iconName = ACCOUNT_TYPE_ICONS[type.id] ?? 'bar-chart';
              return (
                <Pressable
                  key={type.id}
                  onPress={() => setAccountType(type.id as InvestmentAccountType)}
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor: selected ? colors.investment + '15' : colors.surface,
                      borderRadius: borderRadius.md,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? colors.investment : colors.border,
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <Ionicons name={iconName as any} size={20} color={selected ? colors.investment : colors.textSecondary} />
                  <Text
                    style={{
                      color: selected ? colors.investment : colors.text,
                      fontSize: fontSize.sm,
                      fontWeight: selected ? fontWeight.semibold : fontWeight.normal,
                      marginLeft: spacing.sm,
                    }}
                  >
                    {type.name}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.investment} style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        </FadeInView>

        {/* Institution */}
        <FadeInView delay={300}>
        <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
          <Input
            label="Institution (optional)"
            placeholder="e.g. Fidelity, Vanguard, Schwab"
            value={institution}
            onChangeText={setInstitution}
          />
        </View>
        </FadeInView>

        {/* Employer Match — only for 401k */}
        {accountType === '401k' && (
          <FadeInView delay={350}>
          <View style={[styles.fieldSection, { marginBottom: spacing.md }]}>
            <Text style={[styles.fieldLabel, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginBottom: spacing.sm }]}>Employer Match</Text>
            <View style={[styles.matchRow, { gap: spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Match %"
                  placeholder="100"
                  value={employerMatch}
                  onChangeText={setEmployerMatch}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Annual Cap ($)"
                  placeholder="11750"
                  value={employerMatchCap}
                  onChangeText={setEmployerMatchCap}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: -8 }}>
              {employerMatch && employerMatchCap
                ? `Employer matches ${employerMatch}% of your contributions, up to $${Number(employerMatchCap).toLocaleString()}/year`
                : 'e.g. 100% match up to $11,750/year (50% of IRS limit)'}
            </Text>
          </View>
          </FadeInView>
        )}

        {/* Actions */}
        <FadeInView delay={accountType === '401k' ? 450 : 400}>
        <View style={[styles.actions, { gap: spacing.md }]}>
          <Button title="Create Account" onPress={handleSave} loading={saving} disabled={saving} />
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
  fieldSection: {},
  fieldLabel: {},
  errorText: {},
  typeGrid: {},
  matchRow: { flexDirection: 'row' },
  typeButton: { flexDirection: 'row', alignItems: 'center' },
  actions: { marginTop: 8 },
  ghostButton: { alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: {},
});
