import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '@/constants/useTheme';

interface CalendarPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

function dateToString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CalendarPicker({ value, onChange }: CalendarPickerProps) {
  const { colors, borderRadius } = useTheme();

  const selectedStr = useMemo(() => dateToString(value), [value]);
  const todayStr = useMemo(() => dateToString(new Date()), []);

  const markedDates = useMemo(() => ({
    [selectedStr]: {
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: '#fff',
    },
  }), [selectedStr, colors.primary]);

  return (
    <View style={[styles.container, { borderRadius: borderRadius.lg, overflow: 'hidden' }]}>
      <Calendar
        current={selectedStr}
        onDayPress={(day: { dateString: string }) => {
          onChange(new Date(day.dateString + 'T12:00:00'));
        }}
        markedDates={markedDates}
        theme={{
          backgroundColor: colors.surface,
          calendarBackground: colors.surface,
          textSectionTitleColor: colors.textTertiary,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#fff',
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.textTertiary,
          monthTextColor: colors.text,
          arrowColor: colors.primary,
          textMonthFontWeight: '600',
          textDayFontSize: 14,
          textMonthFontSize: 15,
          textDayHeaderFontSize: 12,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
});
