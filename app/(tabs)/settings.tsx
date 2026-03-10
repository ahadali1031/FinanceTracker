import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleAuthProvider, linkWithPopup, linkWithCredential } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/src/stores/authStore';
import { useTheme } from '@/constants/useTheme';
import { useToastStore } from '@/src/stores/toastStore';
import { GuideModal } from '@/src/components/ui';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;

function SettingsRow({
  icon,
  iconColor,
  label,
  subtitle,
  onPress,
  colors,
  fontSize,
  fontWeight,
  borderRadius,
  spacing,
  isDark,
  shadows,
  isLast,
  disabled,
  rightElement,
}: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => {
          Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, damping: 15, stiffness: 200 }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }).start();
        }}
        style={[
          styles.settingsRow,
          {
            backgroundColor: colors.surface,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            ...(isLast ? {} : { borderBottomWidth: 1, borderBottomColor: colors.border + '40' }),
          },
        ]}
      >
        <View style={[styles.settingsIconBg, { backgroundColor: (iconColor || colors.primary) + '12', borderRadius: borderRadius.md }]}>
          <Ionicons name={icon} size={18} color={iconColor || colors.primary} />
        </View>
        <View style={styles.settingsRowText}>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.medium }}>{label}</Text>
          {subtitle && (
            <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 2 }}>{subtitle}</Text>
          )}
        </View>
        {rightElement || <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { colors, spacing, borderRadius, fontSize, fontWeight, isDark, shadows } = useTheme();
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [linking, setLinking] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }),
    ]).start();
  }, []);

  // Handle Google link response (native)
  useEffect(() => {
    if (response?.type === 'success' && auth.currentUser?.isAnonymous) {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLinking(true);
      linkWithCredential(auth.currentUser, credential)
        .then(() => showToast('Account linked to Google'))
        .catch((error) => {
          const msg = error?.code === 'auth/credential-already-in-use'
            ? 'This Google account is already linked to another user.'
            : 'Failed to link account. Please try again.';
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert('Link Error', msg);
        })
        .finally(() => setLinking(false));
    }
  }, [response]);

  const handleLinkGoogle = async () => {
    if (!auth.currentUser?.isAnonymous) return;

    if (Platform.OS === 'web') {
      setLinking(true);
      try {
        const provider = new GoogleAuthProvider();
        await linkWithPopup(auth.currentUser, provider);
        showToast('Account linked to Google');
      } catch (error: any) {
        if (error?.code !== 'auth/popup-closed-by-user') {
          const msg = error?.code === 'auth/credential-already-in-use'
            ? 'This Google account is already linked to another user.'
            : 'Failed to link account. Please try again.';
          window.alert(msg);
        }
      } finally {
        setLinking(false);
      }
    } else {
      promptAsync();
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      if (Platform.OS === 'web') window.alert('Failed to sign out. Please try again.');
      else Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.isAnonymous ? 'G' : '?';

  const themeProps = { colors, fontSize, fontWeight, borderRadius, spacing, isDark, shadows };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* Profile section */}
        <View style={[styles.profileSection, { marginBottom: spacing.lg }]}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: colors.primary + '18',
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primary, fontWeight: fontWeight.bold, fontSize: fontSize.xxl }]}>
              {initials}
            </Text>
          </View>
          <Text style={[styles.displayName, { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
            {user?.displayName ?? 'Guest User'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            {user?.email || (user?.isAnonymous ? 'Signed in as guest' : 'No email')}
          </Text>
        </View>

        {/* Guest warning */}
        {user?.isAnonymous && (
          <View style={[styles.guestWarning, { backgroundColor: colors.warning + '10', borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.warning + '20' }]}>
            <Ionicons name="warning" size={18} color={colors.warning} style={{ marginRight: spacing.sm }} />
            <Text style={{ color: colors.warning, fontSize: fontSize.sm, flex: 1, lineHeight: 20 }}>
              You're signed in as a guest. Your data will be lost if you sign out. Link a Google account to keep it.
            </Text>
          </View>
        )}

        {/* Settings card */}
        <View style={[
          styles.settingsCard,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            marginBottom: spacing.md,
            ...(isDark ? { borderWidth: 1, borderColor: colors.border } : shadows.md),
          },
        ]}>
          {/* Link Google Account */}
          {user?.isAnonymous && (
            <SettingsRow
              icon="logo-google"
              iconColor={colors.primary}
              label="Link Google Account"
              subtitle="Keep your data permanently"
              onPress={handleLinkGoogle}
              disabled={linking}
              {...themeProps}
            />
          )}

          {/* How to Use */}
          <SettingsRow
            icon="help-circle-outline"
            iconColor={colors.investment}
            label="How to Use"
            subtitle="Learn how the app works"
            onPress={() => setGuideVisible(true)}
            {...themeProps}
          />

          {/* Manage Budgets */}
          <SettingsRow
            icon="wallet-outline"
            label="Manage Budgets"
            subtitle="Set spending limits"
            onPress={() => router.push('/budget/' as any)}
            {...themeProps}
          />

          {/* Manage Savings */}
          <SettingsRow
            icon="shield-checkmark-outline"
            iconColor={colors.savings}
            label="Savings Accounts"
            subtitle="Track your savings goals"
            onPress={() => router.push('/savings/' as any)}
            isLast
            {...themeProps}
          />
        </View>

        {/* Danger zone */}
        <View style={[
          styles.settingsCard,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            overflow: 'hidden',
            marginBottom: spacing.xl,
            ...(isDark ? { borderWidth: 1, borderColor: colors.border } : shadows.md),
          },
        ]}>
          <SettingsRow
            icon="log-out-outline"
            iconColor={colors.danger}
            label="Sign Out"
            onPress={handleSignOut}
            isLast
            rightElement={null}
            {...themeProps}
          />
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
          Finance Tracker v1.0.0
        </Text>
      </Animated.View>

      <GuideModal visible={guideVisible} onClose={() => setGuideVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 20,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {},
  displayName: {
    marginBottom: 4,
    textAlign: 'center',
  },
  settingsCard: {},
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconBg: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowText: {
    flex: 1,
  },
  guestWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footer: {
    textAlign: 'center',
  },
});
