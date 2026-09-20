import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/i18n';
import { useTheme } from '../ThemeProvider';
import { useReducedMotion } from '../motion';
import { haptic } from '../haptics';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';

export interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
  icon?: IconName;
  tone?: 'default' | 'success' | 'water';
  durationMs?: number;
}

interface ToastState extends ToastOptions {
  id: number;
}

const ToastContext = createContext<{ show: (o: ToastOptions) => void; hide: () => void }>({ show: () => undefined, hide: () => undefined });

export function useToast() {
  return useContext(ToastContext);
}

/** Bottom toast with an optional action (used for Undo). One toast at a time; announced to screen readers. */
export function ToastProvider({ children, bottomOffset = 0 }: { children: React.ReactNode; bottomOffset?: number }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);
  const show = useCallback(
    (options: ToastOptions) => {
      if (timer.current) clearTimeout(timer.current);
      counter.current += 1;
      setToast({ ...options, id: counter.current });
      AccessibilityInfo.announceForAccessibility?.(options.actionLabel ? `${options.message}. ${options.actionLabel}` : options.message);
      timer.current = setTimeout(() => setToast(null), options.durationMs ?? (options.onAction ? 6000 : 3500));
    },
    [],
  );
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const value = useMemo(() => ({ show, hide }), [show, hide]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastView toast={toast} onDismiss={hide} bottomOffset={bottomOffset} />
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss, bottomOffset }: { toast: ToastState | null; onDismiss: () => void; bottomOffset: number }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { rtl } = useI18n();
  if (!toast) return null;
  const bg = toast.tone === 'water' ? theme.colors.waterDeep : theme.colors.text;
  const fg = theme.colors.background;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + bottomOffset + 12, alignItems: 'center', paddingHorizontal: theme.spacing.screen, direction: rtl ? 'rtl' : 'ltr', pointerEvents: 'box-none' }}>
      <Animated.View
        key={toast.id}
        entering={reduced ? undefined : FadeInDown.duration(220)}
        exiting={reduced ? undefined : FadeOutDown.duration(180)}
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: bg,
          borderRadius: theme.radius.pill,
          paddingVertical: 12,
          paddingStart: 18,
          paddingEnd: 10,
          maxWidth: 520,
          width: '100%',
          ...theme.shadows.raised,
        }}
      >
        {toast.icon ? <Icon name={toast.icon} size={18} color={fg} /> : null}
        <Text variant="smallStrong" style={{ color: fg, flex: 1 }} numberOfLines={2}>
          {toast.message}
        </Text>
        {toast.actionLabel && toast.onAction ? (
          <Pressable
            onPress={() => {
              haptic.tap();
              void toast.onAction?.();
              onDismiss();
            }}
            accessibilityRole="button"
            accessibilityLabel={toast.actionLabel}
            style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center' }}
          >
            <Text variant="smallStrong" style={{ color: fg }}>
              {toast.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}
