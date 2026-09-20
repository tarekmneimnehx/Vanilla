import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n, type TranslationKey } from '@/i18n';

/** The subset of the bottom-tab bar props this component uses. */
export interface BottomTabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}
import { useTheme } from '../ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';

const TAB_ICONS: Record<string, IconName> = { index: 'sun', routine: 'list', history: 'calendar', settings: 'settings' };
const TAB_LABELS: Record<string, TranslationKey> = { index: 'tabs.today', routine: 'tabs.routine', history: 'tabs.history', settings: 'tabs.settings' };

export const TAB_BAR_HEIGHT = 64;

/** Floating pill tab bar with four destinations. */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, rtl } = useI18n();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: theme.spacing.md, alignItems: 'center', direction: rtl ? 'rtl' : 'ltr', pointerEvents: 'box-none' }}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('a11y.tabBar')}
        style={{
          flexDirection: 'row',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.pill,
          padding: 6,
          gap: 2,
          width: '100%',
          maxWidth: 520,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.raised,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icon = TAB_ICONS[route.name] ?? 'circle';
          const label = t(TAB_LABELS[route.name] ?? 'tabs.today');
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              haptics="select"
              pressScale={0.95}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{
                flex: 1,
                minHeight: 52,
                borderRadius: theme.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                backgroundColor: focused ? theme.colors.primarySoft : 'transparent',
              }}
            >
              <Icon name={icon} size={20} color={focused ? theme.colors.primary : theme.colors.textMuted} mirror={false} />
              <Text variant="caption" style={{ color: focused ? theme.colors.primary : theme.colors.textMuted }} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
