import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface FadeInViewProps {
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Animation direction */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Distance to travel in px */
  distance?: number;
  /** Use spring physics for more natural feel */
  spring?: boolean;
}

export function FadeInView({
  delay = 0,
  duration = 500,
  children,
  style,
  direction = 'up',
  distance = 16,
  spring = true,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(
    direction === 'down' || direction === 'right' ? -distance : distance
  )).current;

  useEffect(() => {
    const timeout = setTimeout(() => {
      const animations = [
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration * 0.8,
          useNativeDriver: true,
        }),
      ];

      if (direction !== 'none') {
        if (spring) {
          animations.push(
            Animated.spring(translate, {
              toValue: 0,
              useNativeDriver: true,
              damping: 20,
              stiffness: 180,
              mass: 0.8,
            })
          );
        } else {
          animations.push(
            Animated.timing(translate, {
              toValue: 0,
              duration,
              useNativeDriver: true,
            })
          );
        }
      }

      Animated.parallel(animations).start();
    }, delay);
    return () => clearTimeout(timeout);
  }, []);

  const getTransform = (): any[] => {
    if (direction === 'none') return [];
    if (direction === 'left' || direction === 'right') {
      return [{ translateX: translate }];
    }
    return [{ translateY: translate }];
  };

  return (
    <Animated.View style={[style, { opacity, transform: getTransform() }]}>
      {children}
    </Animated.View>
  );
}
