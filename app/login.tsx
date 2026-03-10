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
import { signInAnonymously, GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
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
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
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

export default function LoginScreen() {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(40)).current;
  const [signingIn, setSigningIn] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonSlide, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setSigningIn(true);
      signInWithCredential(auth, credential)
        .catch((error) => {
          const msg = error?.message ?? 'Google sign-in failed.';
          if (Platform.OS === 'web') {
            window.alert(msg);
          } else {
            Alert.alert('Sign-In Error', msg);
          }
        })
        .finally(() => setSigningIn(false));
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    if (Platform.OS === 'web') {
      // Use Firebase popup sign-in directly on web
      setSigningIn(true);
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (error: any) {
        if (error?.code !== 'auth/popup-closed-by-user') {
          window.alert(error?.message ?? 'Google sign-in failed.');
        }
      } finally {
        setSigningIn(false);
      }
    } else {
      // Use expo-auth-session on native
      promptAsync();
    }
  };

  const handleAnonymousSignIn = async () => {
    setSigningIn(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message);
      } else {
        Alert.alert('Sign-In Error', error.message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    title: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textTertiary,
      fontWeight: '400',
      letterSpacing: 0.2,
    },
    guestButton: {
      backgroundColor: 'transparent',
      paddingVertical: 16,
      borderRadius: 14,
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
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={styles.topSpacer} />

      {/* Decorative icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <Ionicons name="analytics" size={80} color={colors.income} />
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
        <AnimatedPressable onPress={handleGoogleSignIn} style={styles.googleButton} disabled={signingIn}>
          {signingIn ? (
            <ActivityIndicator color="#0A1F15" />
          ) : (
            <View style={styles.googleButtonContent}>
              <Ionicons name="logo-google" size={20} color="#0A1F15" style={{ marginRight: 10 }} />
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </View>
          )}
        </AnimatedPressable>

        <AnimatedPressable onPress={handleAnonymousSignIn} style={dynamicStyles.guestButton} disabled={signingIn}>
          <Text style={dynamicStyles.guestButtonText}>Continue as Guest</Text>
        </AnimatedPressable>
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
    marginBottom: 24,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
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
});
