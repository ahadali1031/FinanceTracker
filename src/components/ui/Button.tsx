import React, { useRef } from 'react';
import {
  StyleSheet,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: string;
  iconSize?: number;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  icon,
  iconSize = 18,
}: ButtonProps) {
  const { isDark, colors, borderRadius, fontSize, fontWeight, spacing, shadows } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
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

  const getBackgroundColor = (): string => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.surfaceElevated;
      case 'danger':
        return colors.danger;
      case 'ghost':
        return 'transparent';
    }
  };

  const getTextColor = (): string => {
    if (disabled) return colors.textTertiary;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return colors.text;
      case 'danger':
        return '#FFFFFF';
      case 'ghost':
        return colors.primary;
    }
  };

  const textColor = getTextColor();

  const getShadowStyle = (): ViewStyle => {
    if (variant === 'primary' && !disabled && !isDark) {
      return shadows.colored(colors.primary) as ViewStyle;
    }
    return {};
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.button,
          {
            backgroundColor: getBackgroundColor(),
            borderRadius: borderRadius.md,
          },
          variant === 'ghost' && { paddingHorizontal: spacing.sm },
          getShadowStyle(),
          style,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <View style={styles.content}>
            {icon && (
              <Ionicons
                name={icon as any}
                size={iconSize}
                color={textColor}
                style={{ marginRight: spacing.sm }}
              />
            )}
            <Text
              style={[
                styles.text,
                {
                  color: textColor,
                  fontSize: fontSize.md,
                  fontWeight: fontWeight.semibold,
                },
              ]}
            >
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    letterSpacing: 0.3,
  },
});
