import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../ThemeProvider';
import { durations, useReducedMotion } from '../motion';

export interface HydrationGlassProps {
  ratio: number;
  width?: number;
  height?: number;
  accessibilityLabel: string;
  children?: React.ReactNode;
}

/**
 * A rounded vessel that fills with water. The level eases to the new value and
 * a gentle wave rolls across the surface once per change, then settles. With
 * reduced motion the level simply jumps.
 */
export function HydrationGlass({ ratio, width = 120, height = 150, accessibilityLabel, children }: HydrationGlassProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const level = useRef(new Animated.Value(clamp(ratio))).current;
  const wave = useRef(new Animated.Value(0)).current;
  const first = useRef(true);

  useEffect(() => {
    const target = clamp(ratio);
    if (reduced) {
      level.setValue(target);
      return;
    }
    Animated.timing(level, { toValue: target, duration: durations.fill, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    if (first.current) {
      first.current = false;
      return;
    }
    wave.setValue(0);
    Animated.timing(wave, { toValue: 1, duration: 1300, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [ratio, level, wave, reduced]);

  const fillHeight = level.interpolate({ inputRange: [0, 1], outputRange: [0, height] });
  const waveX = wave.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });
  const waveAmp = wave.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
  const waveHeight = 10;
  const wavePath = `M 0 ${waveHeight / 2} Q ${width / 4} 0 ${width / 2} ${waveHeight / 2} T ${width} ${waveHeight / 2} T ${width * 1.5} ${waveHeight / 2} T ${width * 2} ${waveHeight / 2} V ${waveHeight + 2} H 0 Z`;
  const radius = width * 0.28;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width,
          height,
          borderRadius: radius,
          borderBottomLeftRadius: radius * 1.35,
          borderBottomRightRadius: radius * 1.35,
          backgroundColor: theme.colors.waterSoft,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.isDark ? theme.colors.border : 'rgba(79,143,152,0.18)',
        }}
      >
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: fillHeight, backgroundColor: theme.colors.water, opacity: 0.92 }}>
          <Animated.View style={{ position: 'absolute', top: -waveHeight + 1, left: 0, width: width * 2, height: waveHeight + 2, transform: [{ translateX: waveX }, { scaleY: waveAmp }] }}>
            <Svg width={width * 2} height={waveHeight + 2}>
              <Path d={wavePath} fill={theme.colors.water} opacity={0.92} />
            </Svg>
          </Animated.View>
        </Animated.View>
        <View style={{ position: 'absolute', top: 10, left: 10, width: 10, height: height * 0.35, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
      </View>
      {children ? <View style={{ position: 'absolute', alignItems: 'center', pointerEvents: 'none' }}>{children}</View> : null}
    </View>
  );
}

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
