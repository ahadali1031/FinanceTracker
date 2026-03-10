import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  KeyboardTypeOptions,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface InputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  error?: string;
  style?: StyleProp<ViewStyle>;
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
}: InputProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme];

  const borderColor = error
    ? '#ff3b30'
    : isDark
      ? '#38383a'
      : '#d1d1d6';

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: isDark ? '#1c1c1e' : '#fff',
            borderColor,
          },
          multiline && styles.multiline,
        ]}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#636366' : '#a0a0a0'}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error && <Text style={styles.error}>{error}</Text>}
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  error: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
});
