import React, { useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  View,
  Animated,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/constants/useTheme';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CategoryPickerProps {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}

function CategoryChip({
  category,
  isSelected,
  onSelect,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const { isDark, colors, borderRadius, fontSize, fontWeight, spacing } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const chipStyle: ViewStyle = isSelected
    ? {
        backgroundColor: colors.primary,
        ...(isDark
          ? {}
          : {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 3,
            }),
      }
    : {
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
      };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.chip,
          { borderRadius: borderRadius.xl, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md },
          chipStyle,
        ]}
        onPress={() => onSelect(category.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Text style={[styles.icon, { fontSize: fontSize.xl }]}>{category.icon}</Text>
        <Text
          style={[
            styles.label,
            {
              color: isSelected ? '#FFFFFF' : colors.text,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.semibold,
            },
          ]}
        >
          {category.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function CategoryPicker({
  categories,
  selected,
  onSelect,
}: CategoryPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {categories.map((category) => (
        <CategoryChip
          key={category.id}
          category={category}
          isSelected={category.id === selected}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  label: {
    letterSpacing: 0.2,
  },
});
