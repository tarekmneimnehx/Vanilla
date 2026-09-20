import React, { useMemo } from 'react';
import { View } from 'react-native';
import { currentVersion } from '@/domain/services/scheduleService';
import { nextRecurrenceOnOrAfter } from '@/domain/schedule/recurrence';
import type { Item, Schedule } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatItemDose, formatStrength } from '@/i18n/dose';
import { formatLocalDate } from '@/i18n/format';
import { useFormatContext, useIndexes, useSnapshot, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Card } from '@/ui/components/Card';
import { Badge } from '@/ui/components/Controls';
import { Icon } from '@/ui/components/Icon';
import { Text } from '@/ui/components/Text';
import { scheduleSummary } from '../schedule/summary';

export function useScheduleSummary(item: Item, versions: readonly Schedule[]): { summary: string; next: string | null } {
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const today = useToday();
  return useMemo(() => {
    const ctx = { language, format, anchorHistory: snapshot.settings.anchorHistory, groupsById: idx.groupsById, today };
    const current = currentVersion(versions) ?? versions[0];
    if (!current) return { summary: t('routine.asNeededLabel'), next: null };
    const summary = scheduleSummary(current, ctx);
    if (item.status !== 'active' || current.recurrence.type === 'asNeeded') return { summary, next: null };
    const nextDate = nextRecurrenceOnOrAfter(versions, today);
    const next = nextDate ? (nextDate === today ? t('common.today') : formatLocalDate(nextDate, 'short', language)) : null;
    return { summary, next };
  }, [item.status, versions, language, format, snapshot.settings.anchorHistory, idx.groupsById, today, t]);
}

export function ItemCard({ item, versions, onPress }: { item: Item; versions: readonly Schedule[]; onPress: () => void }) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const { summary, next } = useScheduleSummary(item, versions);
  const strength = formatStrength(item, language);
  return (
    <Card onPress={onPress} padding={theme.spacing.md} accessibilityLabel={t('a11y.openItem', { name: item.displayName })} style={{ gap: 8, opacity: item.status === 'active' ? 1 : 0.75 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: item.kind === 'medication' ? theme.colors.sand : theme.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={item.kind === 'medication' ? 'plus-square' : 'feather'} size={20} color={item.kind === 'medication' ? theme.colors.text : theme.colors.primary} mirror={false} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyStrong" ltr numberOfLines={2}>
            {item.displayName}
          </Text>
          <Text variant="small" color="secondary">
            {[formatItemDose(item, language), strength].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={theme.colors.textMuted} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Badge label={t(item.kind === 'medication' ? 'common.medication' : 'common.supplement')} tone={item.kind === 'medication' ? 'medication' : 'primary'} />
        {item.status === 'paused' ? <Badge label={t('routine.paused')} tone="warn" /> : null}
        {item.status === 'archived' ? <Badge label={t('routine.archived')} tone="neutral" /> : null}
        {item.isDemo ? <Badge label={t('common.demo')} tone="demo" /> : null}
      </View>
      <Text variant="small" color="secondary" numberOfLines={2}>
        {summary}
        {next ? ` · ${t('routine.nextDoseLabel', { when: next })}` : ''}
      </Text>
    </Card>
  );
}
