import React, { useState } from 'react';
import { View } from 'react-native';
import { withValueFrom } from '@/domain/dated';
import { anchorsOn } from '@/domain/schedule/slots';
import { parseTimeOfDay } from '@/domain/time/clock';
import type { AnchorKey, Anchors } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useFormatContext, useSnapshot, useStore, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { useGoBack } from '@/ui/useGoBack';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { SectionHeader } from '@/ui/components/Controls';
import { TimeField } from '@/ui/components/Pickers';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';

const MEALS: AnchorKey[] = ['breakfast', 'lunch', 'dinner'];
const DEFAULT_MEAL: Record<AnchorKey, string> = { wake: '07:00', breakfast: '08:00', lunch: '13:00', dinner: '19:00', bedtime: '22:30' };

export function AnchorsEditor({ value, onChange, error }: { value: Anchors; onChange: (a: Anchors) => void; error?: string | null }) {
  const theme = useTheme();
  const { t } = useI18n();
  const format = useFormatContext();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Card style={{ gap: theme.spacing.md }}>
        <TimeField label={t('onboarding.day.wake')} value={value.wake ?? DEFAULT_MEAL.wake} onChange={(v) => onChange({ ...value, wake: v })} format={format} />
        <TimeField label={t('onboarding.day.bedtime')} value={value.bedtime ?? DEFAULT_MEAL.bedtime} onChange={(v) => onChange({ ...value, bedtime: v })} format={format} />
        {error ? (
          <Text variant="small" color="danger">
            {error}
          </Text>
        ) : null}
      </Card>
      <SectionHeader title={t('onboarding.day.meals')} />
      <Card style={{ gap: theme.spacing.md }}>
        <Text variant="small" color="secondary">
          {t('onboarding.day.mealsHint')}
        </Text>
        {MEALS.map((meal) =>
          value[meal] ? (
            <View key={meal} style={{ gap: 6 }}>
              <TimeField label={t(`schedule.anchorTitles.${meal}` as const)} value={value[meal] ?? DEFAULT_MEAL[meal]} onChange={(v) => onChange({ ...value, [meal]: v })} format={format} />
              <Button label={t('onboarding.day.clearMeal')} variant="ghost" size="sm" icon="x" onPress={() => onChange({ ...value, [meal]: null })} />
            </View>
          ) : (
            <Button key={meal} label={t('onboarding.day.setMeal', { meal: t(`schedule.anchorTitles.${meal}` as const) })} variant="secondary" size="sm" icon="plus" onPress={() => onChange({ ...value, [meal]: DEFAULT_MEAL[meal] })} />
          ),
        )}
      </Card>
    </View>
  );
}

export function validateAnchors(value: Anchors): boolean {
  const wake = parseTimeOfDay(value.wake ?? DEFAULT_MEAL.wake);
  const bed = parseTimeOfDay(value.bedtime ?? DEFAULT_MEAL.bedtime);
  return bed > wake;
}

export default function DaySettingsScreen() {
  const goBack = useGoBack();
  const store = useStore();
  const toast = useToast();
  const today = useToday();
  const { t } = useI18n();
  const snapshot = useSnapshot();
  const [value, setValue] = useState<Anchors>(() => anchorsOn(snapshot.settings.anchorHistory, today));
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!validateAnchors(value)) {
      setError(t('onboarding.day.error'));
      return;
    }
    await store.updateSettings((s) => ({ ...s, anchorHistory: withValueFrom(s.anchorHistory, today, value) }));
    toast.show({ message: t('common.save'), icon: 'check' });
    goBack();
  };
  return (
    <Screen title={t('settings.anchors')} subtitle={t('settings.anchorsHint')} onBack={() => goBack()} testID="settings-day">
      <AnchorsEditor value={value} onChange={setValue} error={error} />
      <Button label={t('common.save')} icon="check" full onPress={() => void save()} />
    </Screen>
  );
}
