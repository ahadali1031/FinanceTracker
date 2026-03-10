import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/constants/useTheme';

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
  const { colors, spacing, borderRadius, fontSize, fontWeight, isDark, shadows } = useTheme();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const itemAnims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

  const actions: ActionItem[] = [
    { label: 'Add Expense', icon: 'wallet-outline', route: '/expense/add', color: colors.expense },
    { label: 'Add Income', icon: 'cash-outline', route: '/income/add', color: colors.income },
    { label: 'Add Subscription', icon: 'repeat-outline', route: '/subscription/add', color: colors.subscription },
    { label: 'Update Savings', icon: 'shield-checkmark-outline', route: '/savings/', color: colors.savings },
    { label: 'Add Investment', icon: 'trending-up-outline', route: '/investment/add-transaction', color: colors.investment },
  ];

  useEffect(() => {
    if (visible) {
      // Reset items
      itemAnims.forEach((a) => a.setValue(0));

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Stagger item entrance
        Animated.stagger(50, itemAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            damping: 15,
            stiffness: 200,
            useNativeDriver: true,
          })
        )).start();
      });
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(300);
      itemAnims.forEach((a) => a.setValue(0));
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
            borderTopLeftRadius: borderRadius.xxl,
            borderTopRightRadius: borderRadius.xxl,
            paddingBottom: 48,
            transform: [{ translateY: slideAnim }],
            ...(isDark ? { borderWidth: 1, borderColor: colors.border, borderBottomWidth: 0 } : shadows.xl),
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
            <Animated.View
              key={action.label}
              style={{
                opacity: itemAnims[index],
                transform: [{
                  translateY: itemAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                }],
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  {
                    backgroundColor: pressed ? action.color + '0A' : 'transparent',
                    borderRadius: borderRadius.md,
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.md,
                  },
                ]}
                onPress={() => handleAction(action.route)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '12', borderRadius: borderRadius.md }]}>
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
            </Animated.View>
          ))}
        </View>

        {/* Cancel */}
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            {
              backgroundColor: pressed ? colors.border + '40' : colors.surfaceElevated,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    width: 40,
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
    width: 44,
    height: 44,
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
