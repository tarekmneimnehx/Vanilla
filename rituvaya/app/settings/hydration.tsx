import React, { useState } from 'react';
import { View } from 'react-native';
import { clampGoalMl, fromMl, toMl } from '@/domain/hydration/units';
import { goalOn } from '@/domain/services/hydrationService';
import { useI18n } from '@/i18n';
import { formatDuration } from '@/i18n/format';
import { useSnapshot, useStore, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { useGoBack } from '@/ui/useGoBack';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { SectionHeader, Stepper, SwitchRow } from '@/ui/components/Controls';
import { Field } from '@/ui/components/Field';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';

export default function HydrationSettingsScreen() {
  const theme = useTheme();
  const goBack = useGoBack();
  const store = useStore();
  const toast = useToast();
  const today = useToday();
  const { t, language, n } = useI18n();
  const snapshot = useSnapshot();
  const unit = snapshot.settings.volumeUnit;
  const unitShort = t(unit === 'ml' ? 'hydration.unitShort.ml' : 'hydration.unitShort.floz');
  const goal = goalOn(snapshot.settings, today);
  const [goalDraft, setGoalDraft] = useState(goal > 0 ? String(fromMl(goal, unit)) : '');
  const [goalError, setGoalError] = useState<string | null>(null);
  const [customQuick, setCustomQuick] = useState('');
  const quick = snapshot.settings.hydration.quickAddsMl;
  const saveGoal = async () => {
    const value = Number(goalDraft.replace(',', '.'));
    const ml = clampGoalMl(toMl(value, unit));
    if (!Number.isFinite(value) || ml < 250) {
      setGoalError(t('hydration.errors.goal', { min: `${n(fromMl(250, unit))} ${unitShort}`, max: `${n(fromMl(10_000, unit))} ${unitShort}` }));
      return;
    }
    setGoalError(null);
    await store.setHydrationGoal(ml);
    toast.show({ message: t('common.save'), icon: 'check' });
  };
  const setQuick = (list: number[]) => void store.updateSettings((s) => ({ ...s, hydration: { ...s.hydration, quickAddsMl: list } }));
  const addQuick = () => {
    const value = Number(customQuick.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0 || quick.length >= 4) return;
    setQuick([...quick, Math.round(toMl(value, unit))].sort((a, b) => a - b));
    setCustomQuick('');
  };
  return (
    <Screen title={t('settings.sections.hydration')} onBack={() => goBack()} keyboard testID="settings-hydration">
      <SectionHeader title={t('settings.hydrationGoal')} />
      <Card style={{ gap: theme.spacing.md }}>
        <Field placeholder={t('hydration.goalPlaceholder', { unit: unitShort })} value={goalDraft} onChangeText={setGoalDraft} keyboardType="decimal-pad" suffix={unitShort} error={goalError} ltr hint={t('onboarding.hydration.subtitle')} />
        <Button label={t('common.save')} icon="check" onPress={() => void saveGoal()} />
      </Card>
      <SectionHeader title={t('hydration.quickAdds')} />
      <Card style={{ gap: theme.spacing.md }}>
        <Text variant="small" color="secondary">
          {t('hydration.quickAddsHint')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {quick.map((ml) => (
            <Chip key={ml} label={`${n(fromMl(ml, unit))} ${unitShort}`} icon="x" tone="water" selected onPress={() => setQuick(quick.filter((v) => v !== ml))} accessibilityLabel={`${t('common.remove')} ${n(fromMl(ml, unit))} ${unitShort}`} />
          ))}
        </View>
        {quick.length < 4 ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field placeholder={t('hydration.customPlaceholder', { unit: unitShort })} value={customQuick} onChangeText={setCustomQuick} keyboardType="decimal-pad" suffix={unitShort} ltr onSubmitEditing={addQuick} />
            </View>
            <Button label={t('common.add')} variant="secondary" onPress={addQuick} style={{ minHeight: 52 }} />
          </View>
        ) : null}
      </Card>
      <SectionHeader title={t('hydration.reminders')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <SwitchRow label={t('hydration.reminders')} hint={t('hydration.remindersHint')} value={snapshot.settings.hydration.remindersEnabled} onChange={(v) => void store.updateSettings((s) => ({ ...s, hydration: { ...s.hydration, remindersEnabled: v } }))} />
        {snapshot.settings.hydration.remindersEnabled ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="bodyStrong">{t('hydration.reminderInterval')}</Text>
            <Stepper value={snapshot.settings.hydration.reminderIntervalMinutes} min={30} max={240} step={30} onChange={(v) => void store.updateSettings((s) => ({ ...s, hydration: { ...s.hydration, reminderIntervalMinutes: v } }))} accessibilityLabel={t('hydration.reminderInterval')} format={(v) => formatDuration(v, language)} />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}
