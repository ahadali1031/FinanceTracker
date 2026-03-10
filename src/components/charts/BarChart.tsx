import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { useTheme } from '@/constants/useTheme';
import { formatCurrency } from '@/src/utils/currency';

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  barColor?: string;
}

/**
 * Vertical bar chart built with React Native Animated Views.
 * Bars grow from the bottom on mount. Labels appear on top and below.
 */
export function BarChart({ data, height = 160, barColor }: BarChartProps) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const animProgress = useRef(new Animated.Value(0)).current;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, []);

  if (data.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Bars area */}
      <View style={[styles.barsRow, { height, gap: spacing.xs }]}>
        {data.map((item, i) => {
          const ratio = item.value / maxValue;
          const color = item.color ?? barColor ?? colors.primary;
          const barHeight = animProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, ratio * height * 0.85],
          });

          return (
            <View key={`${item.label}-${i}`} style={styles.barCol}>
              {/* Value label */}
              <Text
                style={[
                  styles.valueLabel,
                  {
                    color: colors.textSecondary,
                    fontSize: fontSize.xs,
                    fontWeight: fontWeight.medium,
                  },
                ]}
                numberOfLines={1}
              >
                {item.value >= 1000
                  ? `$${(item.value / 1000).toFixed(1)}k`
                  : formatCurrency(item.value)}
              </Text>

              {/* Bar */}
              <View style={styles.barWrapper}>
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: color,
                      borderTopLeftRadius: borderRadius.sm,
                      borderTopRightRadius: borderRadius.sm,
                    },
                  ]}
                />
              </View>

              {/* X-axis label */}
              <Text
                style={[
                  styles.xLabel,
                  {
                    color: colors.textTertiary,
                    fontSize: fontSize.xs,
                  },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  valueLabel: {
    marginBottom: 4,
    textAlign: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    minHeight: 2,
  },
  xLabel: {
    marginTop: 6,
    textAlign: 'center',
  },
});
