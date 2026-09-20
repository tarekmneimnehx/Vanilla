import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { useTheme } from '../ThemeProvider';
import { IconButton } from './Button';
import { Text } from './Text';

export interface ScreenProps {
  children: React.ReactNode;
  /** Large display title rendered at the top of the scroll content. */
  title?: string;
  subtitle?: string;
  /** Show a back button in the header; uses expo-router back. */
  onBack?: () => void;
  /** Optional element rendered at the end of the header row. */
  headerEnd?: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  keyboard?: boolean;
  /** Extra bottom padding, for screens with a sticky footer. */
  bottomInset?: number;
  scrollProps?: ScrollViewProps;
  testID?: string;
}

/** Screen scaffold: background, safe areas, optional header and scrolling body. */
export function Screen({ children, title, subtitle, onBack, headerEnd, scroll = true, padded = true, contentStyle, keyboard, bottomInset = 0, scrollProps, testID }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, rtl } = useI18n();
  const horizontal = padded ? theme.spacing.screen : 0;
  const header =
    title || onBack || headerEnd ? (
      <View style={{ paddingHorizontal: theme.spacing.screen, paddingTop: theme.spacing.sm, gap: theme.spacing.xs }}>
        {onBack || headerEnd ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 }}>
            {onBack ? <IconButton icon="arrow-left" onPress={onBack} accessibilityLabel={t('a11y.back')} variant="soft" /> : <View style={{ width: 48 }} />}
            {headerEnd ?? <View style={{ width: 48 }} />}
          </View>
        ) : null}
        {title ? (
          <View style={{ gap: 4, paddingTop: onBack ? theme.spacing.xs : theme.spacing.md, paddingBottom: theme.spacing.xs }}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="body" color="secondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    ) : null;

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      {...scrollProps}
      contentContainerStyle={[{ paddingHorizontal: horizontal, paddingBottom: insets.bottom + theme.spacing.xxl + bottomInset, gap: theme.spacing.md }, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: horizontal, paddingBottom: insets.bottom + bottomInset }, contentStyle]}>{children}</View>
  );

  const content = (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top, direction: rtl ? 'rtl' : 'ltr' }} testID={testID}>
      {header}
      {body}
    </View>
  );
  if (keyboard) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
    );
  }
  return content;
}
