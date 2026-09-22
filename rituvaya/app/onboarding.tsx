import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { withValueFrom } from '@/domain/dated';
import { clampGoalMl, fromMl, toMl } from '@/domain/hydration/units';
import { anchorsOn } from '@/domain/schedule/slots';
import { goalOn } from '@/domain/services/hydrationService';
import type { Anchors, Language } from '@/domain/types';
import { LANGUAGES, isRTL, useI18n } from '@/i18n';
import { formatMinutes, formatVolume } from '@/i18n/format';
import { useDay, useFormatContext, useIndexes, useSnapshot, useStore, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { Badge, ProgressBar } from '@/ui/components/Controls';
import { Field } from '@/ui/components/Field';
import { Icon } from '@/ui/components/Icon';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { useReducedMotion } from '@/ui/motion';
import { applyLayoutDirection } from '@/ui/rtl';
import { AddItemFlow } from '@/features/item/AddItemFlow';
import { AnchorsEditor, validateAnchors } from './settings/day';
import { formatItemDose } from '@/i18n/dose';

const TOTAL_STEPS = 7;

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const today = useToday();
  const { t, language, n } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const day = useDay(today);
  const reduced = useReducedMotion();
  const { settings } = snapshot;
  const [step, setStep] = useState(() => Math.min(settings.onboarding.step, TOTAL_STEPS));
  const [name, setName] = useState(settings.preferredName);
  const [anchors, setAnchors] = useState<Anchors>(() => anchorsOn(settings.anchorHistory, today));
  const [anchorError, setAnchorError] = useState<string | null>(null);
  const unit = settings.volumeUnit;
  const unitShort = t(unit === 'ml' ? 'hydration.unitShort.ml' : 'hydration.unitShort.floz');
  const [goalDraft, setGoalDraft] = useState(() => (goalOn(settings, today) > 0 ? String(fromMl(goalOn(settings, today), unit)) : ''));
  const [goalError, setGoalError] = useState<string | null>(null);
  const [notifying, setNotifying] = useState(false);
  const [itemStep, setItemStep] = useState<'search' | 'details' | 'schedule'>('search');
  const resumed = useMemo(() => settings.onboarding.step > 0, []);

  const persistStep = (next: number) => {
    setStep(next);
    void store.updateSettings((s) => ({ ...s, onboarding: { ...s.onboarding, step: next } }));
  };
  const next = () => persistStep(Math.min(step + 1, TOTAL_STEPS));
  const back = () => persistStep(Math.max(step - 1, 0));

  const chooseLanguage = async (code: Language) => {
    await store.updateSettings((s) => ({ ...s, language: code }));
    // No reload here: it would restart the bundle and drop the user back on
    // this step. Screens mirror themselves, and forceRTL lands on next launch.
    await applyLayoutDirection(isRTL(code), { reload: false });
  };
  const saveName = () => {
    void store.updateSettings((s) => ({ ...s, preferredName: name.trim() }));
    next();
  };
  const saveAnchors = () => {
    if (!validateAnchors(anchors)) {
      setAnchorError(t('onboarding.day.error'));
      return;
    }
    setAnchorError(null);
    void store.updateSettings((s) => ({ ...s, anchorHistory: withValueFrom(s.anchorHistory, today, anchors) }));
    next();
  };
  const saveGoal = async () => {
    if (!goalDraft.trim()) {
      next();
      return;
    }
    const value = Number(goalDraft.replace(',', '.'));
    const ml = clampGoalMl(toMl(value, unit));
    if (!Number.isFinite(value) || ml < 250) {
      setGoalError(t('onboarding.hydration.error', { min: `${n(fromMl(250, unit))} ${unitShort}`, max: `${n(fromMl(10_000, unit))} ${unitShort}` }));
      return;
    }
    setGoalError(null);
    await store.setHydrationGoal(ml);
    next();
  };
  const finish = async () => {
    await store.updateSettings((s) => ({ ...s, onboarding: { ...s.onboarding, completed: true, completedAt: Date.now(), step: TOTAL_STEPS } }));
    router.replace('/(tabs)');
  };
  const requestNotifications = async () => {
    setNotifying(true);
    try {
      await store.requestNotificationPermission();
    } finally {
      setNotifying(false);
    }
  };

  const titles = [
    t('onboarding.language.title'),
    t('onboarding.name.title'),
    t('onboarding.day.title'),
    t('onboarding.hydration.title'),
    t('onboarding.firstItem.title'),
    t('onboarding.preview.title'),
    t('onboarding.notifications.title'),
  ];
  const subtitles = [
    t('onboarding.language.subtitle'),
    t('onboarding.name.subtitle'),
    t('onboarding.day.subtitle'),
    t('onboarding.hydration.subtitle'),
    t('onboarding.firstItem.subtitle'),
    t('onboarding.preview.subtitle'),
    t('onboarding.notifications.subtitle'),
  ];
  const stepIndex = Math.min(step, TOTAL_STEPS - 1);
  const permission = snapshot.permission.state;

  return (
    <Screen keyboard testID="onboarding">
      <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="label" color="secondary" style={{ textTransform: 'uppercase' }}>
            {t('onboarding.stepOf', { step: stepIndex + 1, total: TOTAL_STEPS })}
          </Text>
          <Text variant="label" color="primary">
            {t('app.name')}
          </Text>
        </View>
        <ProgressBar ratio={(stepIndex + 1) / TOTAL_STEPS} height={6} />
        {resumed && step > 0 && step < TOTAL_STEPS - 1 ? (
          <Text variant="caption" color="muted">
            {t('onboarding.resume')}
          </Text>
        ) : null}
        <Text variant="title" accessibilityRole="header" style={{ paddingTop: theme.spacing.sm }}>
          {titles[stepIndex]}
        </Text>
        <Text variant="body" color="secondary">
          {subtitles[stepIndex]}
        </Text>
      </View>

      <Animated.View key={stepIndex} entering={reduced ? undefined : FadeIn.duration(220)} exiting={reduced ? undefined : FadeOut.duration(120)} style={{ gap: theme.spacing.md }}>
        {stepIndex === 0 ? (
          <Card padding={theme.spacing.md}>
            {LANGUAGES.map((l, index) => (
              <View key={l.code}>
                {index > 0 ? <Divider /> : null}
                <ListRow title={l.nativeName} subtitle={l.name} onPress={() => void chooseLanguage(l.code)} trailing={l.code === language ? <Icon name="check-circle" color={theme.colors.primary} mirror={false} /> : null} accessibilityLabel={`${l.nativeName} (${l.name})`} />
              </View>
            ))}
          </Card>
        ) : null}

        {stepIndex === 1 ? (
          <Card>
            <Field placeholder={t('onboarding.name.placeholder')} value={name} onChangeText={setName} hint={t('onboarding.name.hint')} autoCapitalize="words" autoFocus returnKeyType="done" onSubmitEditing={saveName} />
          </Card>
        ) : null}

        {stepIndex === 2 ? <AnchorsEditor value={anchors} onChange={setAnchors} error={anchorError} /> : null}

        {stepIndex === 3 ? (
          <Card style={{ gap: theme.spacing.sm }}>
            <Field placeholder={t('onboarding.hydration.placeholder')} value={goalDraft} onChangeText={setGoalDraft} keyboardType="decimal-pad" suffix={unitShort} error={goalError} hint={t('onboarding.hydration.hint')} ltr autoFocus />
          </Card>
        ) : null}

        {stepIndex === 4 ? (
          settings.onboarding.draft.firstItemId ? (
            <Card style={{ gap: theme.spacing.sm }}>
              <Text variant="bodyStrong">{t('item.created')}</Text>
              <Text variant="small" color="secondary">
                {t('onboarding.firstItem.skipHint')}
              </Text>
            </Card>
          ) : (
            <AddItemFlow
              onStepChange={setItemStep}
              onDone={(itemId) => {
                void store.updateSettings((s) => ({ ...s, onboarding: { ...s.onboarding, draft: { ...s.onboarding.draft, firstItemId: itemId } } }));
                persistStep(5);
              }}
            />
          )
        ) : null}

        {stepIndex === 5 ? (
          <Card style={{ gap: theme.spacing.sm }}>
            {day.views.length === 0 ? (
              <Text variant="small" color="secondary">
                {t('onboarding.preview.empty')}
              </Text>
            ) : (
              day.views.map((view) => {
                const item = idx.itemsById.get(view.occurrence.itemId);
                if (!item) return null;
                return (
                  <View key={view.occurrence.key} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: 48 }}>
                    <Text variant="smallStrong" color="primary" ltr style={{ width: 72 }}>
                      {formatMinutes(view.occurrence.scheduledMinutes, format)}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" ltr>
                        {item.displayName}
                      </Text>
                      <Text variant="small" color="secondary">
                        {formatItemDose(item, language)}
                      </Text>
                    </View>
                    <Badge label={t(item.kind === 'medication' ? 'common.medication' : 'common.supplement')} tone={item.kind === 'medication' ? 'medication' : 'primary'} />
                  </View>
                );
              })
            )}
            {goalOn(settings, today) > 0 ? (
              <>
                <Divider />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="droplet" size={16} color={theme.colors.water} mirror={false} />
                  <Text variant="small" color="secondary">
                    {t('onboarding.preview.waterGoal', { amount: formatVolume(goalOn(settings, today), unit, language) })}
                  </Text>
                </View>
              </>
            ) : null}
          </Card>
        ) : null}

        {stepIndex === 6 ? (
          <Card style={{ gap: theme.spacing.md }}>
            {(['due', 'quiet', 'control'] as const).map((key) => (
              <View key={key} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
                <Icon name={key === 'due' ? 'bell' : key === 'quiet' ? 'moon' : 'sliders'} size={18} color={theme.colors.primary} mirror={false} />
                <Text variant="small" color="secondary" style={{ flex: 1 }}>
                  {t(`onboarding.notifications.bullets.${key}` as const)}
                </Text>
              </View>
            ))}
            {permission === 'unsupported' ? (
              <Text variant="small" color="warn">
                {t('onboarding.notifications.web')}
              </Text>
            ) : permission === 'granted' || permission === 'provisional' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="check-circle" size={18} color={theme.colors.primary} mirror={false} />
                <Text variant="smallStrong" color="primary">
                  {t('onboarding.notifications.granted')}
                </Text>
              </View>
            ) : permission === 'denied' ? (
              <Text variant="small" color="warn">
                {t('onboarding.notifications.denied')}
              </Text>
            ) : (
              <Button label={t('onboarding.notifications.allow')} icon="bell" onPress={() => void requestNotifications()} loading={notifying} />
            )}
          </Card>
        ) : null}
      </Animated.View>

      {stepIndex === 4 && itemStep !== 'search' && !settings.onboarding.draft.firstItemId ? null : (
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center', paddingTop: theme.spacing.sm }}>
        {stepIndex > 0 ? <Button label={t('common.back')} variant="ghost" onPress={back} /> : <View />}
        <View style={{ flex: 1 }} />
        {stepIndex === 0 ? <Button label={t('common.next')} iconEnd="arrow-right" onPress={next} /> : null}
        {stepIndex === 1 ? <Button label={name.trim() ? t('common.next') : t('common.skip')} iconEnd="arrow-right" onPress={saveName} /> : null}
        {stepIndex === 2 ? <Button label={t('common.next')} iconEnd="arrow-right" onPress={next} /> : null}
        {stepIndex === 2 ? <Button label={t('common.next')} iconEnd="arrow-right" onPress={saveAnchors} /> : null}
        {stepIndex === 3 ? (
          <>
            <Chip label={t('common.skipForNow')} onPress={next} />
            <Button label={t('common.next')} iconEnd="arrow-right" onPress={() => void saveGoal()} />
          </>
        ) : null}
        {stepIndex === 4 ? <Chip label={settings.onboarding.draft.firstItemId ? t('common.next') : t('common.skipForNow')} onPress={next} /> : null}
        {stepIndex === 5 ? <Button label={t('common.next')} iconEnd="arrow-right" onPress={next} /> : null}
        {stepIndex === 6 ? <Button label={t('onboarding.finish')} icon="check" size="lg" onPress={() => void finish()} /> : null}
      </View>
      )}
    </Screen>
  );
}
