import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(iconScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 12,
          stiffness: 120,
        }),
      ]),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Animated.View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.primary + '10',
            borderRadius: borderRadius.full,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <Ionicons name={icon as any} size={44} color={colors.primary + '60'} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY }] }}>
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
      </Animated.View>
      {actionLabel && onAction && (
        <View style={styles.buttonWrapper}>
          <Button title={actionLabel} onPress={onAction} variant="primary" />
        </View>
      )}
    </Animated.View>
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
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
