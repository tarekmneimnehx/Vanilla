import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { epochFor, minutesToTimeOfDay, wallClock } from '@/domain/time/clock';
import type { DoseLog, FinalAction } from '@/domain/types';
import { useI18n } from '@/i18n';
import { unitLabel } from '@/i18n/dose';
import { formatLocalDate, formatTime } from '@/i18n/format';
import { useFormatContext, useStore } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Chip } from '@/ui/components/Chip';
import { Stepper } from '@/ui/components/Controls';
import { Field } from '@/ui/components/Field';
import { TimeField } from '@/ui/components/Pickers';
import { Sheet } from '@/ui/components/Sheet';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';

export interface LogEditSheetProps {
  log: DoseLog | null;
  onClose: () => void;
}

/** History correction: change what happened, when, how much, and why; or delete the record. */
export function LogEditSheet({ log, onClose }: LogEditSheetProps) {
  const theme = useTheme();
  const store = useStore();
  const toast = useToast();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const [action, setAction] = useState<FinalAction>('taken');
  const [time, setTime] = useState('08:00');
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!log) return;
    setAction(log.action);
    setTime(minutesToTimeOfDay(wallClock(log.at, format.tz).minutes));
    setAmount(log.amount ?? 1);
    setReason(log.reason ?? '');
    setNote(log.note ?? '');
  }, [log, format.tz]);

  if (!log) return <Sheet visible={false} onClose={onClose}>{null}</Sheet>;

  const save = async () => {
    const date = wallClock(log.at, format.tz).date;
    const [h, m] = time.split(':').map(Number);
    const at = epochFor(date, h * 60 + m, format.tz);
    await store.correct(log.id, { action, at, amount: action === 'taken' ? amount : null, unit: action === 'taken' ? log.unit ?? undefined : null, reason: reason.trim() || null, note: note.trim() || null });
    toast.show({ message: t('history.editRecord'), icon: 'check' });
    onClose();
  };
  const remove = async () => {
    await store.undo(log.id);
    toast.show({ message: t('history.deleteRecord'), icon: 'trash-2', actionLabel: t('common.undo'), onAction: () => store.restore(log.id) });
    onClose();
  };

  return (
    <Sheet visible={Boolean(log)} onClose={onClose} title={log.itemNameSnapshot} subtitle={log.scheduledAt ? t('dose.scheduledContext', { time: formatTime(log.scheduledAt, format), date: formatLocalDate(log.localDate, 'long', language) }) : t('dose.unscheduled')} footer={<Button label={t('common.save')} full onPress={() => void save()} />}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(['taken', 'skipped', 'missed'] as FinalAction[]).map((a) => (
          <Chip key={a} label={t(a === 'taken' ? 'dose.taken' : a === 'skipped' ? 'dose.skipped' : 'dose.missed')} selected={action === a} onPress={() => setAction(a)} />
        ))}
      </View>
      <TimeField label={t('dose.when')} value={time} onChange={setTime} format={format} />
      {action === 'taken' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="smallStrong" color="secondary" style={{ flex: 1 }}>
            {t('dose.amount')}
          </Text>
          <Stepper value={amount} min={0.25} max={99} step={amount < 2 ? 0.5 : 1} onChange={setAmount} accessibilityLabel={t('dose.amount')} />
          <Text variant="small" color="secondary">
            {unitLabel(log.unit ?? 'dose', amount, language)}
          </Text>
        </View>
      ) : (
        <Field label={t('dose.reason')} placeholder={t('dose.reasonPlaceholder')} value={reason} onChangeText={setReason} />
      )}
      <Field label={t('dose.note')} placeholder={t('dose.notePlaceholder')} value={note} onChangeText={setNote} />
      <Button label={t('history.deleteRecord')} variant="danger" icon="trash-2" onPress={() => void remove()} />
    </Sheet>
  );
}
