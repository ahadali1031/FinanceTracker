import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/constants/useTheme';
import { Button } from './Button';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { colors, fontSize, fontWeight, spacing, borderRadius } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.primary + '12',
            borderRadius: borderRadius.full,
          },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text
        style={[
          styles.title,
          {
            color: colors.text,
            fontSize: fontSize.xl,
            fontWeight: fontWeight.bold,
          },
        ]}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[
            styles.subtitle,
            {
              color: colors.textSecondary,
              fontSize: fontSize.md,
            },
          ]}
        >
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.buttonWrapper}>
          <Button title={actionLabel} onPress={onAction} variant="primary" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 56,
  },
  iconCircle: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 72,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  buttonWrapper: {
    marginTop: 8,
  },
});
