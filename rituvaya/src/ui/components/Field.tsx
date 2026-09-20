import React, { useState } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useI18n } from '@/i18n';
import { useTheme } from '../ThemeProvider';
import { fonts } from '../theme';
import { Text } from './Text';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  suffix?: string;
  style?: StyleProp<ViewStyle>;
  /** Product names and numbers are always left-to-right. */
  ltr?: boolean;
  compact?: boolean;
}

/** Labelled text input with hint and inline validation message. */
export function Field({ label, hint, error, suffix, style, ltr, compact, multiline, ...rest }: FieldProps) {
  const theme = useTheme();
  const { rtl, language } = useI18n();
  const [focused, setFocused] = useState(false);
  const family = language === 'ar' ? fonts.arabic : fonts.body;
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text variant="smallStrong" color="secondary">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderWidth: 1.5,
          borderColor: error ? theme.colors.danger : focused ? theme.colors.primary : theme.colors.border,
          paddingHorizontal: 14,
          minHeight: compact ? 44 : 52,
        }}
      >
        <TextInput
          {...rest}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel={rest.accessibilityLabel ?? label}
          style={{
            flex: 1,
            fontFamily: family,
            fontSize: 16,
            lineHeight: multiline ? 22 : undefined,
            color: theme.colors.text,
            paddingVertical: multiline ? 12 : 8,
            minHeight: multiline ? 88 : undefined,
            textAlign: ltr ? 'left' : rtl ? 'right' : 'left',
            writingDirection: ltr ? 'ltr' : rtl ? 'rtl' : 'ltr',
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {suffix ? (
          <Text variant="small" color="secondary">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="small" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
