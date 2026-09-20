import React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import type { OccurrenceView } from '@/domain/logging/status';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatItemDose } from '@/i18n/dose';
import { formatTime } from '@/i18n/format';
import { useFormatContext } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Badge } from '@/ui/components/Controls';
import { Icon, type IconName } from '@/ui/components/Icon';
import { Pressable } from '@/ui/components/Pressable';
import { Text } from '@/ui/components/Text';
import { useReducedMotion } from '@/ui/motion';
import { statusLine } from './DoseActionSheet';

export interface OccurrenceRowProps {
  view: OccurrenceView;
  item: Item;
  onPress: () => void;
  onTake: () => void;
  showTime?: boolean;
  compact?: boolean;
}

/** One dose in a list: status control, name, dose/time, kind label. */
export function OccurrenceRow({ view, item, onPress, onTake, showTime = true, compact }: OccurrenceRowProps) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const reduced = useReducedMotion();
  const { colors } = theme;
  const status = view.status;
  const control = (() => {
    const base = { bg: 'transparent', border: colors.borderStrong, icon: null as IconName | null, fg: colors.textMuted };
    switch (status) {
      case 'taken':
        return { bg: colors.primary, border: colors.primary, icon: 'check' as IconName, fg: colors.textOnPrimary };
      case 'skipped':
        return { bg: colors.surfaceAlt, border: colors.borderStrong, icon: 'minus' as IconName, fg: colors.skipped };
      case 'missed':
      case 'autoMissed':
        return { bg: colors.dangerSoft, border: colors.dangerSoft, icon: 'x' as IconName, fg: colors.danger };
      case 'overdue':
        return { ...base, border: colors.warn, fg: colors.warn };
      case 'due':
        return { ...base, border: colors.primary, fg: colors.primary };
      case 'snoozed':
        return { ...base, icon: 'clock' as IconName, fg: colors.textMuted };
      default:
        return base;
    }
  })();
  const subtitle = view.isFinal || status === 'snoozed' || status === 'autoMissed' ? statusLine(view, t, format) : `${formatItemDose(item, language)}${showTime ? ` · ${formatTime(view.occurrence.scheduledAt, format)}` : ''}`;
  const subtitleColor = status === 'overdue' ? 'warn' : status === 'autoMissed' || status === 'missed' ? 'danger' : 'secondary';
  const takeLabel = t('a11y.markTaken', { name: item.displayName });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: compact ? 56 : 64, paddingVertical: 6 }}>
      <Pressable
        onPress={view.isFinal ? onPress : onTake}
        accessibilityRole="button"
        accessibilityLabel={view.isFinal ? statusLine(view, t, format) : takeLabel}
        pressScale={0.88}
        haptics="none"
        style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: control.border, backgroundColor: control.bg, alignItems: 'center', justifyContent: 'center' }}
      >
        {control.icon ? (
          <Animated.View key={status} entering={reduced ? undefined : ZoomIn.springify().damping(14)}>
            <Icon name={control.icon} size={20} color={control.fg} mirror={false} />
          </Animated.View>
        ) : null}
      </Pressable>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t('a11y.openItem', { name: item.displayName })} accessibilityHint={subtitle} pressScale={0.99} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" ltr numberOfLines={2} style={{ opacity: view.isFinal && status !== 'taken' ? 0.7 : 1, textDecorationLine: status === 'skipped' ? 'line-through' : 'none' }}>
            {item.displayName}
          </Text>
          <Animated.View key={subtitle} entering={reduced ? undefined : FadeIn.duration(180)}>
            <Text variant="small" color={subtitleColor}>
              {subtitle}
            </Text>
          </Animated.View>
        </View>
        <Badge label={t(item.kind === 'medication' ? 'common.medication' : 'common.supplement')} tone={item.kind === 'medication' ? 'medication' : 'primary'} />
      </Pressable>
    </View>
  );
}
