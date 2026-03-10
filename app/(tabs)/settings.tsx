import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';
import { useTheme } from '@/constants/useTheme';

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const initial =
    user?.displayName?.[0]?.toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    '?';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        {/* Profile row */}
        <View style={[styles.profileRow, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.lg }]}>
          <Text style={[styles.displayName, { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
            {user?.displayName ?? 'Anonymous User'}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            {user?.email || 'No email'}
          </Text>
        </View>

        {/* Manage Budgets */}
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => router.push('/budget/' as any)}
          style={[styles.settingsRow, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}
        >
          <View style={styles.settingsRowContent}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold, flex: 1 }}>
              Manage Budgets
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={signOut}
          style={[styles.signOutButton, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xl }]}
        >
          <Text style={{ color: colors.danger, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
            Sign Out
          </Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
          Finance Tracker v1.0.0
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
    justifyContent: 'center',
  },
  profileRow: {
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '700',
  },
  profileText: {
    alignItems: 'center',
  },
  displayName: {
    marginBottom: 2,
    textAlign: 'center',
  },
  email: {},
  signOutButton: {
    alignItems: 'center',
  },
  settingsRow: {},
  settingsRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    textAlign: 'center',
  },
});

