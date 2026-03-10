import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated } from 'react-native';
import { useTheme } from '@/constants/useTheme';
import { formatCurrency } from '@/src/utils/currency';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

/**
 * Donut chart built with pure React Native Views.
 * Uses a stacked horizontal bar as the ring (since SVG is unavailable),
 * with a legend below showing each category.
 */
export function DonutChart({
  data,
  size: _size,
  strokeWidth: _strokeWidth,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const animProgress = useRef(new Animated.Value(0)).current;

  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  // Sort descending so largest segments show first
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Center info */}
      {(centerLabel || centerValue) && (
        <View style={[styles.centerInfo, { marginBottom: spacing.sm }]}>
          {centerLabel && (
            <Text style={[styles.centerLabel, { color: colors.textSecondary, fontSize: fontSize.xs }]}>
              {centerLabel}
            </Text>
          )}
          {centerValue && (
            <Text style={[styles.centerValue, { color: colors.text, fontSize: fontSize.xl, fontWeight: fontWeight.bold }]}>
              {centerValue}
            </Text>
          )}
        </View>
      )}

      {/* Stacked bar (ring substitute) */}
      <View
        style={[
          styles.barContainer,
          {
            backgroundColor: colors.border,
            borderRadius: borderRadius.full,
            height: 12,
            overflow: 'hidden',
          },
        ]}
      >
        {sorted.map((segment, i) => {
          const pct = (segment.value / total) * 100;
          const width = animProgress.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', `${pct}%`],
          });
          return (
            <Animated.View
              key={`${segment.label}-${i}`}
              style={{
                width,
                height: '100%',
                backgroundColor: segment.color,
              }}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { marginTop: spacing.md, gap: spacing.sm }]}>
        {sorted.map((segment, i) => {
          const pct = ((segment.value / total) * 100).toFixed(1);
          return (
            <View key={`${segment.label}-${i}`} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: segment.color, borderRadius: borderRadius.full }]} />
              <Text
                style={[styles.legendLabel, { color: colors.textSecondary, fontSize: fontSize.sm }]}
                numberOfLines={1}
              >
                {segment.label}
              </Text>
              <Text style={[styles.legendValue, { color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }]}>
                {formatCurrency(segment.value)}
              </Text>
              <Text style={[styles.legendPct, { color: colors.textTertiary, fontSize: fontSize.xs }]}>
                {pct}%
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
  centerInfo: {
    alignItems: 'center',
  },
  centerLabel: {
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerValue: {
    letterSpacing: -0.3,
  },
  barContainer: {
    flexDirection: 'row',
  },
  legend: {},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    marginRight: 8,
  },
  legendValue: {
    marginRight: 6,
  },
  legendPct: {
    minWidth: 40,
    textAlign: 'right',
  },
});
