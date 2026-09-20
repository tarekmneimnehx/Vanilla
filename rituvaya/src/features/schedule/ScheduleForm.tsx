import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { anchorsOn, slotKey } from '@/domain/schedule/slots';
import type { ScheduleDefinition } from '@/domain/services/scheduleService';
import { addDays, type LocalDate } from '@/domain/time/localDate';
import type { AnchorKey, Recurrence, Schedule, TimeSlot, Weekday } from '@/domain/types';
import { ANCHOR_KEYS } from '@/domain/types';
import { useI18n, type TranslationKey } from '@/i18n';
import { formatDuration, weekdayNames, weekStartsOn } from '@/i18n/format';
import { useFormatContext, useIndexes, useSnapshot, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button, IconButton } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { SectionHeader, Segmented, Stepper, SwitchRow } from '@/ui/components/Controls';
import { Icon } from '@/ui/components/Icon';
import { DateField, TimeField } from '@/ui/components/Pickers';
import { Sheet } from '@/ui/components/Sheet';
import { Text } from '@/ui/components/Text';
import { slotLabel } from './summary';

export type FrequencyKey = 'daily' | 'weekdays' | 'everyOtherDay' | 'interval' | 'cycle' | 'asNeeded';

export interface ScheduleDraft {
  frequency: FrequencyKey;
  weekdays: Weekday[];
  everyDays: number;
  onDays: number;
  offDays: number;
  slots: TimeSlot[];
  startDate: LocalDate;
  endDate: LocalDate | null;
  reminders: 'default' | 'off' | 'custom';
  repeatCount: number;
  repeatIntervalMinutes: number;
}

export function emptyScheduleDraft(today: LocalDate, defaultSlot: TimeSlot): ScheduleDraft {
  return { frequency: 'daily', weekdays: [1, 2, 3, 4, 5], everyDays: 3, onDays: 5, offDays: 2, slots: [defaultSlot], startDate: today, endDate: null, reminders: 'default', repeatCount: 3, repeatIntervalMinutes: 15 };
}

export function draftFromSchedule(schedule: Schedule, today: LocalDate): ScheduleDraft {
  const base = emptyScheduleDraft(today, { kind: 'exact', time: '08:00' });
  const r = schedule.recurrence;
  const draft: ScheduleDraft = { ...base, slots: schedule.slots, startDate: schedule.startDate, endDate: schedule.endDate };
  switch (r.type) {
    case 'daily':
      draft.frequency = 'daily';
      break;
    case 'weekdays':
      draft.frequency = 'weekdays';
      draft.weekdays = r.weekdays;
      break;
    case 'interval':
      draft.frequency = r.everyDays === 2 ? 'everyOtherDay' : 'interval';
      draft.everyDays = r.everyDays;
      break;
    case 'cycle':
      draft.frequency = 'cycle';
      draft.onDays = r.onDays;
      draft.offDays = r.offDays;
      break;
    case 'asNeeded':
      draft.frequency = 'asNeeded';
      break;
  }
  if (schedule.reminders === null) draft.reminders = 'default';
  else if (!schedule.reminders.enabled) draft.reminders = 'off';
  else {
    draft.reminders = 'custom';
    draft.repeatCount = schedule.reminders.repeatCount;
    draft.repeatIntervalMinutes = schedule.reminders.repeatIntervalMinutes;
  }
  return draft;
}

export function draftToDefinition(draft: ScheduleDraft): ScheduleDefinition {
  let recurrence: Recurrence;
  switch (draft.frequency) {
    case 'daily':
      recurrence = { type: 'daily' };
      break;
    case 'weekdays':
      recurrence = { type: 'weekdays', weekdays: draft.weekdays };
      break;
    case 'everyOtherDay':
      recurrence = { type: 'interval', everyDays: 2 };
      break;
    case 'interval':
      recurrence = { type: 'interval', everyDays: draft.everyDays };
      break;
    case 'cycle':
      recurrence = { type: 'cycle', onDays: draft.onDays, offDays: draft.offDays };
      break;
    case 'asNeeded':
      recurrence = { type: 'asNeeded' };
      break;
  }
  return {
    recurrence,
    slots: draft.frequency === 'asNeeded' ? [] : draft.slots,
    startDate: draft.startDate,
    endDate: draft.endDate,
    reminders: draft.reminders === 'default' ? null : draft.reminders === 'off' ? { enabled: false, repeatCount: 0, repeatIntervalMinutes: 15 } : { enabled: true, repeatCount: draft.repeatCount, repeatIntervalMinutes: draft.repeatIntervalMinutes },
  };
}

export type ScheduleErrors = Partial<Record<'slots' | 'weekdays' | 'interval' | 'cycle' | 'endDate', TranslationKey>>;

export function validateScheduleDraft(draft: ScheduleDraft): ScheduleErrors {
  const errors: ScheduleErrors = {};
  if (draft.frequency !== 'asNeeded' && draft.slots.length === 0) errors.slots = 'schedule.errors.slots';
  if (draft.frequency === 'weekdays' && draft.weekdays.length === 0) errors.weekdays = 'schedule.errors.weekdays';
  if (draft.frequency === 'interval' && draft.everyDays < 2) errors.interval = 'schedule.errors.interval';
  if (draft.frequency === 'cycle' && (draft.onDays < 1 || draft.offDays < 1)) errors.cycle = 'schedule.errors.cycle';
  if (draft.endDate && draft.endDate < draft.startDate) errors.endDate = 'schedule.errors.endDate';
  return errors;
}

export interface ScheduleFormProps {
  draft: ScheduleDraft;
  onChange: (draft: ScheduleDraft) => void;
  errors: ScheduleErrors;
}

const FREQUENCIES: FrequencyKey[] = ['daily', 'weekdays', 'everyOtherDay', 'interval', 'cycle', 'asNeeded'];

export function ScheduleForm({ draft, onChange, errors }: ScheduleFormProps) {
  const theme = useTheme();
  const router = useRouter();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const today = useToday();
  const [adding, setAdding] = useState(false);
  const set = <K extends keyof ScheduleDraft>(key: K, value: ScheduleDraft[K]) => onChange({ ...draft, [key]: value });
  const summaryCtx = useMemo(() => ({ language, format, anchorHistory: snapshot.settings.anchorHistory, groupsById: idx.groupsById, today }), [language, format, snapshot.settings.anchorHistory, idx.groupsById, today]);
  const names = weekdayNames(language, 'short');
  const weekStart = weekStartsOn(language);
  const orderedDays = Array.from({ length: 7 }, (_, i) => ((weekStart + i) % 7) as Weekday);

  return (
    <View style={{ gap: theme.spacing.md }}>
      <SectionHeader title={t('schedule.frequency')} />
      <Card style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FREQUENCIES.map((key) => (
            <Chip key={key} label={t(`schedule.types.${key}` as const)} selected={draft.frequency === key} onPress={() => set('frequency', key)} />
          ))}
        </View>
        {draft.frequency === 'asNeeded' ? (
          <Text variant="small" color="secondary">
            {t('schedule.typeHints.asNeeded')}
          </Text>
        ) : null}
        {draft.frequency === 'weekdays' ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {orderedDays.map((day) => {
                const selected = draft.weekdays.includes(day);
                return <Chip key={day} label={names[day]} selected={selected} onPress={() => set('weekdays', selected ? draft.weekdays.filter((d) => d !== day) : [...draft.weekdays, day])} />;
              })}
            </View>
            {errors.weekdays ? (
              <Text variant="small" color="danger">
                {t(errors.weekdays)}
              </Text>
            ) : null}
          </View>
        ) : null}
        {draft.frequency === 'interval' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{t('schedule.everyNDays')}</Text>
              <Text variant="small" color="secondary">
                {t('schedule.typeHints.interval')}
              </Text>
            </View>
            <Stepper value={draft.everyDays} min={2} max={90} onChange={(v) => set('everyDays', v)} accessibilityLabel={t('schedule.everyNDays')} format={(v) => t('common.days', { count: v })} />
          </View>
        ) : null}
        {draft.frequency === 'cycle' ? (
          <View style={{ gap: 8 }}>
            <Text variant="small" color="secondary">
              {t('schedule.typeHints.cycle')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyStrong">{t('schedule.onDays')}</Text>
              <Stepper value={draft.onDays} min={1} max={60} onChange={(v) => set('onDays', v)} accessibilityLabel={t('schedule.onDays')} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyStrong">{t('schedule.offDays')}</Text>
              <Stepper value={draft.offDays} min={1} max={60} onChange={(v) => set('offDays', v)} accessibilityLabel={t('schedule.offDays')} />
            </View>
            {errors.cycle ? (
              <Text variant="small" color="danger">
                {t(errors.cycle)}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Card>

      {draft.frequency !== 'asNeeded' ? (
        <>
          <SectionHeader title={t('schedule.times')} action={t('schedule.addTime')} onAction={() => setAdding(true)} />
          <Card style={{ gap: 4 }}>
            {draft.slots.length === 0 ? (
              <Text variant="small" color={errors.slots ? 'danger' : 'secondary'}>
                {errors.slots ? t(errors.slots) : t('schedule.timesHint')}
              </Text>
            ) : null}
            {draft.slots.map((slot, index) => (
              <View key={slotKey(slot)} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 52 }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={slot.kind === 'group' ? 'layers' : slot.kind === 'anchor' ? 'sunrise' : 'clock'} size={18} color={theme.colors.primary} mirror={false} />
                </View>
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {slotLabel(slot, summaryCtx)}
                </Text>
                <IconButton icon="x" size={18} accessibilityLabel={t('common.remove')} onPress={() => set('slots', draft.slots.filter((_, i) => i !== index))} />
              </View>
            ))}
            {draft.slots.length > 0 ? <Button label={t('schedule.addTime')} icon="plus" variant="ghost" size="sm" onPress={() => setAdding(true)} /> : <Button label={t('schedule.addTime')} icon="plus" variant="secondary" onPress={() => setAdding(true)} />}
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('schedule.startDate')} />
      <Card style={{ gap: theme.spacing.md }}>
        <DateField label={t('schedule.startDate')} value={draft.startDate} onChange={(d) => set('startDate', d)} language={language} />
        <SwitchRow label={t('schedule.setEnd')} value={draft.endDate !== null} onChange={(on) => set('endDate', on ? addDays(draft.startDate, 30) : null)} />
        {draft.endDate ? <DateField label={t('schedule.endDate')} value={draft.endDate} onChange={(d) => set('endDate', d)} language={language} min={draft.startDate} /> : null}
        {errors.endDate ? (
          <Text variant="small" color="danger">
            {t(errors.endDate)}
          </Text>
        ) : null}
      </Card>

      {draft.frequency !== 'asNeeded' ? (
        <>
          <SectionHeader title={t('schedule.reminders')} />
          <Card style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(
                [
                  { value: 'default', label: t('schedule.remindersDefault') },
                  { value: 'custom', label: t('schedule.remindersCustom') },
                  { value: 'off', label: t('schedule.remindersOff') },
                ] as { value: ScheduleDraft['reminders']; label: string }[]
              ).map((option) => (
                <Chip key={option.value} label={option.label} selected={draft.reminders === option.value} onPress={() => set('reminders', option.value)} />
              ))}
            </View>
            {draft.reminders === 'custom' ? (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="bodyStrong">{t('schedule.repeatCount')}</Text>
                  <Stepper value={draft.repeatCount} min={0} max={6} onChange={(v) => set('repeatCount', v)} accessibilityLabel={t('schedule.repeatCount')} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="bodyStrong">{t('schedule.repeatInterval')}</Text>
                  <Stepper value={draft.repeatIntervalMinutes} min={5} max={120} step={5} onChange={(v) => set('repeatIntervalMinutes', v)} accessibilityLabel={t('schedule.repeatInterval')} />
                </View>
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      <AddSlotSheet
        visible={adding}
        onClose={() => setAdding(false)}
        onAdd={(slot) => {
          const exists = draft.slots.some((s) => slotKey(s) === slotKey(slot));
          if (!exists) set('slots', [...draft.slots, slot]);
          setAdding(false);
        }}
        onNewGroup={() => {
          setAdding(false);
          router.push('/group/new');
        }}
      />
    </View>
  );
}

function AddSlotSheet({ visible, onClose, onAdd, onNewGroup }: { visible: boolean; onClose: () => void; onAdd: (slot: TimeSlot) => void; onNewGroup: () => void }) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const today = useToday();
  const [kind, setKind] = useState<'exact' | 'anchor' | 'group'>('exact');
  const [time, setTime] = useState('08:00');
  const [anchor, setAnchor] = useState<AnchorKey>('breakfast');
  const [offset, setOffset] = useState(0);
  const [groupId, setGroupId] = useState<string | null>(null);
  const anchors = anchorsOn(snapshot.settings.anchorHistory, today);
  const groups = snapshot.groups.filter((g) => g.archivedAt === null);
  const summaryCtx = { language, format, anchorHistory: snapshot.settings.anchorHistory, groupsById: idx.groupsById, today };

  const slot: TimeSlot | null = kind === 'exact' ? { kind: 'exact', time } : kind === 'anchor' ? { kind: 'anchor', anchor, offsetMinutes: offset } : groupId ? { kind: 'group', groupId } : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={t('schedule.addTime')} footer={<Button label={t('common.add')} icon="plus" full disabled={!slot || (kind === 'anchor' && !anchors[anchor])} onPress={() => slot && onAdd(slot)} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(
          [
            { value: 'exact', label: t('schedule.exactTime'), icon: 'clock' },
            { value: 'anchor', label: t('schedule.anchor'), icon: 'sunrise' },
            { value: 'group', label: t('schedule.group'), icon: 'layers' },
          ] as { value: 'exact' | 'anchor' | 'group'; label: string; icon: 'clock' | 'sunrise' | 'layers' }[]
        ).map((option) => (
          <Chip key={option.value} label={option.label} icon={option.icon} selected={kind === option.value} onPress={() => setKind(option.value)} />
        ))}
      </View>
      {kind === 'exact' ? <TimeField label={t('schedule.exactTime')} value={time} onChange={setTime} format={format} /> : null}
      {kind === 'anchor' ? (
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ANCHOR_KEYS.map((key) => (
              <Chip key={key} label={t(`schedule.anchorTitles.${key}` as const)} selected={anchor === key} onPress={() => setAnchor(key)} disabled={!anchors[key]} />
            ))}
          </View>
          {!anchors[anchor] ? (
            <Text variant="small" color="warn">
              {t('schedule.anchorNotSet', { anchor: t(`schedule.anchorTitles.${anchor}` as const) })}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="bodyStrong">{t('schedule.offset')}</Text>
            <Stepper value={offset} min={-180} max={180} step={15} onChange={setOffset} accessibilityLabel={t('schedule.offset')} format={(v) => (v === 0 ? '0' : v < 0 ? `−${formatDuration(-v, language)}` : `+${formatDuration(v, language)}`)} />
          </View>
          {slot && anchors[anchor] ? (
            <Text variant="small" color="secondary">
              {slotLabel(slot, summaryCtx)}
            </Text>
          ) : null}
        </View>
      ) : null}
      {kind === 'group' ? (
        <View style={{ gap: theme.spacing.md }}>
          {groups.length === 0 ? (
            <Text variant="small" color="secondary">
              {t('routine.noGroupsSubtitle')}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {groups.map((group) => (
                <Chip key={group.id} label={slotLabel({ kind: 'group', groupId: group.id }, summaryCtx)} selected={groupId === group.id} onPress={() => setGroupId(group.id)} />
              ))}
            </View>
          )}
          <Button label={t('routine.newGroup')} icon="plus" variant="ghost" size="sm" onPress={onNewGroup} />
        </View>
      ) : null}
    </Sheet>
  );
}
