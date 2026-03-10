import React, { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
} from 'react-native';
import { useTheme } from '@/constants/useTheme';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
}

function formatWithCommas(numStr: string): string {
  if (!numStr) return '';
  const parts = numStr.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts.length === 2) {
    return `${intPart}.${parts[1]}`;
  }
  return intPart;
}

export function AmountInput({ value, onChangeText, label }: AmountInputProps) {
  const { colors, fontSize, fontWeight, spacing } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = useMemo(() => formatWithCommas(value), [value]);

  const handleChangeText = useCallback(
    (text: string) => {
      // Strip commas and non-numeric chars (except . )
      const cleaned = text.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) return;
      if (parts[1] && parts[1].length > 2) return;
      onChangeText(cleaned);
    },
    [onChangeText],
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (!value) return;
    const num = parseFloat(value);
    if (isNaN(num)) {
      onChangeText('');
      return;
    }
    onChangeText(num.toFixed(2));
  }, [value, onChangeText]);

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: colors.textSecondary,
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
          styles.inputRow,
          {
            borderBottomWidth: isFocused ? 2 : 1.5,
            borderBottomColor: isFocused ? colors.primary : colors.border,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        <Text
          style={[
            styles.prefix,
            {
              color: colors.primary,
              fontSize: fontSize.hero,
              fontWeight: fontWeight.bold,
            },
          ]}
        >
          $
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontSize: fontSize.hero,
              fontWeight: fontWeight.bold,
            },
          ]}
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textTertiary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    alignItems: 'center',
  },
  label: {
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefix: {
    marginRight: 4,
  },
  input: {
    minWidth: 120,
    textAlign: 'center',
  },
});
