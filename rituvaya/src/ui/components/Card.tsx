import React from 'react';
import { View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { Pressable } from './Pressable';

export interface CardProps extends ViewProps {
  tone?: 'surface' | 'soft' | 'sand' | 'water' | 'sunken' | 'primary' | 'warn';
  padding?: number;
  onPress?: () => void;
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children?: React.ReactNode;
}

/** Rounded surface with restrained shadow. Becomes pressable when onPress is provided. */
export function Card({ tone = 'surface', padding, onPress, raised, style, children, accessibilityLabel, ...rest }: CardProps) {
  const theme = useTheme();
  const { colors } = theme;
  const background = {
    surface: colors.surface,
    soft: colors.primaryTint,
    sand: colors.sand,
    water: colors.waterSoft,
    sunken: colors.surfaceAlt,
    primary: colors.primary,
    warn: colors.warnSoft,
  }[tone];
  const base: ViewStyle = {
    backgroundColor: background,
    borderRadius: theme.radius.lg,
    padding: padding ?? theme.spacing.lg,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.isDark ? colors.border : 'transparent',
    ...(tone === 'surface' ? (raised ? theme.shadows.raised : theme.shadows.card) : {}),
  };
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={[base, style]} {...(rest as object)}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[base, style]} accessibilityLabel={accessibilityLabel} {...rest}>
      {children}
    </View>
  );
}
