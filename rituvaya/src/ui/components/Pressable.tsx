import React from 'react';
import { Pressable as RNPressable, type PressableProps as RNPressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion, durations } from '../motion';
import { haptic } from '../haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed; set to 1 to disable. */
  pressScale?: number;
  haptics?: 'none' | 'tap' | 'select';
  children?: React.ReactNode;
}

/** Pressable with a soft press-scale and optional haptic tick. Respects reduced motion. */
export function Pressable({ style, pressScale = 0.98, haptics = 'none', onPressIn, onPressOut, onPress, children, ...rest }: PressableProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reduced && pressScale !== 1) scale.value = withTiming(pressScale, { duration: durations.fast });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced && pressScale !== 1) scale.value = withTiming(1, { duration: durations.base });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics === 'tap') haptic.tap();
        else if (haptics === 'select') haptic.select();
        onPress?.(e);
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
