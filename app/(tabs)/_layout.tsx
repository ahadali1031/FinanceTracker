import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { theme } from '@/constants/Colors';
import { AddActionSheet } from '@/src/components/AddActionSheet';

function AnimatedTabButton({ children, onPress, onLongPress, accessibilityRole, accessibilityState, style }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
  }, []);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const [showAddSheet, setShowAddSheet] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          animation: 'shift',
          tabBarActiveTintColor: colors.tint,
          tabBarInactiveTintColor: colors.tabIconDefault,
          tabBarLabelStyle: {
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.medium,
            marginTop: 2,
          },
          headerShown: true,
          headerStyle: {
            backgroundColor: isDark
              ? theme.colors.background.dark
              : theme.colors.background.light,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTintColor: isDark
            ? theme.colors.text.dark
            : theme.colors.text.light,
          headerTitleStyle: {
            fontWeight: theme.fontWeight.bold,
            fontSize: theme.fontSize.lg,
          },
          tabBarStyle: {
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: 16,
            height: 70,
            borderRadius: 20,
            paddingBottom: 8,
            paddingTop: 8,
            borderTopWidth: 0,
            ...(isDark
              ? {
                  backgroundColor: theme.colors.surface.dark + 'F0',
                  borderWidth: 1,
                  borderColor: theme.colors.border.dark,
                }
              : {
                  backgroundColor: theme.colors.surface.light + 'F5',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.1,
                  shadowRadius: 24,
                  elevation: 8,
                }),
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarButton: (props) => <AnimatedTabButton {...props} />,
            tabBarIcon: ({ color }) => (
              <Ionicons name="grid" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Transactions',
            tabBarButton: (props) => <AnimatedTabButton {...props} />,
            tabBarIcon: ({ color }) => (
              <Ionicons name="swap-horizontal" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
            tabBarButton: (props) => <AnimatedTabButton {...props} />,
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View
                style={[
                  styles.addButton,
                  {
                    backgroundColor: isDark
                      ? theme.colors.primaryLight
                      : theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}
              >
                <Ionicons name="add" size={30} color="#fff" />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowAddSheet(true);
            },
          }}
        />
        <Tabs.Screen
          name="investments"
          options={{
            title: 'Invest',
            tabBarButton: (props) => <AnimatedTabButton {...props} />,
            tabBarIcon: ({ color }) => (
              <Ionicons name="trending-up" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarButton: (props) => <AnimatedTabButton {...props} />,
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings" size={24} color={color} />
            ),
          }}
        />
        {/* Hidden tabs — accessible from dashboard cards */}
        <Tabs.Screen
          name="income"
          options={{
            title: 'Income',
            href: null,
            headerLeft: () => (
              <Pressable
                onPress={() => router.push('/')}
                style={{ marginLeft: 12 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={isDark ? theme.colors.text.dark : theme.colors.text.light}
                />
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="subscriptions"
          options={{
            title: 'Subscriptions',
            href: null,
            headerLeft: () => (
              <Pressable
                onPress={() => router.push('/')}
                style={{ marginLeft: 12 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={isDark ? theme.colors.text.dark : theme.colors.text.light}
                />
              </Pressable>
            ),
          }}
        />
      </Tabs>

      <AddActionSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
