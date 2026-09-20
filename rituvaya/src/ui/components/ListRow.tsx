import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  icon?: IconName;
  trailing?: React.ReactNode;
  value?: string;
  chevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  titleLtr?: boolean;
  testID?: string;
}

/** Standard list row: leading icon, title/subtitle, trailing value or control, optional chevron. */
export function ListRow({ title, subtitle, leading, icon, trailing, value, chevron, onPress, style, accessibilityLabel, accessibilityHint, disabled, titleLtr, testID }: ListRowProps) {
  const theme = useTheme();
  const content = (
    <>
      {leading ? (
        leading
      ) : icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={18} color={theme.colors.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" ltr={titleLtr}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="body" color="secondary" style={{ maxWidth: '45%' }} align="end">
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevron-right" size={20} color={theme.colors.textMuted} /> : null}
    </>
  );
  const base: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 56, paddingVertical: theme.spacing.xs, opacity: disabled ? 0.5 : 1 };
  if (onPress) {
    return (
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (subtitle ? `${title}, ${subtitle}` : title)} accessibilityHint={accessibilityHint} pressScale={0.99} style={[base, style]} testID={testID}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={[base, style]} testID={testID}>
      {content}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border, marginStart: inset }} />;
}
