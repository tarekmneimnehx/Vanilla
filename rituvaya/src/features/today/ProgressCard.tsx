import React from 'react';
import { View } from 'react-native';
import type { DayModel } from '@/domain/services/queries';
import { progressRatio } from '@/domain/hydration/units';
import { useI18n } from '@/i18n';
import { formatVolume } from '@/i18n/format';
import { useSnapshot, useStreaks } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Card } from '@/ui/components/Card';
import { Icon } from '@/ui/components/Icon';
import { ProgressOrb } from '@/ui/components/ProgressOrb';
import { Text } from '@/ui/components/Text';

export interface ProgressCardProps {
  day: DayModel;
  waterMl: number;
  goalMl: number;
}

/** Today's truthful progress: recorded doses over scheduled, water over goal, and both streaks. */
export function ProgressCard({ day, waterMl, goalMl }: ProgressCardProps) {
  const theme = useTheme();
  const { t, n, language } = useI18n();
  const snapshot = useSnapshot();
  const streaks = useStreaks();
  const { summary } = day;
  const recorded = summary.taken + summary.skipped + summary.missed;
  const doseRatio = summary.recordedRatio ?? 0;
  const waterRatio = progressRatio(waterMl, goalMl);
  const waterText = goalMl > 0 ? formatVolume(waterMl, snapshot.settings.volumeUnit, language) : '';
  const a11y = t('a11y.progressOrb', { recorded, scheduled: summary.scheduled, water: waterText || '0' });
  return (
    <Card padding={theme.spacing.lg} style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
        <ProgressOrb doseRatio={doseRatio} waterRatio={waterRatio} centerTop={summary.scheduled > 0 ? `${n(recorded)}/${n(summary.scheduled)}` : '—'} centerBottom={summary.scheduled > 0 ? t('today.recorded') : undefined} accessibilityLabel={a11y} size={148} />
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <View style={{ gap: 2 }}>
            <Text variant="label" color="secondary" style={{ textTransform: 'uppercase' }}>
              {t('today.progress.title')}
            </Text>
            <Text variant="subheading">{summary.scheduled > 0 ? t('today.progress.recordedOf', { recorded, scheduled: summary.scheduled }) : t('today.progress.noDoses')}</Text>
          </View>
          {summary.scheduled > 0 ? (
            <Text variant="small" color="secondary">
              {t('today.progress.takenOf', { taken: summary.taken })}
              {summary.skipped ? ` · ${t('today.progress.skipped', { count: summary.skipped })}` : ''}
              {summary.missed ? ` · ${t('today.progress.missed', { count: summary.missed })}` : ''}
            </Text>
          ) : null}
          {goalMl > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="droplet" size={14} color={theme.colors.water} mirror={false} />
              <Text variant="small" color="water">
                {t('today.progress.water', { amount: formatVolume(waterMl, snapshot.settings.volumeUnit, language), goal: formatVolume(goalMl, snapshot.settings.volumeUnit, language) })}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        <StreakPill icon="check-circle" label={t('today.streaks.trackingShort')} value={t('today.streaks.days', { count: streaks.tracking })} tone="primary" />
        <StreakPill icon="droplet" label={t('today.streaks.hydrationShort')} value={t('today.streaks.days', { count: streaks.hydration })} tone="water" />
      </View>
    </Card>
  );
}

function StreakPill({ icon, label, value, tone }: { icon: 'check-circle' | 'droplet'; label: string; value: string; tone: 'primary' | 'water' }) {
  const theme = useTheme();
  const fg = tone === 'water' ? theme.colors.waterDeep : theme.colors.primary;
  const bg = tone === 'water' ? theme.colors.waterSoft : theme.colors.primaryTint;
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: bg, borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Icon name={icon} size={14} color={fg} mirror={false} />
      <Text variant="caption" style={{ color: fg }}>
        {label} · {value}
      </Text>
    </View>
  );
}
