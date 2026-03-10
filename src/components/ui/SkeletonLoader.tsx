import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '@/constants/useTheme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
}

// Pre-built skeleton layouts
export function CardSkeleton() {
  const { colors, spacing, borderRadius, isDark, shadows } = useTheme();
  return (
    <View style={[{
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...(isDark ? { borderWidth: 1, borderColor: colors.border } : shadows.sm),
    }]}>
      <SkeletonLoader width="40%" height={12} style={{ marginBottom: spacing.sm }} />
      <SkeletonLoader width="60%" height={24} style={{ marginBottom: spacing.xs }} />
      <SkeletonLoader width="30%" height={12} />
    </View>
  );
}

export function ListItemSkeleton() {
  const { colors, spacing, borderRadius, isDark, shadows } = useTheme();
  return (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...(isDark ? { borderWidth: 1, borderColor: colors.border } : shadows.sm),
    }]}>
      <SkeletonLoader width={40} height={40} borderRadius={12} style={{ marginRight: spacing.md }} />
      <View style={{ flex: 1 }}>
        <SkeletonLoader width="70%" height={14} style={{ marginBottom: spacing.xs }} />
        <SkeletonLoader width="40%" height={12} />
      </View>
      <SkeletonLoader width={60} height={18} />
    </View>
  );
}

export function DashboardSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ padding: spacing.md }}>
      {/* Net worth hero */}
      <CardSkeleton />
      {/* Grid */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <View style={{ flex: 1 }}><CardSkeleton /></View>
        <View style={{ flex: 1 }}><CardSkeleton /></View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}><CardSkeleton /></View>
        <View style={{ flex: 1 }}><CardSkeleton /></View>
      </View>
      <CardSkeleton />
    </View>
  );
}
