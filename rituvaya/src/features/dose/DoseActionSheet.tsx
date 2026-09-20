import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { OccurrenceView } from '@/domain/logging/status';
import { wallClock } from '@/domain/time/clock';
import { minutesToTimeOfDay, parseTimeOfDay } from '@/domain/time/clock';
import { epochFor } from '@/domain/time/clock';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatDoseText, formatItemDose, unitLabel } from '@/i18n/dose';
import { formatDuration, formatLocalDate, formatTime } from '@/i18n/format';
import { useFormatContext, useSnapshot } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { Badge, Stepper } from '@/ui/components/Controls';
import { Field } from '@/ui/components/Field';
import { Icon } from '@/ui/components/Icon';
import { TimeField } from '@/ui/components/Pickers';
import { Pressable } from '@/ui/components/Pressable';
import { Sheet } from '@/ui/components/Sheet';
import { Text } from '@/ui/components/Text';
import { useDoseActions } from './useDoseActions';

export interface DoseActionSheetProps {
  view: OccurrenceView | null;
  item: Item | null;
  onClose: () => void;
}

type Mode = 'menu' | 'earlier' | 'skip' | 'snooze';

/** Every action for one scheduled occurrence: taken now/earlier, skip, snooze, remind tonight, mark missed. */
export function DoseActionSheet({ view, item, onClose }: DoseActionSheetProps) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const actions = useDoseActions();
  const [mode, setMode] = useState<Mode>('menu');
  const [earlierTime, setEarlierTime] = useState('08:00');
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (view && item) {
      setMode('menu');
      setAmount(item.doseAmount);
      setEarlierTime(minutesToTimeOfDay(Math.min(view.occurrence.scheduledMinutes, wallClock(Date.now(), format.tz).minutes)));
      setReason(null);
      setNote('');
    }
  }, [view, item, format.tz]);

  if (!view || !item) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const occurrence = view.occurrence;
  const scheduledText = t('dose.scheduledContext', { time: formatTime(occurrence.scheduledAt, format), date: formatLocalDate(occurrence.localDate, 'long', language) });
  const isFinal = view.isFinal;
  const close = () => onClose();

  const header = (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Badge label={t(item.kind === 'medication' ? 'common.medication' : 'common.supplement')} tone={item.kind === 'medication' ? 'medication' : 'primary'} />
        {item.isDemo ? <Badge label={t('common.demo')} tone="demo" /> : null}
      </View>
      <Text variant="body" color="secondary">
        {formatItemDose(item, language)} · {scheduledText}
      </Text>
    </View>
  );

  const renderMenu = () => (
    <View style={{ gap: theme.spacing.sm }}>
      {!isFinal ? (
        <Button label={t('dose.takeNow')} icon="check" size="lg" full onPress={() => void actions.take(view).then(close)} />
      ) : null}
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        <Chip label={t('dose.takenEarlier')} icon="clock" onPress={() => setMode('earlier')} />
        {!isFinal || view.status !== 'skipped' ? <Chip label={t('dose.skip')} icon="minus-circle" onPress={() => setMode('skip')} /> : null}
        {!isFinal ? <Chip label={t('dose.snooze')} icon="bell" onPress={() => setMode('snooze')} /> : null}
        {!isFinal ? <Chip label={t('dose.remindTonight')} icon="moon" onPress={() => void actions.remindTonight(view).then(close)} /> : null}
        {!isFinal && (view.status === 'overdue' || view.status === 'autoMissed') ? <Chip label={t('dose.markMissed')} icon="x-circle" onPress={() => void actions.markMissed(view).then(close)} /> : null}
      </View>
      {isFinal && view.log ? (
        <View style={{ backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, padding: theme.spacing.md, gap: 4 }}>
          <Text variant="smallStrong">{statusLine(view, t, format)}</Text>
          {view.log.amount !== null && view.log.unit ? (
            <Text variant="small" color="secondary">
              {t('dose.amount')}: {formatDoseText(view.log.amount, view.log.unit, language)}
            </Text>
          ) : null}
          {view.log.reason ? (
            <Text variant="small" color="secondary">
              {t('dose.reason')}: {view.log.reason}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderEarlier = () => (
    <View style={{ gap: theme.spacing.md }}>
      <TimeField label={t('dose.when')} value={earlierTime} onChange={setEarlierTime} format={format} />
      <View style={{ gap: 6 }}>
        <Text variant="smallStrong" color="secondary">
          {t('dose.amount')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Stepper value={amount} min={0.25} max={99} step={amount < 2 ? 0.5 : 1} onChange={setAmount} accessibilityLabel={t('dose.amount')} />
          <Text variant="body" color="secondary">
            {unitLabel(item.doseUnit, amount, language)}
          </Text>
        </View>
      </View>
      <Field label={t('dose.note')} placeholder={t('dose.notePlaceholder')} value={note} onChangeText={setNote} />
      <Button
        label={t('dose.taken')}
        icon="check"
        full
        size="lg"
        onPress={() => {
          const minutes = parseTimeOfDay(earlierTime);
          const at = epochFor(occurrence.localDate, minutes, format.tz);
          void actions.take(view, { at, amount, note: note.trim() || null }).then(close);
        }}
      />
      <Button label={t('common.back')} variant="ghost" full onPress={() => setMode('menu')} />
    </View>
  );

  const reasons = ['forgot', 'unwell', 'outOfStock', 'notNeeded', 'other'] as const;
  const renderSkip = () => (
    <View style={{ gap: theme.spacing.md }}>
      <Text variant="smallStrong" color="secondary">
        {t('dose.reason')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {reasons.map((key) => {
          const label = t(`dose.reasons.${key}` as const);
          return <Chip key={key} label={label} selected={reason === label} onPress={() => setReason(reason === label ? null : label)} />;
        })}
      </View>
      <Field label={t('dose.note')} placeholder={t('dose.notePlaceholder')} value={note} onChangeText={setNote} />
      <Button label={t('dose.skip')} icon="minus-circle" variant="secondary" full size="lg" onPress={() => void actions.skip(view, reason, note.trim() || null).then(close)} />
      <Button label={t('common.back')} variant="ghost" full onPress={() => setMode('menu')} />
    </View>
  );

  const snoozeOptions = [5, 10, 15, 30, 60];
  const renderSnooze = () => (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {snoozeOptions.map((minutes) => (
          <Chip key={minutes} label={t('dose.snoozeFor', { duration: formatDuration(minutes, language) })} icon="clock" onPress={() => void actions.snooze(view, minutes).then(close)} />
        ))}
      </View>
      <Text variant="small" color="muted">
        {t('dose.remindTonightAt', { time: formatTime(epochFor(occurrence.localDate, parseTimeOfDay(snapshot.settings.reminders.remindTonightTime), format.tz), format) })}
      </Text>
      <Button label={t('common.back')} variant="ghost" full onPress={() => setMode('menu')} />
    </View>
  );

  return (
    <Sheet visible={Boolean(view)} onClose={close} title={item.displayName} scroll>
      {header}
      {mode === 'menu' ? renderMenu() : mode === 'earlier' ? renderEarlier() : mode === 'skip' ? renderSkip() : renderSnooze()}
      <View style={{ height: 4 }} />
      {isFinal && view.log ? (
        <Pressable onPress={() => setMode('earlier')} accessibilityRole="button" accessibilityLabel={t('dose.correct')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
          <Icon name="edit-2" size={16} color={theme.colors.primary} />
          <Text variant="smallStrong" color="primary">
            {t('dose.correct')}
          </Text>
        </Pressable>
      ) : null}
    </Sheet>
  );
}

export function statusLine(view: OccurrenceView, t: ReturnType<typeof useI18n>['t'], format: ReturnType<typeof useFormatContext>): string {
  switch (view.status) {
    case 'taken':
      return t('today.takenAt', { time: view.log ? formatTime(view.log.at, format) : '' });
    case 'skipped':
      return t('today.skippedAt');
    case 'missed':
      return t('today.missedLabel');
    case 'autoMissed':
      return t('today.autoMissed');
    case 'snoozed':
      return view.state?.remindAt ? t('today.remindAt', { time: formatTime(view.effectiveAt, format) }) : t('today.snoozedUntil', { time: formatTime(view.effectiveAt, format) });
    case 'due':
      return t('today.dueAt', { time: formatTime(view.occurrence.scheduledAt, format) });
    case 'overdue':
      return t('today.dueAt', { time: formatTime(view.occurrence.scheduledAt, format) });
    case 'upcoming':
      return t('today.scheduledFor', { time: formatTime(view.occurrence.scheduledAt, format) });
  }
}
