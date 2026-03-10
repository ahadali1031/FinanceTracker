import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';

interface SuccessToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export function SuccessToast({ message, visible, onHide, duration = 2500 }: SuccessToastProps) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 160 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -30, duration: 300, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.9, duration: 300, useNativeDriver: true }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, onHide, duration]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.income,
          borderRadius: borderRadius.lg,
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.md,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Ionicons name="checkmark-circle" size={20} color="#fff" />
      <Text style={[styles.text, { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginLeft: spacing.sm }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  text: {},
});
