import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../ThemeProvider';
import { durations, useReducedMotion } from '../motion';
import { Text } from './Text';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const isWeb = Platform.OS === 'web';

// An original organic "botanical orb" outline, drawn in a 200×200 box.
const BLOB = 'M 96 22 C 142 18 176 48 180 92 C 184 136 158 176 112 182 C 66 188 26 162 20 118 C 14 74 50 26 96 22 Z';
const LEAF = 'M 112 60 C 136 66 152 88 148 118 C 126 122 106 108 100 86 C 97 74 102 62 112 60 Z';
const SIZE = 200;
const RING_R = 94;
const CIRC = 2 * Math.PI * RING_R;
const TOP = 18;
const BOTTOM = 186;

export interface ProgressOrbProps {
  /** Recorded doses / scheduled doses (0..1). */
  doseRatio: number;
  /** Water total / goal (0..1). */
  waterRatio: number;
  size?: number;
  centerTop: string;
  centerBottom?: string;
  accessibilityLabel: string;
}

/**
 * Daily progress artwork. The organic shape fills with recorded doses and the
 * outer ring traces water. Both values are real ratios; nothing is scored.
 * Native builds animate through RN Animated; the web preview renders static
 * values (Animated SVG props trigger DOM attribute warnings there).
 */
export function ProgressOrb({ doseRatio, waterRatio, size = 176, centerTop, centerBottom, accessibilityLabel }: ProgressOrbProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const fill = useRef(new Animated.Value(clamp(doseRatio))).current;
  const ring = useRef(new Animated.Value(clamp(waterRatio))).current;

  useEffect(() => {
    if (isWeb) return;
    const config = { duration: reduced ? 0 : durations.fill, easing: Easing.out(Easing.cubic), useNativeDriver: false };
    Animated.parallel([Animated.timing(fill, { toValue: clamp(doseRatio), ...config }), Animated.timing(ring, { toValue: clamp(waterRatio), ...config })]).start();
  }, [doseRatio, waterRatio, fill, ring, reduced]);

  const y = fill.interpolate({ inputRange: [0, 1], outputRange: [BOTTOM, TOP] });
  const height = fill.interpolate({ inputRange: [0, 1], outputRange: [0, BOTTOM - TOP] });
  const dashOffset = ring.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });
  const staticY = BOTTOM - clamp(doseRatio) * (BOTTOM - TOP);
  const staticHeight = clamp(doseRatio) * (BOTTOM - TOP);
  const staticDash = CIRC * (1 - clamp(waterRatio));
  const { orb } = theme.colors;
  const darkText = doseRatio > 0.55;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="45%" r="60%">
            <Stop offset="0%" stopColor={orb.glow} stopOpacity={1} />
            <Stop offset="100%" stopColor={orb.glow} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={orb.b} />
            <Stop offset="100%" stopColor={orb.c} />
          </LinearGradient>
          <ClipPath id="blobClip">
            <Path d={BLOB} />
          </ClipPath>
        </Defs>
        <Circle cx={100} cy={100} r={100} fill="url(#glow)" />
        <Ellipse cx={126} cy={128} rx={58} ry={50} fill={orb.d} opacity={theme.isDark ? 0.5 : 0.7} />
        <Path d={BLOB} fill={orb.a} />
        {isWeb ? (
          <Rect x={0} y={staticY} width={SIZE} height={staticHeight} fill="url(#fillGrad)" clipPath="url(#blobClip)" />
        ) : (
          <AnimatedRect x={0} y={y} width={SIZE} height={height} fill="url(#fillGrad)" clipPath="url(#blobClip)" />
        )}
        <Path d={LEAF} fill={theme.colors.background} opacity={0.55} />
        <Circle cx={100} cy={100} r={RING_R} stroke={theme.colors.waterSoft} strokeWidth={5} fill="none" />
        {isWeb ? (
          <Circle cx={100} cy={100} r={RING_R} stroke={theme.colors.water} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={staticDash} transform="rotate(-90 100 100)" />
        ) : (
          <AnimatedCircle cx={100} cy={100} r={RING_R} stroke={theme.colors.water} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={dashOffset} transform="rotate(-90 100 100)" />
        )}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', gap: 0, pointerEvents: 'none' }}>
        <Text variant="numeral" align="center" ltr style={{ color: darkText ? theme.colors.background : theme.colors.text }}>
          {centerTop}
        </Text>
        {centerBottom ? (
          <Text variant="caption" align="center" style={{ color: doseRatio > 0.7 ? theme.colors.background : theme.colors.textSecondary, opacity: 0.9 }}>
            {centerBottom}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function clamp(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
