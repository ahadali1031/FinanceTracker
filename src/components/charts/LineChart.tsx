import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Animated, Pressable, LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/constants/useTheme';
import { formatCurrency } from '@/src/utils/currency';

interface LineDatum {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineDatum[];
  height?: number;
  lineColor?: string;
  fillColor?: string;
  showDots?: boolean;
}

/**
 * Line/area chart using pure React Native Views.
 * Plots dots at data points connected by thin horizontal/vertical segments.
 * A gradient-like fill is approximated by stacking semi-transparent columns.
 * Tap on a dot to see its value.
 */
export function LineChart({
  data,
  height = 160,
  lineColor,
  fillColor,
  showDots = true,
}: LineChartProps) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const animProgress = useRef(new Animated.Value(0)).current;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);

  const lColor = lineColor ?? colors.primary;
  const fColor = fillColor ?? lColor;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, []);

  if (data.length < 2) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  // Compute positions as percentages
  const points = data.map((d, i) => {
    const x = data.length === 1 ? 0.5 : i / (data.length - 1);
    const y = (d.value - minVal) / range; // 0 = bottom, 1 = top
    return { x, y, ...d };
  });

  const plotHeight = height - 24; // leave room for labels

  return (
    <View style={styles.container}>
      {/* Tooltip */}
      {selectedIndex !== null && (
        <View style={[styles.tooltip, { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
            {formatCurrency(data[selectedIndex].value)}
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: fontSize.xs }}>
            {data[selectedIndex].label}
          </Text>
        </View>
      )}

      {/* Chart area */}
      <View style={[styles.chartArea, { height: plotHeight }]} onLayout={onLayout}>
        {chartWidth > 0 && (
          <>
            {/* Fill columns under each point */}
            {points.map((pt, i) => {
              const left = pt.x * (chartWidth - 16) + 8; // 8px margin on each side
              const colHeight = animProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, pt.y * plotHeight * 0.9],
              });
              return (
                <Animated.View
                  key={`fill-${i}`}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: left - 8,
                    width: 16,
                    height: colHeight,
                    backgroundColor: fColor + '15',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                  }}
                />
              );
            })}

            {/* Line segments connecting dots */}
            {points.map((pt, i) => {
              if (i === 0) return null;
              const prev = points[i - 1];
              const x1 = prev.x * (chartWidth - 16) + 8;
              const y1 = plotHeight - prev.y * plotHeight * 0.9;
              const x2 = pt.x * (chartWidth - 16) + 8;
              const y2 = plotHeight - pt.y * plotHeight * 0.9;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              const lineOpacity = animProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              });

              return (
                <Animated.View
                  key={`line-${i}`}
                  style={{
                    position: 'absolute',
                    left: x1,
                    top: y1,
                    width: length,
                    height: 2.5,
                    backgroundColor: lColor,
                    borderRadius: 1,
                    opacity: lineOpacity,
                    transform: [
                      { translateY: -1 },
                      { rotate: `${angle}deg` },
                    ],
                    transformOrigin: 'left center',
                  }}
                />
              );
            })}

            {/* Dots */}
            {showDots &&
              points.map((pt, i) => {
                const left = pt.x * (chartWidth - 16) + 8;
                const top = plotHeight - pt.y * plotHeight * 0.9;
                const isSelected = selectedIndex === i;

                const dotOpacity = animProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                });

                return (
                  <Animated.View
                    key={`dot-${i}`}
                    style={{
                      position: 'absolute',
                      left: left - (isSelected ? 6 : 4.5),
                      top: top - (isSelected ? 6 : 4.5),
                      width: isSelected ? 12 : 9,
                      height: isSelected ? 12 : 9,
                      borderRadius: 6,
                      backgroundColor: isSelected ? lColor : colors.surface,
                      borderWidth: 2.5,
                      borderColor: lColor,
                      opacity: dotOpacity,
                      zIndex: 10,
                    }}
                  />
                );
              })}

            {/* Tap targets (invisible wider pressable areas) */}
            {points.map((pt, i) => {
              const left = pt.x * (chartWidth - 16) + 8;
              return (
                <Pressable
                  key={`tap-${i}`}
                  onPress={() => setSelectedIndex(selectedIndex === i ? null : i)}
                  style={{
                    position: 'absolute',
                    left: left - 18,
                    top: 0,
                    width: 36,
                    height: plotHeight,
                    zIndex: 20,
                  }}
                />
              );
            })}
          </>
        )}
      </View>

      {/* X-axis labels */}
      <View style={[styles.xLabels, { marginTop: spacing.xs }]}>
        {data.map((d, i) => (
          <Text
            key={`xl-${i}`}
            style={[
              styles.xLabel,
              {
                color: selectedIndex === i ? colors.text : colors.textTertiary,
                fontSize: fontSize.xs,
                fontWeight: selectedIndex === i ? fontWeight.semibold : fontWeight.normal,
              },
            ]}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  tooltip: {
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    minHeight: 36,
  },
  chartArea: {
    position: 'relative',
    overflow: 'hidden',
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xLabel: {
    textAlign: 'center',
    flex: 1,
  },
});
