import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/useTheme';
import { useAuthStore } from '@/src/stores/authStore';
import { formatCurrency } from '@/src/utils/currency';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function FadeInView({
  delay = 0,
  children,
  style,
}: {
  delay?: number;
  children: React.ReactNode;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

interface SummaryCardProps {
  label: string;
  amount: number;
  accentColor: string;
  delay: number;
  colors: any;
  fontSize: any;
  fontWeight: any;
  borderRadius: any;
}

function SummaryCard({
  label,
  amount,
  accentColor,
  delay,
  colors,
  fontSize,
  fontWeight,
  borderRadius,
}: SummaryCardProps) {
  return (
    <FadeInView delay={delay} style={{ flex: 1 }}>
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
          },
        ]}
      >
        <View
          style={[
            styles.accentBar,
            {
              backgroundColor: accentColor,
              borderRadius: borderRadius.sm,
            },
          ]}
        />
        <View style={styles.summaryCardContent}>
          <Text
            style={[
              styles.summaryLabel,
              { color: colors.textSecondary, fontSize: fontSize.xs },
            ]}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color: colors.text,
                fontSize: fontSize.lg,
                fontWeight: fontWeight.bold,
              },
            ]}
          >
            {formatCurrency(amount)}
          </Text>
        </View>
      </View>
    </FadeInView>
  );
}

interface QuickAction {
  label: string;
  route: string;
  emoji: string;
}

const quickActions: QuickAction[] = [
  { label: 'Add Expense', route: '/expense/add', emoji: '💸' },
  { label: 'Add Income', route: '/income/add', emoji: '💰' },
  { label: 'Add Savings', route: '/savings/', emoji: '🏦' },
];

export default function DashboardScreen() {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const displayName = user?.displayName || null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.md }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <FadeInView delay={0}>
        <Text
          style={[
            styles.greeting,
            { color: colors.textSecondary, fontSize: fontSize.md },
          ]}
        >
          {getGreeting()}{displayName ? ',' : ''}
        </Text>
        {displayName && (
          <Text
            style={[
              styles.name,
              {
                color: colors.text,
                fontSize: fontSize.xxl,
                fontWeight: fontWeight.bold,
              },
            ]}
          >
            {displayName}
          </Text>
        )}
      </FadeInView>

      {/* Net Worth Hero Card */}
      <FadeInView delay={100}>
        <View
          style={[
            styles.netWorthCard,
            {
              backgroundColor: colors.surfaceElevated,
              borderRadius: borderRadius.xl,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.netWorthLabel,
              { color: colors.textSecondary, fontSize: fontSize.sm },
            ]}
          >
            Net Worth
          </Text>
          <Text
            style={[
              styles.netWorthValue,
              {
                color: colors.text,
                fontWeight: fontWeight.bold,
              },
            ]}
          >
            {formatCurrency(0)}
          </Text>
          <Text
            style={[
              styles.netWorthHint,
              { color: colors.textTertiary, fontSize: fontSize.xs },
            ]}
          >
            Add accounts to get started
          </Text>
        </View>
      </FadeInView>

      {/* Summary Cards - 2x2 Grid */}
      <View style={[styles.gridRow, { gap: spacing.sm }]}>
        <SummaryCard
          label="Monthly Expenses"
          amount={0}
          accentColor={colors.expense}
          delay={200}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
        />
        <SummaryCard
          label="Monthly Income"
          amount={0}
          accentColor={colors.income}
          delay={250}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
        />
      </View>
      <View style={[styles.gridRow, { gap: spacing.sm }]}>
        <SummaryCard
          label="Investments"
          amount={0}
          accentColor={colors.investment}
          delay={300}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
        />
        <SummaryCard
          label="Savings"
          amount={0}
          accentColor={colors.savings}
          delay={350}
          colors={colors}
          fontSize={fontSize}
          fontWeight={fontWeight}
          borderRadius={borderRadius}
        />
      </View>

      {/* Subscriptions Card */}
      <FadeInView delay={400}>
        <View
          style={[
            styles.subscriptionCard,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <View
            style={[
              styles.accentBar,
              {
                backgroundColor: colors.subscription,
                borderRadius: borderRadius.sm,
              },
            ]}
          />
          <View style={styles.summaryCardContent}>
            <Text
              style={[
                styles.summaryLabel,
                { color: colors.textSecondary, fontSize: fontSize.xs },
              ]}
            >
              Monthly Subscriptions
            </Text>
            <Text
              style={[
                styles.summaryValue,
                {
                  color: colors.text,
                  fontSize: fontSize.lg,
                  fontWeight: fontWeight.bold,
                },
              ]}
            >
              {formatCurrency(0)}
            </Text>
          </View>
        </View>
      </FadeInView>

      {/* Quick Actions */}
      <FadeInView delay={500}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontSize: fontSize.md,
              fontWeight: fontWeight.semibold,
            },
          ]}
        >
          Quick Actions
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsContainer, { gap: spacing.sm }]}
        >
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.label}
              activeOpacity={0.7}
              onPress={() => router.push(action.route as any)}
            >
              <View
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: borderRadius.full,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
              >
                <Text style={styles.chipEmoji}>{action.emoji}</Text>
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: colors.text,
                      fontSize: fontSize.sm,
                      fontWeight: fontWeight.medium,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </FadeInView>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  greeting: {
    marginTop: 8,
  },
  name: {
    marginBottom: 20,
  },
  netWorthCard: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  netWorthLabel: {
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  netWorthValue: {
    fontSize: 36,
    letterSpacing: 0.5,
  },
  netWorthHint: {
    marginTop: 10,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    height: '70%',
    marginRight: 12,
  },
  summaryCardContent: {
    flex: 1,
  },
  summaryLabel: {
    marginBottom: 4,
  },
  summaryValue: {
    letterSpacing: 0.3,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  sectionTitle: {
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  chipText: {
    letterSpacing: 0.2,
  },
});
