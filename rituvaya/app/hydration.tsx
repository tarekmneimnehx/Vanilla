import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { clampGoalMl, fromMl, progressRatio, toMl } from '@/domain/hydration/units';
import { goalOn, totalFor } from '@/domain/services/hydrationService';
import type { HydrationEntry } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatTime, formatVolume } from '@/i18n/format';
import { useFormatContext, useSnapshot, useStore, useStreaks, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button, IconButton } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { SectionHeader } from '@/ui/components/Controls';
import { EmptyState } from '@/ui/components/EmptyState';
import { Field } from '@/ui/components/Field';
import { HydrationGlass } from '@/ui/components/HydrationGlass';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Screen } from '@/ui/components/Screen';
import { Sheet } from '@/ui/components/Sheet';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { haptic } from '@/ui/haptics';

export default function HydrationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const toast = useToast();
  const { t, language, n } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const today = useToday();
  const streaks = useStreaks();
  const unit = snapshot.settings.volumeUnit;
  const unitShort = t(unit === 'ml' ? 'hydration.unitShort.ml' : 'hydration.unitShort.floz');
  const goalMl = goalOn(snapshot.settings, today);
  const totalMl = totalFor(snapshot.hydration, today);
  const entries = snapshot.hydration.filter((e) => e.deletedAt === null && e.localDate === today).sort((a, b) => b.at - a.at);
  const reached = goalMl > 0 && totalMl >= goalMl;
  const [custom, setCustom] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState('');
  const [goalOpen, setGoalOpen] = useState(goalMl <= 0);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [editing, setEditing] = useState<HydrationEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const add = async (ml: number) => {
    const entry = await store.addWater(ml);
    haptic.tap();
    toast.show({ message: t('hydration.added', { amount: formatVolume(ml, unit, language) }), icon: 'droplet', tone: 'water', actionLabel: t('common.undo'), onAction: () => store.removeWater(entry.id) });
  };

  const addCustom = () => {
    const value = Number(custom.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setCustomError(t('hydration.errors.amount'));
      return;
    }
    setCustomError(null);
    setCustom('');
    void add(toMl(value, unit));
  };

  const saveGoal = async () => {
    const value = Number(goalDraft.replace(',', '.'));
    const ml = clampGoalMl(toMl(value, unit));
    const min = fromMl(250, unit);
    const max = fromMl(10_000, unit);
    if (!Number.isFinite(value) || ml < 250) {
      setGoalError(t('hydration.errors.goal', { min: `${n(min)} ${unitShort}`, max: `${n(max)} ${unitShort}` }));
      return;
    }
    setGoalError(null);
    await store.setHydrationGoal(ml);
    setGoalOpen(false);
    haptic.success();
  };

  const saveEdit = async () => {
    if (!editing) return;
    const value = Number(editAmount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    await store.editWater(editing.id, { amountMl: toMl(value, unit) });
    toast.show({ message: t('hydration.updated'), icon: 'droplet', tone: 'water' });
    setEditing(null);
  };

  const remove = async (entry: HydrationEntry) => {
    await store.removeWater(entry.id);
    setEditing(null);
    toast.show({ message: t('hydration.removed'), icon: 'trash-2', tone: 'water', actionLabel: t('common.undo'), onAction: () => store.restoreWater(entry.id) });
  };

  return (
    <Screen title={t('hydration.title')} onBack={() => router.back()} keyboard testID="hydration">
      <Card style={{ alignItems: 'center', gap: theme.spacing.md }}>
        <HydrationGlass ratio={progressRatio(totalMl, goalMl)} width={132} height={168} accessibilityLabel={t('a11y.waterGlass', { amount: formatVolume(totalMl, unit, language), goal: formatVolume(goalMl, unit, language) })}>
          <Text variant="numeral" align="center" ltr style={{ color: progressRatio(totalMl, goalMl) > 0.55 ? '#FFFFFF' : theme.colors.text }}>
            {n(fromMl(totalMl, unit))}
          </Text>
          <Text variant="caption" align="center" style={{ color: progressRatio(totalMl, goalMl) > 0.65 ? '#FFFFFF' : theme.colors.textSecondary }}>
            {unitShort}
          </Text>
        </HydrationGlass>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text variant="subheading" align="center">
            {goalMl > 0 ? t('hydration.goalOf', { goal: formatVolume(goalMl, unit, language) }) : t('hydration.noGoalTitle')}
          </Text>
          <Text variant="small" color={reached ? 'water' : 'secondary'} align="center">
            {goalMl <= 0 ? t('hydration.noGoalSubtitle') : reached ? `${t('hydration.reached')} ${t('hydration.reachedSubtitle')}` : t('hydration.remaining', { amount: formatVolume(goalMl - totalMl, unit, language) })}
          </Text>
          <Text variant="caption" color="water" align="center">
            {t('today.streaks.hydration', { count: streaks.hydration })}
          </Text>
        </View>
        <Button label={goalMl > 0 ? t('common.change') : t('hydration.setGoal')} variant="ghost" size="sm" icon="target" onPress={() => { setGoalDraft(goalMl > 0 ? String(fromMl(goalMl, unit)) : ''); setGoalOpen(true); }} />
      </Card>

      <SectionHeader title={t('hydration.quickAdd')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {snapshot.settings.hydration.quickAddsMl.map((ml) => (
          <Chip key={ml} label={`${n(fromMl(ml, unit))} ${unitShort}`} icon="plus" tone="water" onPress={() => void add(ml)} accessibilityLabel={`${t('common.add')} ${formatVolume(ml, unit, language)}`} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field placeholder={t('hydration.customPlaceholder', { unit: unitShort })} value={custom} onChangeText={setCustom} keyboardType="decimal-pad" error={customError} suffix={unitShort} ltr accessibilityLabel={t('hydration.customAmount')} onSubmitEditing={addCustom} />
        </View>
        <Button label={t('common.add')} variant="water" onPress={addCustom} style={{ minHeight: 52 }} />
      </View>

      <SectionHeader title={t('hydration.entries')} />
      <Card padding={theme.spacing.md}>
        {entries.length === 0 ? (
          <EmptyState icon="droplet" title={t('hydration.noEntries')} compact />
        ) : (
          entries.map((entry, index) => (
            <View key={entry.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                title={formatVolume(entry.amountMl, unit, language)}
                subtitle={formatTime(entry.at, format)}
                titleLtr
                trailing={<IconButton icon="edit-2" size={18} accessibilityLabel={t('hydration.editEntry')} onPress={() => { setEditing(entry); setEditAmount(String(fromMl(entry.amountMl, unit))); }} />}
                leading={<View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: theme.colors.waterSoft, alignItems: 'center', justifyContent: 'center' }}><Text variant="caption" color="water">{entry.isDemo ? t('common.demo') : '•'}</Text></View>}
              />
            </View>
          ))
        )}
      </Card>

      <Sheet visible={goalOpen} onClose={() => setGoalOpen(false)} title={t('hydration.setGoal')} subtitle={t('onboarding.hydration.subtitle')} scroll={false} footer={<Button label={t('common.save')} full onPress={() => void saveGoal()} />}>
        <Field placeholder={t('hydration.goalPlaceholder', { unit: unitShort })} value={goalDraft} onChangeText={setGoalDraft} keyboardType="decimal-pad" suffix={unitShort} error={goalError} ltr autoFocus accessibilityLabel={t('hydration.setGoal')} />
      </Sheet>

      <Sheet visible={Boolean(editing)} onClose={() => setEditing(null)} title={t('hydration.editEntry')} scroll={false} footer={<Button label={t('common.save')} full onPress={() => void saveEdit()} />}>
        <Field label={t('hydration.amount')} value={editAmount} onChangeText={setEditAmount} keyboardType="decimal-pad" suffix={unitShort} ltr />
        {editing ? (
          <Text variant="small" color="secondary">
            {t('hydration.time')}: {formatTime(editing.at, format)}
          </Text>
        ) : null}
        {editing ? <Button label={t('common.remove')} variant="danger" icon="trash-2" onPress={() => void remove(editing)} /> : null}
      </Sheet>
    </Screen>
  );
}
