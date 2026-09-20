import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { currentVersion } from '@/domain/services/scheduleService';
import { useI18n } from '@/i18n';
import { useIndexes, useStore, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Icon } from '@/ui/components/Icon';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { haptic } from '@/ui/haptics';
import { draftFromSchedule, draftToDefinition, emptyScheduleDraft, ScheduleForm, validateScheduleDraft, type ScheduleDraft, type ScheduleErrors } from '@/features/schedule/ScheduleForm';

export default function EditScheduleScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const toast = useToast();
  const today = useToday();
  const { t } = useI18n();
  const idx = useIndexes();
  const { id } = useLocalSearchParams<{ id: string }>();
  const entry = idx.entries.find((e) => e.item.id === id);
  const current = entry ? (currentVersion(entry.versions) ?? entry.versions[0]) : undefined;
  const [draft, setDraft] = useState<ScheduleDraft>(() => (current ? draftFromSchedule(current, today) : emptyScheduleDraft(today, { kind: 'exact', time: '08:00' })));
  const [errors, setErrors] = useState<ScheduleErrors>({});
  const [saving, setSaving] = useState(false);
  if (!entry) {
    return (
      <Screen title={t('common.error')} onBack={() => router.back()}>
        {null}
      </Screen>
    );
  }
  const save = async () => {
    const found = validateScheduleDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await store.editSchedule(entry.item.id, draftToDefinition(draft));
      haptic.success();
      toast.show({ message: t('schedule.saved'), icon: 'check' });
      router.back();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen title={t('routine.editSchedule')} subtitle={entry.item.displayName} onBack={() => router.back()} keyboard testID="item-schedule">
      <Card tone="soft" padding={theme.spacing.md} style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
        <Icon name="info" size={18} color={theme.colors.primary} mirror={false} />
        <Text variant="small" color="secondary" style={{ flex: 1 }}>
          {t('routine.scheduleChangeNotice')}
        </Text>
      </Card>
      <ScheduleForm draft={draft} onChange={setDraft} errors={errors} />
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        <Button label={t('common.save')} icon="check" onPress={() => void save()} loading={saving} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}
