import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.danger + '15',
          borderColor: colors.danger + '30',
          borderRadius: borderRadius.md,
          marginHorizontal: spacing.md,
          marginTop: spacing.sm,
          padding: spacing.md,
        },
      ]}
    >
      <Ionicons name="alert-circle" size={20} color={colors.danger} style={{ marginRight: spacing.sm }} />
      <Text
        style={[
          styles.message,
          { color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
        ]}
        numberOfLines={2}
      >
        {message}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: colors.danger,
              borderRadius: borderRadius.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: 4,
              opacity: pressed ? 0.7 : 1,
              marginLeft: spacing.sm,
            },
          ]}
        >
          <Text style={{ color: '#fff', fontSize: fontSize.xs, fontWeight: fontWeight.semibold }}>
            Retry
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  message: {
    flex: 1,
  },
  retryButton: {},
});
