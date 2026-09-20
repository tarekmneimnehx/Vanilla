import React, { useState } from 'react';
import { View } from 'react-native';
import type { CatalogEntry } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useStore, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { haptic } from '@/ui/haptics';
import { draftFromCatalog, draftToInput, emptyDraft, validateDraft, type DraftErrors, type ItemDraft } from './itemDraft';
import { CatalogSearch } from './CatalogSearch';
import { ItemForm } from './ItemForm';
import { draftToDefinition, emptyScheduleDraft, ScheduleForm, validateScheduleDraft, type ScheduleDraft, type ScheduleErrors } from '../schedule/ScheduleForm';

export type AddItemStep = 'search' | 'details' | 'schedule';

export interface AddItemFlowProps {
  onDone: (itemId: string) => void;
  onCancel?: () => void;
  /** Called whenever the step changes (used by hosts to update their header). */
  onStepChange?: (step: AddItemStep) => void;
  initialStep?: AddItemStep;
}

/** Catalog search → item details → schedule. Shared by the New item screen and onboarding. */
export function AddItemFlow({ onDone, onCancel, onStepChange, initialStep = 'search' }: AddItemFlowProps) {
  const theme = useTheme();
  const store = useStore();
  const toast = useToast();
  const today = useToday();
  const { t } = useI18n();
  const [step, setStepState] = useState<AddItemStep>(initialStep);
  const [draft, setDraft] = useState<ItemDraft>(() => emptyDraft());
  const [errors, setErrors] = useState<DraftErrors>({});
  const [schedule, setSchedule] = useState<ScheduleDraft>(() => emptyScheduleDraft(today, { kind: 'exact', time: '08:00' }));
  const [scheduleErrors, setScheduleErrors] = useState<ScheduleErrors>({});
  const [saving, setSaving] = useState(false);

  const setStep = (next: AddItemStep) => {
    setStepState(next);
    onStepChange?.(next);
  };

  const pick = (entry: CatalogEntry) => {
    setDraft(draftFromCatalog(entry));
    setStep('details');
  };
  const manual = (query: string) => {
    setDraft({ ...emptyDraft(), displayName: query.trim() });
    setStep('details');
  };
  const continueToSchedule = () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep('schedule');
  };
  const save = async () => {
    const found = validateScheduleDraft(schedule);
    setScheduleErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const { item } = await store.addItem(draftToInput(draft), draftToDefinition(schedule));
      haptic.success();
      toast.show({ message: t('item.created'), icon: 'check' });
      onDone(item.id);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      {step === 'search' ? <CatalogSearch onPick={pick} onManual={manual} /> : null}
      {step === 'details' ? (
        <>
          <ItemForm draft={draft} onChange={setDraft} errors={errors} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            <Button label={t('common.back')} variant="ghost" onPress={() => setStep('search')} />
            <Button label={t('common.next')} iconEnd="arrow-right" onPress={continueToSchedule} style={{ flex: 1 }} />
          </View>
        </>
      ) : null}
      {step === 'schedule' ? (
        <>
          <View style={{ gap: 2 }}>
            <Text variant="heading" ltr>
              {draft.displayName}
            </Text>
            <Text variant="small" color="secondary">
              {t('onboarding.schedule.subtitle')}
            </Text>
          </View>
          <ScheduleForm draft={schedule} onChange={setSchedule} errors={scheduleErrors} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            <Button label={t('common.back')} variant="ghost" onPress={() => setStep('details')} />
            <Button label={t('common.save')} icon="check" onPress={() => void save()} loading={saving} style={{ flex: 1 }} />
          </View>
        </>
      ) : null}
      {onCancel && step === 'search' ? <Button label={t('common.cancel')} variant="ghost" onPress={onCancel} full /> : null}
    </View>
  );
}
