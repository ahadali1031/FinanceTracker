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

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const showToast = useToastStore((s) => s.showToast);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [linking, setLinking] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        {/* Profile row */}
        <View style={[styles.profileRow, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, marginBottom: spacing.lg }]}>
          <Text style={[styles.displayName, { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
            {user?.displayName ?? 'Guest User'}
          </Text>
          <Text style={[styles.email, { color: colors.textSecondary, fontSize: fontSize.sm }]}>
            {user?.email || (user?.isAnonymous ? 'Signed in as guest' : 'No email')}
          </Text>
        </View>

        {/* Link Google Account — only for anonymous users */}
        {user?.isAnonymous && (
          <TouchableOpacity
            activeOpacity={0.6}
            onPress={handleLinkGoogle}
            disabled={linking}
            style={[styles.settingsRow, { backgroundColor: colors.primary + '12', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primary + '30', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md }]}
          >
            <View style={styles.settingsRowContent}>
              <Ionicons name="logo-google" size={20} color={colors.primary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
                  Link Google Account
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 }}>
                  Keep your data permanently
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

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
          onPress={handleSignOut}
          style={[styles.signOutButton, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xl }]}
        >
          <Text style={{ color: colors.danger, fontSize: fontSize.md, fontWeight: fontWeight.semibold }}>
            Sign Out
          </Text>
        </TouchableOpacity>

        {/* Guest warning */}
        {user?.isAnonymous && (
          <View style={[styles.guestWarning, { backgroundColor: colors.warning + '15', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.lg }]}>
            <Ionicons name="warning" size={18} color={colors.warning} style={{ marginRight: spacing.sm }} />
            <Text style={{ color: colors.warning, fontSize: fontSize.sm, flex: 1 }}>
              You're signed in as a guest. Your data will be lost if you sign out. Link a Google account to keep it.
            </Text>
          </View>
        )}

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
  guestWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footer: {
    textAlign: 'center',
  },
});
