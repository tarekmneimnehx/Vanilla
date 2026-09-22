import React from 'react';
import { View } from 'react-native';
import type { MissedPolicy, NotificationSound, QuietHours, ReminderMode, ReminderSettings } from '@/domain/types';
import { useI18n } from '@/i18n';
import { formatDuration } from '@/i18n/format';
import { useFormatContext, useSnapshot, useStore } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { useGoBack } from '@/ui/useGoBack';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { SectionHeader, Stepper, SwitchRow } from '@/ui/components/Controls';
import { TimeField } from '@/ui/components/Pickers';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';

export default function ReminderSettingsScreen() {
  const theme = useTheme();
  const goBack = useGoBack();
  const store = useStore();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const r = snapshot.settings.reminders;
  const mode: ReminderMode = r.mode ?? 'standard';
  const missed = snapshot.settings.missed;
  const patch = (changes: Partial<ReminderSettings>) => void store.updateSettings((s) => ({ ...s, reminders: { ...s.reminders, ...changes } }));
  const patchQuiet = (changes: Partial<QuietHours>) => patch({ quietHours: { ...r.quietHours, ...changes } });
  const patchMissed = (changes: Partial<MissedPolicy>) => void store.updateSettings((s) => ({ ...s, missed: { ...s.missed, ...changes } }));
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm, minHeight: 52 }}>
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </Text>
      {children}
    </View>
  );
  return (
    <Screen title={t('settings.reminders')} onBack={() => goBack()} testID="settings-reminders">
      <Card style={{ gap: theme.spacing.xs }}>
        <SwitchRow label={t('settings.remindersEnabled')} value={r.enabled} onChange={(v) => patch({ enabled: v })} />
        {/* Insistent mode replaces these, so showing them would be a lie about what happens. */}
        {mode === 'standard' ? (
          <>
            <Row label={t('settings.repeatCount')}>
              <Stepper value={r.repeatCount} min={0} max={6} onChange={(v) => patch({ repeatCount: v })} accessibilityLabel={t('settings.repeatCount')} />
            </Row>
            <Row label={t('settings.repeatInterval')}>
              <Stepper value={r.repeatIntervalMinutes} min={5} max={120} step={5} onChange={(v) => patch({ repeatIntervalMinutes: v })} accessibilityLabel={t('settings.repeatInterval')} />
            </Row>
          </>
        ) : null}
        <Row label={t('settings.snooze')}>
          <Stepper value={r.snoozeMinutes} min={5} max={120} step={5} onChange={(v) => patch({ snoozeMinutes: v })} accessibilityLabel={t('settings.snooze')} format={(v) => formatDuration(v, language)} />
        </Row>
        <TimeField label={t('settings.remindTonight')} value={r.remindTonightTime} onChange={(v) => patch({ remindTonightTime: v })} format={format} />
      </Card>

      <SectionHeader title={t('settings.reminderMode')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <View style={{ gap: 8 }}>
          {(['standard', 'insistent'] as ReminderMode[]).map((value) => (
            <Chip key={value} label={t(`settings.reminderModes.${value}` as const)} selected={mode === value} onPress={() => patch({ mode: value })} />
          ))}
        </View>
        <Text variant="small" color="secondary">
          {t(`settings.reminderModeHints.${mode}` as const)}
        </Text>
      </Card>

      <SectionHeader title={t('settings.quietHours')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <SwitchRow label={t('settings.quietHours')} hint={t('settings.quietHoursHint')} value={r.quietHours.enabled} onChange={(v) => patchQuiet({ enabled: v })} />
        {r.quietHours.enabled ? (
          <>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1 }}>
                <TimeField label={t('settings.quietStart')} value={r.quietHours.start} onChange={(v) => patchQuiet({ start: v })} format={format} />
              </View>
              <View style={{ flex: 1 }}>
                <TimeField label={t('settings.quietEnd')} value={r.quietHours.end} onChange={(v) => patchQuiet({ end: v })} format={format} />
              </View>
            </View>
            <Text variant="smallStrong" color="secondary">
              {t('settings.quietMode')}
            </Text>
            <View style={{ gap: 8 }}>
              {(['delay', 'suppress'] as QuietHours['mode'][]).map((mode) => (
                <Chip key={mode} label={t(`settings.quietModes.${mode}` as const)} selected={r.quietHours.mode === mode} onPress={() => patchQuiet({ mode })} />
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <SectionHeader title={t('settings.discreet')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <SwitchRow label={t('settings.discreet')} hint={t('settings.discreetHint')} value={r.discreetText} onChange={(v) => patch({ discreetText: v })} />
        <Text variant="smallStrong" color="secondary">
          {t('settings.sound')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['default', 'chime', 'drop', 'none'] as NotificationSound[]).map((sound) => (
            <Chip key={sound} label={t(`settings.sounds.${sound}` as const)} selected={r.sound === sound} onPress={() => patch({ sound })} />
          ))}
        </View>
        <Text variant="caption" color="muted">
          {t('settings.soundHint')}
        </Text>
      </Card>

      <SectionHeader title={t('settings.missedPolicy')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="small" color="secondary">
          {t('settings.missedPolicyHint')}
        </Text>
        <View style={{ gap: 8 }}>
          {(['stayOverdue', 'markMissed'] as MissedPolicy['mode'][]).map((mode) => (
            <Chip key={mode} label={t(`settings.missedModes.${mode}` as const)} selected={missed.mode === mode} onPress={() => patchMissed({ mode })} />
          ))}
        </View>
        {missed.mode === 'markMissed' ? (
          <Row label={t('settings.missedAfter')}>
            <Stepper value={missed.afterMinutes} min={30} max={1440} step={30} onChange={(v) => patchMissed({ afterMinutes: v })} accessibilityLabel={t('settings.missedAfter')} format={(v) => formatDuration(v, language)} />
          </Row>
        ) : null}
      </Card>
    </Screen>
  );
}
