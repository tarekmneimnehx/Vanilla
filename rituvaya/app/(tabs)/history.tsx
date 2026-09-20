import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { buildDay, hydrationDays, trackingDays } from '@/domain/services/queries';
import { goalOn, totalFor } from '@/domain/services/hydrationService';
import type { DoseLog } from '@/domain/types';
import type { OccurrenceView } from '@/domain/logging/status';
import { addDays, addMonths, endOfMonth, startOfMonth, startOfWeek, type LocalDate } from '@/domain/time/localDate';
import { useI18n } from '@/i18n';
import { formatLocalDate, formatTime, formatVolume, weekStartsOn } from '@/i18n/format';
import { useFormatContext, useIndexes, useNow, useSnapshot, useStreaks, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { IconButton } from '@/ui/components/Button';
import { CalendarGrid, type DayMark } from '@/ui/components/CalendarGrid';
import { Card } from '@/ui/components/Card';
import { ProgressBar, SectionHeader, Segmented } from '@/ui/components/Controls';
import { EmptyState } from '@/ui/components/EmptyState';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Screen } from '@/ui/components/Screen';
import { TAB_BAR_HEIGHT } from '@/ui/components/TabBar';
import { Text } from '@/ui/components/Text';
import { DoseActionSheet } from '@/features/dose/DoseActionSheet';
import { OccurrenceRow } from '@/features/dose/OccurrenceRow';
import { useDoseActions } from '@/features/dose/useDoseActions';
import { LogEditSheet } from '@/features/history/LogEditSheet';

type Mode = 'calendar' | 'week' | 'items';

export default function HistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t, language, n } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const today = useToday();
  const now = useNow();
  const streaks = useStreaks();
  const actions = useDoseActions();
  const [mode, setMode] = useState<Mode>('calendar');
  const [month, setMonth] = useState<LocalDate>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<LocalDate>(today);
  const [weekStart, setWeekStart] = useState<LocalDate>(startOfWeek(today, weekStartsOn(language)));
  const [selected, setSelected] = useState<OccurrenceView | null>(null);
  const [editing, setEditing] = useState<DoseLog | null>(null);

  const monthDays = useMemo(() => {
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    const tracking = trackingDays(snapshot, idx, from, to, now);
    const water = hydrationDays(snapshot, from, to);
    const map = new Map<LocalDate, { mark: DayMark; water: boolean }>();
    tracking.forEach((day, i) => {
      const mark: DayMark = day.scheduled === 0 ? 'free' : day.recorded >= day.scheduled ? 'complete' : day.recorded > 0 ? 'partial' : day.date >= today ? 'free' : 'none';
      map.set(day.date, { mark, water: water[i].goalMl > 0 && water[i].totalMl >= water[i].goalMl });
    });
    return map;
  }, [snapshot, idx, month, now, today]);

  const day = useMemo(() => buildDay(snapshot, idx, selectedDate, now), [snapshot, idx, selectedDate, now]);
  const dayWater = totalFor(snapshot.hydration, selectedDate);
  const dayGoal = goalOn(snapshot.settings, selectedDate);
  const liveSelected = selected ? (day.views.find((v) => v.occurrence.key === selected.occurrence.key) ?? null) : null;
  const liveEditing = editing ? (snapshot.logs.find((l) => l.id === editing.id) ?? null) : null;

  const week = useMemo(() => {
    const days = trackingDays(snapshot, idx, weekStart, addDays(weekStart, 6), now);
    const water = hydrationDays(snapshot, weekStart, addDays(weekStart, 6));
    const totals = days.reduce((acc, d) => ({ scheduled: acc.scheduled + d.scheduled, recorded: acc.recorded + d.recorded, taken: acc.taken + d.taken }), { scheduled: 0, recorded: 0, taken: 0 });
    return { days, water, totals };
  }, [snapshot, idx, weekStart, now]);

  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

  return (
    <Screen title={t('history.title')} bottomInset={TAB_BAR_HEIGHT + 24} testID="history">
      <Segmented
        options={[
          { value: 'calendar', label: t('history.calendar') },
          { value: 'week', label: t('history.week') },
          { value: 'items', label: t('history.items') },
        ]}
        value={mode}
        onChange={setMode}
      />
      <Card tone="soft" padding={theme.spacing.md} style={{ flexDirection: 'row', gap: theme.spacing.md, justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Text variant="caption" color="secondary">
            {t('today.streaks.trackingShort')}
          </Text>
          <Text variant="subheading">{t('today.streaks.days', { count: streaks.tracking })}</Text>
        </View>
        <View style={{ gap: 2 }}>
          <Text variant="caption" color="secondary">
            {t('today.streaks.hydrationShort')}
          </Text>
          <Text variant="subheading">{t('today.streaks.days', { count: streaks.hydration })}</Text>
        </View>
        <Text variant="caption" color="muted" style={{ flex: 1 }} align="end">
          {t('today.streaks.hint')}
        </Text>
      </Card>

      {mode === 'calendar' ? (
        <>
          <Card style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconButton icon="chevron-left" accessibilityLabel={t('history.previousMonth')} onPress={() => setMonth(addMonths(month, -1))} variant="soft" />
              <Text variant="subheading">{formatLocalDate(month, 'monthYear', language)}</Text>
              <IconButton icon="chevron-right" accessibilityLabel={t('history.nextMonth')} onPress={() => setMonth(addMonths(month, 1))} variant="soft" disabled={month >= startOfMonth(today)} />
            </View>
            <CalendarGrid month={month} selected={selectedDate} onSelect={setSelectedDate} language={language} today={today} maxDate={today} info={(date) => monthDays.get(date) ?? null} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              <Legend color={theme.colors.primary} label={t('history.legend.complete')} />
              <Legend color={theme.colors.warn} label={t('history.legend.partial')} />
              <Legend color={theme.colors.danger} label={t('history.legend.none')} />
              <Legend color={theme.colors.water} label={t('history.legend.water')} />
            </View>
          </Card>

          <SectionHeader title={formatLocalDate(selectedDate, 'full', language)} />
          <Card style={{ gap: theme.spacing.sm }}>
            {day.views.length === 0 && day.extras.length === 0 ? (
              <Text variant="small" color="secondary">
                {t('history.noSchedule')}
              </Text>
            ) : (
              <>
                <View style={{ gap: 4 }}>
                  <Text variant="bodyStrong">{t('history.recordedOf', { recorded: day.summary.taken + day.summary.skipped + day.summary.missed, scheduled: day.summary.scheduled })}</Text>
                  <Text variant="small" color="secondary">
                    {t('history.takenOf', { taken: day.summary.taken, scheduled: day.summary.scheduled })} ({t('history.percentTaken', { percent: pct(day.summary.taken, day.summary.scheduled) })}) · {t('history.counts.skipped')}: {n(day.summary.skipped)} · {t('history.counts.missed')}: {n(day.summary.missed)} · {t('history.counts.unrecorded')}: {n(day.summary.unrecorded)}
                  </Text>
                  <ProgressBar ratio={day.summary.recordedRatio ?? 0} />
                </View>
                {day.views.map((view) => {
                  const item = idx.itemsById.get(view.occurrence.itemId);
                  if (!item) return null;
                  return <OccurrenceRow key={view.occurrence.key} view={view} item={item} onPress={() => setSelected(view)} onTake={() => void actions.take(view)} compact />;
                })}
                {day.extras.map((log) => (
                  <ListRow key={log.id} title={log.itemNameSnapshot} titleLtr subtitle={`${formatTime(log.at, format)} · ${t('history.unscheduled')}`} icon="plus-circle" chevron onPress={() => setEditing(log)} />
                ))}
              </>
            )}
            <Divider />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="small" color="secondary" style={{ flex: 1 }}>
                {t('history.water')}
              </Text>
              <Text variant="smallStrong" color="water" ltr>
                {dayGoal > 0 ? t('history.hydrationDay', { amount: formatVolume(dayWater, snapshot.settings.volumeUnit, language), goal: formatVolume(dayGoal, snapshot.settings.volumeUnit, language) }) : t('history.hydrationNoGoal', { amount: formatVolume(dayWater, snapshot.settings.volumeUnit, language) })}
              </Text>
            </View>
          </Card>
        </>
      ) : null}

      {mode === 'week' ? (
        <Card style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton icon="chevron-left" accessibilityLabel={t('history.previousWeek')} onPress={() => setWeekStart(addDays(weekStart, -7))} variant="soft" />
            <Text variant="subheading">{t('history.weekOf', { date: formatLocalDate(weekStart, 'short', language) })}</Text>
            <IconButton icon="chevron-right" accessibilityLabel={t('history.nextWeek')} onPress={() => setWeekStart(addDays(weekStart, 7))} variant="soft" disabled={addDays(weekStart, 7) > today} />
          </View>
          <View style={{ gap: 4 }}>
            <Text variant="bodyStrong">{t('history.recordedOf', { recorded: week.totals.recorded, scheduled: week.totals.scheduled })}</Text>
            <Text variant="small" color="secondary">
              {t('history.percentRecorded', { percent: pct(week.totals.recorded, week.totals.scheduled) })} · {t('history.takenOf', { taken: week.totals.taken, scheduled: week.totals.scheduled })} ({t('history.percentTaken', { percent: pct(week.totals.taken, week.totals.scheduled) })})
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {week.days.map((d, i) => {
              const ratio = d.scheduled > 0 ? d.recorded / d.scheduled : 0;
              const waterMet = week.water[i].goalMl > 0 && week.water[i].totalMl >= week.water[i].goalMl;
              return (
                <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${formatLocalDate(d.date, 'weekday', language)}: ${t('history.recordedOf', { recorded: d.recorded, scheduled: d.scheduled })}`}>
                  <View style={{ width: '100%', height: 80, borderRadius: 10, backgroundColor: theme.colors.surfaceAlt, justifyContent: 'flex-end', overflow: 'hidden' }}>
                    <View style={{ height: `${Math.max(d.scheduled > 0 ? 6 : 0, ratio * 100)}%`, backgroundColor: d.date > today ? theme.colors.border : ratio >= 1 ? theme.colors.primary : theme.colors.warn, borderRadius: 10 }} />
                  </View>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: waterMet ? theme.colors.water : 'transparent' }} />
                  <Text variant="caption" color="muted">
                    {formatLocalDate(d.date, 'weekdayShort', language).slice(0, 2)}
                  </Text>
                  <Text variant="caption" color="secondary" ltr>
                    {d.scheduled > 0 ? `${n(d.recorded)}/${n(d.scheduled)}` : '–'}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      {mode === 'items' ? (
        snapshot.items.length === 0 ? (
          <Card>
            <EmptyState icon="feather" title={t('routine.empty')} compact />
          </Card>
        ) : (
          <Card padding={theme.spacing.md}>
            {snapshot.items.map((item, index) => {
              const count = snapshot.logs.filter((l) => l.itemId === item.id && l.deletedAt === null).length;
              return (
                <View key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow title={item.displayName} titleLtr subtitle={`${t('history.counts.taken')}: ${n(snapshot.logs.filter((l) => l.itemId === item.id && l.deletedAt === null && l.action === 'taken').length)} · ${t('history.counts.scheduled')}: ${n(count)}`} icon={item.kind === 'medication' ? 'plus-square' : 'feather'} chevron onPress={() => router.push(`/item/${item.id}/history` as never)} />
                </View>
              );
            })}
          </Card>
        )
      ) : null}

      <DoseActionSheet view={liveSelected} item={selected ? (idx.itemsById.get(selected.occurrence.itemId) ?? null) : null} onClose={() => setSelected(null)} />
      <LogEditSheet log={liveEditing} onClose={() => setEditing(null)} />
    </Screen>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </View>
  );
}
