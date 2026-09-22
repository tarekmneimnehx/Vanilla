import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { itemHistory } from '@/domain/services/queries';
import type { DoseLog } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatDoseText } from '@/i18n/dose';
import { formatLocalDate, formatTime } from '@/i18n/format';
import { useFormatContext, useIndexes, useSnapshot } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { useGoBack } from '@/ui/useGoBack';
import { Card } from '@/ui/components/Card';
import { SectionHeader } from '@/ui/components/Controls';
import { EmptyState } from '@/ui/components/EmptyState';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Screen } from '@/ui/components/Screen';
import { LogEditSheet } from '@/features/history/LogEditSheet';

export default function ItemHistoryScreen() {
  const theme = useTheme();
  const goBack = useGoBack();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = idx.itemsById.get(id ?? '');
  const [editing, setEditing] = useState<DoseLog | null>(null);
  const logs = useMemo(() => (item ? itemHistory(snapshot, item.id) : []), [snapshot, item]);
  const grouped = useMemo(() => {
    const map = new Map<string, DoseLog[]>();
    for (const log of logs) {
      const list = map.get(log.localDate) ?? [];
      list.push(log);
      map.set(log.localDate, list);
    }
    return [...map.entries()];
  }, [logs]);
  const liveEditing = editing ? (snapshot.logs.find((l) => l.id === editing.id) ?? null) : null;

  return (
    <Screen title={t('history.itemHistory', { name: item?.displayName ?? '' })} onBack={() => goBack()} testID="item-history">
      {grouped.length === 0 ? (
        <Card>
          <EmptyState icon="calendar" title={t('history.itemEmpty')} compact />
        </Card>
      ) : (
        grouped.map(([date, entries]) => (
          <View key={date} style={{ gap: theme.spacing.xs }}>
            <SectionHeader title={formatLocalDate(date, 'long', language)} />
            <Card padding={theme.spacing.md}>
              {entries.map((log, index) => (
                <View key={log.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    title={t(log.action === 'taken' ? 'dose.taken' : log.action === 'skipped' ? 'dose.skipped' : 'dose.missed')}
                    subtitle={[formatTime(log.at, format), log.amount !== null && log.unit ? formatDoseText(log.amount, log.unit, language) : null, log.scheduledAt ? t('history.scheduledAt', { time: formatTime(log.scheduledAt, format) }) : t('history.unscheduled'), log.reason].filter(Boolean).join(' · ')}
                    icon={log.action === 'taken' ? 'check' : log.action === 'skipped' ? 'minus' : 'x'}
                    chevron
                    onPress={() => setEditing(log)}
                  />
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
      <LogEditSheet log={liveEditing} onClose={() => setEditing(null)} />
    </Screen>
  );
}
