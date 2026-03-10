import React, { useRef } from 'react';
import {
  View,
  Pressable,
  ViewStyle,
  StyleProp,
  Animated,
} from 'react-native';
import { useTheme } from '@/constants/useTheme';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: CardVariant;
}

export function Card({ children, style, onPress, variant = 'default' }: CardProps) {
  const { isDark, colors, borderRadius, spacing, shadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.975,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 180,
    }).start();
  };

  const getVariantStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
    };

    switch (variant) {
      case 'elevated':
        return {
          ...base,
          backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
          ...(isDark
            ? { borderWidth: 1, borderColor: colors.border }
            : shadows.lg),
        };
      case 'outlined':
        return {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
        };
      default:
        return {
          ...base,
          ...(isDark
            ? { borderWidth: 1, borderColor: colors.border }
            : shadows.md),
        };
    }
  };

  const cardStyle = getVariantStyle();

  if (onPress) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          style={[cardStyle, style]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
