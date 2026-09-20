import React, { useState } from 'react';
import { View } from 'react-native';
import { anchorsOn, resolveSlotMinutes } from '@/domain/schedule/slots';
import { minutesToTimeOfDay } from '@/domain/time/clock';
import type { AnchorKey, GroupTime, RoutineGroup } from '@/domain/types';
import { ANCHOR_KEYS } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatDuration } from '@/i18n/format';
import { useFormatContext, useIndexes, useSnapshot, useStore, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { SectionHeader, Segmented, Stepper } from '@/ui/components/Controls';
import { Field } from '@/ui/components/Field';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { TimeField } from '@/ui/components/Pickers';
import { Sheet } from '@/ui/components/Sheet';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { slotLabel } from '../schedule/summary';
import { groupTimeOn } from '@/domain/schedule/slots';

export interface GroupEditorProps {
  group: RoutineGroup | null;
  onSaved: (group: RoutineGroup) => void;
  onArchived?: () => void;
}

export function GroupEditor({ group, onSaved, onArchived }: GroupEditorProps) {
  const theme = useTheme();
  const store = useStore();
  const toast = useToast();
  const today = useToday();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const initialTime = group ? (groupTimeOn(group, today) ?? { kind: 'exact', time: '08:00' }) : ({ kind: 'exact', time: '08:00' } as GroupTime);
  const [name, setName] = useState(group?.name ?? '');
  const [kind, setKind] = useState<'exact' | 'anchor'>(initialTime.kind);
  const [time, setTime] = useState(initialTime.kind === 'exact' ? initialTime.time : '08:00');
  const [anchor, setAnchor] = useState<AnchorKey>(initialTime.kind === 'anchor' ? initialTime.anchor : 'breakfast');
  const [offset, setOffset] = useState(initialTime.kind === 'anchor' ? initialTime.offsetMinutes : 0);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const anchors = anchorsOn(snapshot.settings.anchorHistory, today);
  const groupTime: GroupTime = kind === 'exact' ? { kind: 'exact', time } : { kind: 'anchor', anchor, offsetMinutes: offset };
  const summaryCtx = { language, format, anchorHistory: snapshot.settings.anchorHistory, groupsById: idx.groupsById, today };
  const members = group ? snapshot.schedules.filter((s) => s.effectiveTo === null && s.slots.some((slot) => slot.kind === 'group' && slot.groupId === group.id)).map((s) => idx.itemsById.get(s.itemId)).filter((i): i is NonNullable<typeof i> => Boolean(i)) : [];

  const save = async () => {
    if (!name.trim()) {
      setError(t('groups.errors.name'));
      return;
    }
    setError(null);
    const saved = group ? await store.editGroup(group.id, { name, time: groupTime }) : await store.addGroup(name, groupTime);
    toast.show({ message: t('groups.saved'), icon: 'check' });
    onSaved(saved);
  };

  const archive = async () => {
    if (!group) return;
    const minutes = resolveSlotMinutes({ kind: 'group', groupId: group.id }, today, summaryCtx) ?? 480;
    await store.removeGroup(group.id, minutesToTimeOfDay(minutes));
    setConfirmArchive(false);
    toast.show({ message: t('routine.archived'), icon: 'archive' });
    onArchived?.();
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <Card style={{ gap: theme.spacing.md }}>
        <Field label={t('groups.name')} placeholder={t('groups.namePlaceholder')} value={name} onChangeText={setName} error={error} hint={t('groups.examples')} autoFocus={!group} />
      </Card>
      <SectionHeader title={t('groups.time')} />
      <Card style={{ gap: theme.spacing.md }}>
        <Segmented
          options={[
            { value: 'exact', label: t('schedule.exactTime') },
            { value: 'anchor', label: t('schedule.anchor') },
          ]}
          value={kind}
          onChange={setKind}
        />
        {kind === 'exact' ? (
          <TimeField value={time} onChange={setTime} format={format} label={t('schedule.exactTime')} />
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ANCHOR_KEYS.map((key) => (
                <Chip key={key} label={t(`schedule.anchorTitles.${key}` as const)} selected={anchor === key} onPress={() => setAnchor(key)} disabled={!anchors[key]} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="bodyStrong">{t('schedule.offset')}</Text>
              <Stepper value={offset} min={-180} max={180} step={15} onChange={setOffset} accessibilityLabel={t('schedule.offset')} format={(v) => (v === 0 ? '0' : v < 0 ? `−${formatDuration(-v, language)}` : `+${formatDuration(v, language)}`)} />
            </View>
          </View>
        )}
        <Text variant="small" color="secondary">
          {slotLabel(groupTime, summaryCtx)} · {t('groups.timeHint')}
        </Text>
      </Card>
      {group ? (
        <>
          <SectionHeader title={t('groups.members')} />
          <Card padding={theme.spacing.md}>
            {members.length === 0 ? (
              <Text variant="small" color="secondary">
                {t('groups.noMembers')}
              </Text>
            ) : (
              members.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow title={item.displayName} titleLtr icon={item.kind === 'medication' ? 'plus-square' : 'feather'} />
                </View>
              ))
            )}
          </Card>
        </>
      ) : null}
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        <Button label={t('common.save')} icon="check" onPress={() => void save()} style={{ flex: 1 }} />
        {group ? <Button label={t('groups.archive')} icon="archive" variant="danger" onPress={() => setConfirmArchive(true)} /> : null}
      </View>
      <Sheet visible={confirmArchive} onClose={() => setConfirmArchive(false)} title={t('groups.archive')} scroll={false}>
        <Text variant="body" color="secondary">
          {t('groups.archiveBody')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={t('common.cancel')} variant="ghost" onPress={() => setConfirmArchive(false)} />
          <Button label={t('groups.archive')} variant="danger" onPress={() => void archive()} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </View>
  );
}
