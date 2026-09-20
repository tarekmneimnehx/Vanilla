import React from 'react';
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { TOUCH } from '../theme';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'water';
export type ButtonSize = 'md' | 'lg' | 'sm';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconEnd?: IconName;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  /** Overrides the label/icon colour, for buttons placed on coloured surfaces. */
  labelColor?: string;
}

export function Button({ label, onPress, variant = 'primary', size = 'md', icon, iconEnd, disabled, loading, full, style, accessibilityLabel, accessibilityHint, testID, labelColor }: ButtonProps) {
  const theme = useTheme();
  const { colors } = theme;
  const base = {
    primary: { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary },
    secondary: { bg: colors.primarySoft, fg: colors.primary, border: colors.primarySoft },
    ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    water: { bg: colors.water, fg: '#FFFFFF', border: colors.water },
  }[variant];
  const palette = labelColor ? { ...base, fg: labelColor } : base;
  const height = size === 'lg' ? 56 : size === 'sm' ? 40 : TOUCH;
  const paddingHorizontal = size === 'lg' ? 24 : size === 'sm' ? 14 : 20;
  const textVariant = size === 'sm' ? 'smallStrong' : 'bodyStrong';
  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      haptics="tap"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      testID={testID}
      style={[
        {
          minHeight: height,
          paddingHorizontal,
          paddingVertical: 8,
          borderRadius: theme.radius.pill,
          backgroundColor: palette.bg,
          borderWidth: 1,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={palette.fg} /> : null}
          <Text variant={textVariant} style={{ color: palette.fg }} align="center">
            {label}
          </Text>
          {iconEnd ? <Icon name={iconEnd} size={18} color={palette.fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export interface IconButtonProps {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  size?: number;
  variant?: 'plain' | 'soft' | 'primary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

export function IconButton({ icon, onPress, accessibilityLabel, size = 22, variant = 'plain', disabled, style, color }: IconButtonProps) {
  const theme = useTheme();
  const bg = variant === 'soft' ? theme.colors.surfaceAlt : variant === 'primary' ? theme.colors.primary : 'transparent';
  const fg = color ?? (variant === 'primary' ? theme.colors.textOnPrimary : theme.colors.text);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      haptics="select"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      pressScale={0.92}
      style={[{ width: TOUCH, height: TOUCH, borderRadius: theme.radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, style]}
    >
      <View>
        <Icon name={icon} size={size} color={fg} />
      </View>
    </Pressable>
  );
}
