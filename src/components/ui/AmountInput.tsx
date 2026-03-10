import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
}

export function AmountInput({ value, onChangeText, label }: AmountInputProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];

  const handleChangeText = useCallback(
    (text: string) => {
      // Allow only digits and a single decimal point
      const cleaned = text.replace(/[^0-9.]/g, '');
      const parts = cleaned.split('.');
      if (parts.length > 2) return;
      // Limit to 2 decimal places while typing
      if (parts[1] && parts[1].length > 2) return;
      onChangeText(cleaned);
    },
    [onChangeText],
  );

  const handleBlur = useCallback(() => {
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
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: isDark ? '#1c1c1e' : '#fff',
            borderColor: isDark ? '#38383a' : '#d1d1d6',
          },
        ]}
      >
        <Text style={[styles.prefix, { color: colors.text }]}>$</Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={handleChangeText}
          onBlur={handleBlur}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={isDark ? '#636366' : '#a0a0a0'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  prefix: {
    fontSize: 20,
    fontWeight: '600',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    paddingVertical: 12,
  },
});
