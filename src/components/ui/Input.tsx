import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  KeyboardTypeOptions,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '@/constants/useTheme';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  error?: string;
  style?: StyleProp<ViewStyle>;
  onSubmitEditing?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onBlur?: () => void;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  multiline = false,
  error,
  style,
  onSubmitEditing,
  autoCapitalize,
  onBlur: onBlurProp,
}: InputProps) {
  const { isDark, colors, borderRadius, fontSize, fontWeight, spacing } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = (): string => {
    if (error) return colors.danger;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  const borderColor = getBorderColor();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: isFocused ? colors.primary : colors.textSecondary,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          {
            borderRadius: borderRadius.md,
            borderWidth: isFocused ? 1.5 : 1,
            borderColor,
            backgroundColor: colors.surface,
          },
          isFocused &&
            !isDark && {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 2,
            },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: fontSize.md,
              padding: spacing.md,
              outlineStyle: 'none',
            } as any,
            multiline && styles.multiline,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => { setIsFocused(false); onBlurProp?.(); }}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {error && (
        <Text
          style={[
            styles.error,
            { color: colors.danger, fontSize: fontSize.xs },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {},
  multiline: {
    minHeight: 100,
    paddingTop: 16,
  },
  error: {
    marginTop: 6,
  },
});
