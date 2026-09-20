import React from 'react';
import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';
import { useI18n } from '@/i18n';
import { useTheme } from '../ThemeProvider';

export type IconName = React.ComponentProps<typeof Feather>['name'];

const MIRRORED: Partial<Record<IconName, IconName>> = {
  'chevron-right': 'chevron-left',
  'chevron-left': 'chevron-right',
  'arrow-right': 'arrow-left',
  'arrow-left': 'arrow-right',
  'corner-down-left': 'corner-down-right',
  'log-out': 'log-in',
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Mirror directional icons in RTL (default true). */
  mirror?: boolean;
  accessibilityLabel?: string;
}

/** Feather outline icons, mirrored for right-to-left layouts where direction matters. */
export function Icon({ name, size = 20, color, mirror = true, accessibilityLabel }: IconProps) {
  const theme = useTheme();
  const { rtl } = useI18n();
  const resolved = rtl && mirror ? (MIRRORED[name] ?? name) : name;
  return (
    <View accessible={Boolean(accessibilityLabel)} accessibilityLabel={accessibilityLabel} accessibilityElementsHidden={!accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}>
      <Feather name={resolved} size={size} color={color ?? theme.colors.text} />
    </View>
  );
}
