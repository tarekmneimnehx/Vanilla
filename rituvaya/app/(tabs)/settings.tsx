import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import type { Language, ThemePreference, TimeFormat, VolumeUnit } from '@/domain/types';
import { goalOn } from '@/domain/services/hydrationService';
import { LANGUAGES, isRTL, useI18n } from '@/i18n';
import { formatVolume } from '@/i18n/format';
import { useSnapshot, useStore, useToday } from '@/state/context';
import { storageEngineName } from '@/storage';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { SectionHeader } from '@/ui/components/Controls';
import { Field } from '@/ui/components/Field';
import { Icon } from '@/ui/components/Icon';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Screen } from '@/ui/components/Screen';
import { Sheet } from '@/ui/components/Sheet';
import { TAB_BAR_HEIGHT } from '@/ui/components/TabBar';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { applyLayoutDirection } from '@/ui/rtl';

type Picker = 'language' | 'theme' | 'time' | 'unit' | 'name' | null;

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const toast = useToast();
  const today = useToday();
  const { t, language } = useI18n();
  const snapshot = useSnapshot();
  const { settings } = snapshot;
  const [picker, setPicker] = useState<Picker>(null);
  const [nameDraft, setNameDraft] = useState(settings.preferredName);
  // Embedded at build time on devices; the web preview may not have it, and a
  // guessed fallback would show a wrong version, so the line is hidden instead.
  const version = Constants.expoConfig?.version ?? null;

  const setLanguage = async (code: Language) => {
    await store.updateSettings((s) => ({ ...s, language: code }));
    setPicker(null);
    const result = await applyLayoutDirection(isRTL(code));
    if (result === 'restartNeeded') toast.show({ message: t('settings.restartForLayout'), icon: 'refresh-cw', durationMs: 6000 });
  };
  const setTheme = (value: ThemePreference) => void store.updateSettings((s) => ({ ...s, theme: value })).then(() => setPicker(null));
  const setTime = (value: TimeFormat) => void store.updateSettings((s) => ({ ...s, timeFormat: value })).then(() => setPicker(null));
  const setUnit = (value: VolumeUnit) => void store.updateSettings((s) => ({ ...s, volumeUnit: value })).then(() => setPicker(null));
  const saveName = () => void store.updateSettings((s) => ({ ...s, preferredName: nameDraft.trim() })).then(() => setPicker(null));

  return (
    <Screen title={t('settings.title')} bottomInset={TAB_BAR_HEIGHT + 24} testID="settings">
      <SectionHeader title={t('settings.sections.general')} />
      <Card padding={theme.spacing.md}>
        <ListRow icon="globe" title={t('settings.language')} value={LANGUAGES.find((l) => l.code === language)?.nativeName} chevron onPress={() => setPicker('language')} />
        <Divider />
        <ListRow icon="sun" title={t('settings.theme')} value={t(`settings.themes.${settings.theme}` as const)} chevron onPress={() => setPicker('theme')} />
        <Divider />
        <ListRow icon="clock" title={t('settings.timeFormat')} value={t(`settings.timeFormats.${settings.timeFormat}` as const)} chevron onPress={() => setPicker('time')} />
        <Divider />
        <ListRow icon="droplet" title={t('settings.units')} value={t(settings.volumeUnit === 'ml' ? 'hydration.unitShort.ml' : 'hydration.unitShort.floz')} chevron onPress={() => setPicker('unit')} />
        <Divider />
        <ListRow icon="user" title={t('settings.name')} value={settings.preferredName || t('common.none')} chevron onPress={() => { setNameDraft(settings.preferredName); setPicker('name'); }} />
      </Card>

      <SectionHeader title={t('settings.sections.day')} />
      <Card padding={theme.spacing.md}>
        <ListRow icon="sunrise" title={t('settings.anchors')} subtitle={t('settings.anchorsHint')} chevron onPress={() => router.push('/settings/day')} />
      </Card>

      <SectionHeader title={t('settings.sections.reminders')} />
      <Card padding={theme.spacing.md}>
        <ListRow icon="bell" title={t('settings.reminders')} subtitle={settings.reminders.enabled ? t('common.on') : t('common.off')} chevron onPress={() => router.push('/settings/reminders')} />
        <Divider />
        <ListRow icon="shield" title={t('settings.notificationStatus')} value={t(`notifications.status.${snapshot.permission.state}` as const)} chevron onPress={() => router.push('/settings/notifications')} />
      </Card>

      <SectionHeader title={t('settings.sections.hydration')} />
      <Card padding={theme.spacing.md}>
        <ListRow icon="droplet" title={t('settings.hydrationGoal')} value={goalOn(settings, today) > 0 ? formatVolume(goalOn(settings, today), settings.volumeUnit, language) : t('common.none')} chevron onPress={() => router.push('/settings/hydration')} />
      </Card>

      <SectionHeader title={t('settings.sections.data')} />
      <Card padding={theme.spacing.md} style={{ gap: 4 }}>
        <ListRow icon="hard-drive" title={t('settings.storage')} subtitle={t('settings.storageStatus')} />
        <Text variant="caption" color="muted" style={{ paddingStart: 48 }}>
          {t('settings.storageEngine', { engine: storageEngineName(store.repo) })}
        </Text>
        <Divider />
        <ListRow icon="download" title={t('settings.export')} subtitle={t('settings.demoData')} chevron onPress={() => router.push('/settings/data')} />
      </Card>

      <SectionHeader title={t('settings.sections.about')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="subheading">{t('settings.about')}</Text>
        <Text variant="small" color="secondary">
          {t('settings.aboutBody')}
        </Text>
        {/* App Store guideline 1.4.1: health apps should tell people to check with a doctor. */}
        <Text variant="smallStrong" color="secondary" testID="medical-disclaimer">
          {t('app.medicalDisclaimer')}
        </Text>
        {version ? (
          <Text variant="caption" color="muted">
            {t('settings.version', { version })}
          </Text>
        ) : null}
      </Card>

      <Sheet visible={picker === 'language'} onClose={() => setPicker(null)} title={t('settings.language')} scroll={false}>
        <View style={{ gap: 4 }}>
          {LANGUAGES.map((l) => (
            <ListRow key={l.code} title={l.nativeName} subtitle={l.name} onPress={() => void setLanguage(l.code)} trailing={l.code === language ? <Icon name="check-circle" color={theme.colors.primary} mirror={false} accessibilityLabel={t('a11y.selected')} /> : null} />
          ))}
        </View>
      </Sheet>
      <Sheet visible={picker === 'theme'} onClose={() => setPicker(null)} title={t('settings.theme')} scroll={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['system', 'light', 'dark'] as ThemePreference[]).map((value) => (
            <Chip key={value} label={t(`settings.themes.${value}` as const)} selected={settings.theme === value} onPress={() => setTheme(value)} />
          ))}
        </View>
      </Sheet>
      <Sheet visible={picker === 'time'} onClose={() => setPicker(null)} title={t('settings.timeFormat')} scroll={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['system', '12h', '24h'] as TimeFormat[]).map((value) => (
            <Chip key={value} label={t(`settings.timeFormats.${value}` as const)} selected={settings.timeFormat === value} onPress={() => setTime(value)} />
          ))}
        </View>
      </Sheet>
      <Sheet visible={picker === 'unit'} onClose={() => setPicker(null)} title={t('settings.units')} scroll={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['ml', 'floz'] as VolumeUnit[]).map((value) => (
            <Chip key={value} label={t(value === 'ml' ? 'hydration.ml' : 'hydration.floz')} selected={settings.volumeUnit === value} onPress={() => setUnit(value)} />
          ))}
        </View>
      </Sheet>
      <Sheet visible={picker === 'name'} onClose={() => setPicker(null)} title={t('settings.name')} scroll={false} footer={<Button label={t('common.save')} full onPress={saveName} />}>
        <Field placeholder={t('onboarding.name.placeholder')} value={nameDraft} onChangeText={setNameDraft} autoFocus autoCapitalize="words" />
      </Sheet>
    </Screen>
  );
}
