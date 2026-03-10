import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/src/lib/firebase';
import { useAuthStore } from '@/src/stores/authStore';
import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, setUser, setLoading } = useAuthStore();

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          displayName: firebaseUser.displayName ?? null,
          photoURL: firebaseUser.photoURL ?? null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (user && segments[0] === 'login') {
      router.replace('/');
    }
  }, [user, loading, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="expense/add" options={{ presentation: 'modal', title: 'Add Expense', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="expense/[id]" options={{ title: 'Expense Details' }} />
        <Stack.Screen name="subscription/add" options={{ presentation: 'modal', title: 'Add Subscription', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="subscription/[id]" options={{ title: 'Edit Subscription' }} />
        <Stack.Screen name="income/add" options={{ presentation: 'modal', title: 'Add Income', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="investment/[accountId]" options={{ title: 'Investment Account' }} />
        <Stack.Screen name="investment/add-account" options={{ presentation: 'modal', title: 'Add Account', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="investment/add-transaction" options={{ presentation: 'modal', title: 'Add Transaction', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="savings/[id]" options={{ title: 'Savings Account' }} />
      </Stack>
    </ThemeProvider>
  );
}
