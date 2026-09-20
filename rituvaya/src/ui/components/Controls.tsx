import React from 'react';
import { Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '@/i18n';
import { useTheme } from '../ThemeProvider';
import { IconButton } from './Button';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export function Segmented<T extends string>({ options, value, onChange, style }: { options: SegmentedOption<T>[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[{ flexDirection: 'row', backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, padding: 4, gap: 4 }, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            haptics="select"
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={option.label}
            pressScale={0.97}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: theme.radius.pill,
              backgroundColor: selected ? theme.colors.surface : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              ...(selected ? theme.shadows.card : {}),
            }}
          >
            <Text variant="smallStrong" color={selected ? 'text' : 'secondary'} align="center" numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  accessibilityLabel: string;
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, format, accessibilityLabel }: StepperProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
  return (
    <View accessibilityLabel={accessibilityLabel} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.pill, padding: 4 }}>
      <IconButton icon="minus" size={18} accessibilityLabel={`${accessibilityLabel}: ${t('a11y.decrease')}`} onPress={() => onChange(clamp(value - step))} disabled={value <= min} style={{ width: 40, height: 40 }} />
      <Text variant="bodyStrong" align="center" style={{ minWidth: 48 }} ltr>
        {format ? format(value) : String(value)}
      </Text>
      <IconButton icon="plus" size={18} accessibilityLabel={`${accessibilityLabel}: ${t('a11y.increase')}`} onPress={() => onChange(clamp(value + step))} disabled={value >= max} style={{ width: 40, height: 40 }} />
    </View>
  );
}

export function SwitchRow({ label, hint, value, onChange, disabled }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 56, paddingVertical: 8, opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{label}</Text>
        {hint ? (
          <Text variant="small" color="secondary">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
        thumbColor={theme.isDark ? theme.colors.background : '#FFFFFF'}
        ios_backgroundColor={theme.colors.borderStrong}
      />
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: theme.spacing.xs, minHeight: 32 }}>
      <Text variant="label" color="secondary" style={{ textTransform: 'uppercase' }} accessibilityRole="header">
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={action} style={{ minHeight: 32, justifyContent: 'center' }}>
          <Text variant="smallStrong" color="primary">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'medication' | 'demo' | 'warn' | 'danger' | 'water' }) {
  const theme = useTheme();
  const { colors } = theme;
  const palette = {
    neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    medication: { bg: colors.sand, fg: colors.text },
    demo: { bg: colors.warnSoft, fg: colors.warn },
    warn: { bg: colors.warnSoft, fg: colors.warn },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    water: { bg: colors.waterSoft, fg: colors.waterDeep },
  }[tone];
  return (
    <View style={{ backgroundColor: palette.bg, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text variant="caption" style={{ color: palette.fg }}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({ ratio, tone = 'primary', height = 8 }: { ratio: number; tone?: 'primary' | 'water'; height?: number }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${clamped * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: tone === 'water' ? theme.colors.water : theme.colors.primary }} />
    </View>
  );
}
