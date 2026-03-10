import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/constants/useTheme';

type GuideStep = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  description: string;
};

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: 'home-outline',
    title: 'Dashboard',
    description:
      'Your financial overview at a glance. See total income, expenses, investments, and savings. Tap any summary card to dive deeper.',
  },
  {
    icon: 'card-outline',
    title: 'Track Expenses',
    description:
      'Go to the Transactions tab to view all your expenses. Filter by category or date to find specific transactions.',
  },
  {
    icon: 'add-circle-outline',
    title: 'Add Transactions',
    description:
      'Tap the + button in the tab bar to quickly add an expense, income, subscription, or investment entry.',
  },
  {
    icon: 'cash-outline',
    title: 'Income',
    description:
      'Track your income sources from the Dashboard\'s income card. Add salary, freelance, or any other earnings.',
  },
  {
    icon: 'refresh-outline',
    title: 'Subscriptions',
    description:
      'Keep tabs on recurring payments like Netflix, Spotify, or gym memberships. Access from the Dashboard\'s subscriptions card.',
  },
  {
    icon: 'trending-up-outline',
    title: 'Investments',
    description:
      'Track brokerage, 401k, Roth IRA, Traditional IRA, and HSA accounts in the Invest tab. Add holdings and monitor performance.',
  },
  {
    icon: 'wallet-outline',
    title: 'Budgets',
    description:
      'Set monthly spending limits by category in Settings > Manage Budgets. Get visual progress bars showing how much you\'ve spent.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Savings Goals',
    description:
      'Create savings accounts with target goals in Settings > Savings Accounts. Track your progress toward each goal.',
  },
  {
    icon: 'logo-google',
    title: 'Sync Your Data',
    description:
      'Sign in with Google to keep your data safe across devices. Guest accounts are temporary — link Google anytime from Settings.',
  },
];

export function GuideModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors, spacing, borderRadius, fontSize, fontWeight, isDark, shadows } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border + '40' }]}>
          <View style={{ flex: 1 }} />
          <Text style={[styles.headerTitle, { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }]}>
            How to Use
          </Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={28} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg, paddingBottom: 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome */}
          <View style={[styles.welcomeSection, { marginBottom: spacing.lg }]}>
            <View style={[styles.welcomeIcon, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="analytics" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.heavy }]}>
              Welcome to{'\n'}Finance Tracker
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 }}>
              Your all-in-one tool for managing expenses, income, investments, and savings.
            </Text>
          </View>

          {/* Steps */}
          {GUIDE_STEPS.map((step, index) => (
            <View
              key={index}
              style={[
                styles.stepCard,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  ...(isDark ? { borderWidth: 1, borderColor: colors.border } : shadows.sm),
                },
              ]}
            >
              <View style={[styles.stepIconBg, { backgroundColor: (step.iconColor || colors.primary) + '12', borderRadius: borderRadius.md }]}>
                <Ionicons name={step.icon} size={20} color={step.iconColor || colors.primary} />
              </View>
              <View style={styles.stepText}>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.semibold, marginBottom: 4 }}>
                  {step.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 }}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 24,
  },
  welcomeSection: {
    alignItems: 'center',
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepIconBg: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepText: {
    flex: 1,
  },
});
