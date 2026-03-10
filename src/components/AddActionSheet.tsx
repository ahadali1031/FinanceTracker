import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/useTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ActionItem {
  label: string;
  icon: string;
  route: string;
  color: string;
}

interface AddActionSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AddActionSheet({ visible, onClose }: AddActionSheetProps) {
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  const actions: ActionItem[] = [
    { label: 'Add Expense', icon: 'wallet-outline', route: '/expense/add', color: colors.expense },
    { label: 'Add Income', icon: 'cash-outline', route: '/income/add', color: colors.income },
    { label: 'Add Subscription', icon: 'repeat-outline', route: '/subscription/add', color: colors.subscription },
    { label: 'Update Savings', icon: 'business-outline', route: '/savings/', color: colors.savings },
    { label: 'Add Investment', icon: 'trending-up-outline', route: '/investment/add-transaction', color: colors.investment },
  ];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          speed: 14,
          bounciness: 4,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleAction = (route: string) => {
    handleClose();
    setTimeout(() => {
      router.push(route as any);
    }, 250);
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.overlayTouchable} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            paddingBottom: 40,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontSize: fontSize.xl,
              fontWeight: fontWeight.bold,
              marginHorizontal: spacing.lg,
              marginBottom: spacing.md,
            },
          ]}
        >
          Quick Add
        </Text>

        {/* Action items */}
        <View style={[styles.actionsContainer, { paddingHorizontal: spacing.md }]}>
          {actions.map((action, index) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [
                styles.actionRow,
                {
                  backgroundColor: pressed ? colors.border + '40' : 'transparent',
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                },
              ]}
              onPress={() => handleAction(action.route)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15', borderRadius: borderRadius.md }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text
                style={[
                  styles.actionLabel,
                  {
                    color: colors.text,
                    fontSize: fontSize.md,
                    fontWeight: fontWeight.medium,
                  },
                ]}
              >
                {action.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>

        {/* Cancel */}
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            {
              backgroundColor: pressed ? colors.border + '40' : colors.background,
              marginHorizontal: spacing.md,
              marginTop: spacing.md,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.md,
            },
          ]}
          onPress={handleClose}
        >
          <Text
            style={[
              styles.cancelText,
              {
                color: colors.textSecondary,
                fontSize: fontSize.md,
                fontWeight: fontWeight.semibold,
              },
            ]}
          >
            Cancel
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  title: {},
  actionsContainer: {},
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
  },
  cancelButton: {
    alignItems: 'center',
  },
  cancelText: {},
});
