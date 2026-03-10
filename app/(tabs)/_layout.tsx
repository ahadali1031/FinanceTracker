import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { theme } from '@/constants/Colors';
import { AddActionSheet } from '@/src/components/AddActionSheet';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];
  const [showAddSheet, setShowAddSheet] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
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
            tabBarIcon: ({ color }) => (
              <Ionicons name="grid" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Transactions',
            tabBarIcon: ({ color }) => (
              <Ionicons name="swap-horizontal" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: '',
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
            tabBarIcon: ({ color }) => (
              <Ionicons name="trending-up" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings" size={24} color={color} />
            ),
          }}
        />
        {/* Hide subscriptions from tab bar — accessible from dashboard/action sheet */}
        <Tabs.Screen
          name="subscriptions"
          options={{
            title: 'Subscriptions',
            href: null,
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
