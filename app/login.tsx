import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  signInAnonymously,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  linkWithCredential,
  linkWithPopup,
} from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/constants/useTheme';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;

function AnimatedPressable({
  onPress,
  style,
  children,
  disabled,
}: {
  onPress: () => void;
  style: any;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 10,
      stiffness: 180,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }, disabled && { opacity: 0.6 }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

function getFriendlyAuthError(error: any): string | null {
  const code = error?.code;
  if (code === 'auth/popup-closed-by-user') return null;
  if (code === 'auth/cancelled-popup-request') return null;
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a moment and try again.';
  if (code === 'auth/credential-already-in-use') return 'This Google account is already linked to another user.';
  return 'Sign-in failed. Please try again.';
}

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0.3)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(40)).current;
  // Decorative circles
  const circle1 = useRef(new Animated.Value(0)).current;
  const circle2 = useRef(new Animated.Value(0)).current;
  const circle3 = useRef(new Animated.Value(0)).current;
  const [signingIn, setSigningIn] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    // Animate decorative circles first
    Animated.stagger(150, [
      Animated.spring(circle1, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 80 }),
      Animated.spring(circle2, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 80 }),
      Animated.spring(circle3, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 80 }),
    ]).start();

    // Main content
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 10,
          stiffness: 100,
        }),
        Animated.timing(iconRotate, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 180,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(buttonSlide, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 180,
        }),
      ]),
    ]).start();
  }, []);

  // Handle Google auth response (native)
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setSigningIn(true);
      signInWithCredential(auth, credential)
        .catch((error) => {
          const msg = getFriendlyAuthError(error);
          if (msg) {
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Sign-In Error', msg);
          }
        })
        .finally(() => setSigningIn(false));
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    if (Platform.OS === 'web') {
      setSigningIn(true);
      try {
        const provider = new GoogleAuthProvider();
        if (auth.currentUser?.isAnonymous) {
          await linkWithPopup(auth.currentUser, provider);
        } else {
          await signInWithPopup(auth, provider);
        }
      } catch (error: any) {
        if (error?.code === 'auth/credential-already-in-use') {
          try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
          } catch (innerError: any) {
            const msg = getFriendlyAuthError(innerError);
            if (msg) window.alert(msg);
          }
        } else {
          const msg = getFriendlyAuthError(error);
          if (msg) window.alert(msg);
        }
      } finally {
        setSigningIn(false);
      }
    } else {
      promptAsync();
    }
  };

  const handleAnonymousSignIn = async () => {
    setSigningIn(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      const msg = getFriendlyAuthError(error) ?? 'Failed to continue as guest.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Sign-In Error', msg);
    } finally {
      setSigningIn(false);
    }
  };

  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingHorizontal: 32,
      overflow: 'hidden',
    },
    title: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textTertiary,
      fontWeight: '400',
      letterSpacing: 0.1,
    },
    guestButton: {
      backgroundColor: 'transparent',
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    guestButtonText: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    guestHint: {
      color: colors.textTertiary,
      fontSize: 12,
      textAlign: 'center',
      marginTop: 12,
      lineHeight: 18,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Decorative background circles */}
      <Animated.View
        style={[
          styles.decorCircle,
          styles.decorCircle1,
          {
            backgroundColor: colors.primary + '08',
            opacity: circle1,
            transform: [{ scale: circle1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.decorCircle,
          styles.decorCircle2,
          {
            backgroundColor: colors.primary + '06',
            opacity: circle2,
            transform: [{ scale: circle2 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.decorCircle,
          styles.decorCircle3,
          {
            backgroundColor: colors.primary + '04',
            opacity: circle3,
            transform: [{ scale: circle3 }],
          },
        ]}
      />

      <View style={styles.topSpacer} />

      {/* Decorative icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.primary + '12',
            opacity: fadeAnim,
            transform: [{ scale: iconScale }, { rotate: spin }],
          },
        ]}
      >
        <Ionicons name="analytics" size={48} color={colors.primary} />
      </Animated.View>

      {/* Title and subtitle */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={dynamicStyles.title}>Finance Tracker</Text>
        <Text style={dynamicStyles.subtitle}>Track your money, grow your wealth</Text>
      </Animated.View>

      <View style={styles.flexSpacer} />

      {/* Buttons */}
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: buttonFade,
            transform: [{ translateY: buttonSlide }],
          },
        ]}
      >
        <AnimatedPressable onPress={handleGoogleSignIn} style={[styles.googleButton, isDark && styles.googleButtonDark]} disabled={signingIn}>
          {signingIn ? (
            <ActivityIndicator color={isDark ? '#fff' : '#0A1F15'} />
          ) : (
            <View style={styles.googleButtonContent}>
              <Ionicons name="logo-google" size={20} color={isDark ? '#fff' : '#0A1F15'} style={{ marginRight: 10 }} />
              <Text style={[styles.googleButtonText, isDark && { color: '#fff' }]}>Sign in with Google</Text>
            </View>
          )}
        </AnimatedPressable>

        <AnimatedPressable onPress={handleAnonymousSignIn} style={dynamicStyles.guestButton} disabled={signingIn}>
          <Text style={dynamicStyles.guestButtonText}>Continue as Guest</Text>
        </AnimatedPressable>
        <Text style={dynamicStyles.guestHint}>
          Guest data is temporary. Sign in with Google to keep your data.
        </Text>
      </Animated.View>

      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topSpacer: {
    flex: 1.2,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  header: {
    alignItems: 'center',
  },
  flexSpacer: {
    flex: 2,
  },
  buttonContainer: {
    width: '100%',
    gap: 14,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  googleButtonDark: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
    shadowOpacity: 0,
    elevation: 0,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#0A1F15',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 60,
  },
  // Decorative circles
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -80,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    top: 120,
    left: -60,
  },
  decorCircle3: {
    width: 250,
    height: 250,
    bottom: 80,
    right: -80,
  },
});
