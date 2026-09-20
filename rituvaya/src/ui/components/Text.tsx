import React from 'react';
import { Text as RNText, type StyleProp, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useI18n } from '@/i18n';
import { useTheme } from '../ThemeProvider';
import { fonts, type TypeVariant } from '../theme';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: 'text' | 'secondary' | 'muted' | 'primary' | 'onPrimary' | 'danger' | 'warn' | 'water' | 'success' | 'skipped';
  align?: 'start' | 'center' | 'end';
  style?: StyleProp<TextStyle>;
  /** Forces left-to-right rendering, for product names and numbers inside RTL layouts. */
  ltr?: boolean;
}

/**
 * The only text primitive in the app. It applies the type scale, the language
 * appropriate font family, colour tokens, direction-aware alignment and the
 * per-variant cap on Dynamic Type scaling so large text never clips layouts.
 */
export function Text({ variant = 'body', color = 'text', align, style, ltr, children, ...rest }: TextProps) {
  const theme = useTheme();
  const { rtl, language } = useI18n();
  const spec = theme.typography[variant];
  const family = language === 'ar' ? fonts[spec.arabicFamily] : fonts[spec.family];
  const colorValue = {
    text: theme.colors.text,
    secondary: theme.colors.textSecondary,
    muted: theme.colors.textMuted,
    primary: theme.colors.primary,
    onPrimary: theme.colors.textOnPrimary,
    danger: theme.colors.danger,
    warn: theme.colors.warn,
    water: theme.colors.water,
    success: theme.colors.success,
    skipped: theme.colors.skipped,
  }[color];
  const textAlign: TextStyle['textAlign'] = align === 'center' ? 'center' : align === 'end' ? (rtl ? 'left' : 'right') : rtl ? 'right' : 'left';
  const direction: TextStyle['writingDirection'] = ltr ? 'ltr' : rtl ? 'rtl' : 'ltr';
  return (
    <RNText
      maxFontSizeMultiplier={spec.maxFontSizeMultiplier}
      {...rest}
      style={[
        {
          fontFamily: family,
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          letterSpacing: language === 'ar' ? 0 : spec.letterSpacing,
          color: colorValue,
          textAlign: ltr ? (rtl ? 'right' : 'left') : textAlign,
          writingDirection: direction,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
