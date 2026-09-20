import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable as RNPressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { useTheme } from '../ThemeProvider';
import { useReducedMotion } from '../motion';
import { IconButton } from './Button';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scroll?: boolean;
  testID?: string;
}

/** Bottom sheet built on the native Modal so it works identically on iOS, Android and web. */
export function Sheet({ visible, onClose, title, subtitle, children, footer, scroll = true, testID }: SheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { t, rtl } = useI18n();
  const body = (
    <View style={{ gap: theme.spacing.md, paddingHorizontal: theme.spacing.screen }}>{children}</View>
  );
  return (
    <Modal visible={visible} transparent animationType={reduced ? 'fade' : 'slide'} onRequestClose={onClose} statusBarTranslucent testID={testID}>
      <View style={{ flex: 1, justifyContent: 'flex-end', direction: rtl ? 'rtl' : 'ltr' }}>
        <RNPressable style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: theme.colors.overlay }} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('a11y.close')} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
              paddingTop: theme.spacing.sm,
              paddingBottom: insets.bottom + theme.spacing.lg,
              maxHeight: '88%',
              gap: theme.spacing.md,
              ...theme.shadows.raised,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong }} />
            </View>
            {title ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: theme.spacing.screen, gap: theme.spacing.sm }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="heading" accessibilityRole="header">
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text variant="small" color="secondary">
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <IconButton icon="x" accessibilityLabel={t('a11y.close')} onPress={onClose} variant="soft" size={20} style={{ width: 40, height: 40 }} />
              </View>
            ) : null}
            {scroll ? (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing.sm }}>
                {body}
              </ScrollView>
            ) : (
              body
            )}
            {footer ? <View style={{ paddingHorizontal: theme.spacing.screen, gap: theme.spacing.sm }}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
