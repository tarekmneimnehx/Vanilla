import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  tone?: 'primary' | 'water' | 'neutral';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
}

/** Pill-shaped toggle used for filters, option pickers and quick actions. */
export function Chip({ label, selected, onPress, icon, tone = 'primary', style, accessibilityLabel, disabled }: ChipProps) {
  const theme = useTheme();
  const { colors } = theme;
  const accent = tone === 'water' ? colors.water : colors.primary;
  const accentSoft = tone === 'water' ? colors.waterSoft : colors.primarySoft;
  const bg = selected ? (tone === 'neutral' ? colors.text : accentSoft) : colors.surfaceAlt;
  const fg = selected ? (tone === 'neutral' ? colors.background : accent) : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      haptics="select"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: Boolean(selected), disabled: Boolean(disabled) }}
      pressScale={0.96}
      style={[
        {
          minHeight: 40,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: theme.radius.pill,
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: selected ? (tone === 'neutral' ? colors.text : accent) : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <Text variant="smallStrong" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}
