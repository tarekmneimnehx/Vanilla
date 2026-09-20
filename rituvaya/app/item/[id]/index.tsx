import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { currentVersion } from '@/domain/services/scheduleService';
import { itemHistory } from '@/domain/services/queries';
import { useI18n } from '@/i18n';
import { formatDoseText, formatItemDose, formatStrength, formLabel } from '@/i18n/dose';
import { formatInstantDate, formatTime } from '@/i18n/format';
import { useFormatContext, useIndexes, useSnapshot, useStore } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button, IconButton } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Badge, SectionHeader } from '@/ui/components/Controls';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Screen } from '@/ui/components/Screen';
import { Sheet } from '@/ui/components/Sheet';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';
import { useScheduleSummary } from '@/features/item/ItemCard';
import { useDoseActions } from '@/features/dose/useDoseActions';

export default function ItemDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const toast = useToast();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const actions = useDoseActions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = idx.itemsById.get(id ?? '');
  const versions = idx.entries.find((e) => e.item.id === id)?.versions ?? [];
  const [confirm, setConfirm] = useState<'pause' | 'archive' | null>(null);
  const summary = useScheduleSummary(item ?? snapshot.items[0] ?? ({ status: 'active' } as never), versions);

  if (!item) {
    return (
      <Screen title={t('common.error')} onBack={() => router.back()}>
        {null}
      </Screen>
    );
  }
  const current = currentVersion(versions);
  const history = itemHistory(snapshot, item.id).slice(0, 5);
  const strength = formatStrength(item, language);

  const confirmAction = async () => {
    if (confirm === 'pause') await store.pause(item.id);
    if (confirm === 'archive') await store.archive(item.id);
    setConfirm(null);
    toast.show({ message: confirm === 'pause' ? t('routine.paused') : t('routine.archived'), icon: confirm === 'pause' ? 'pause' : 'archive' });
  };

  const detailRows: { label: string; value: string | null }[] = [
    { label: t('routine.genericLabel', { name: '' }).replace(/:\s*$/, ''), value: item.genericName },
    { label: t('item.brand').replace(/\s*\(.*\)$/, ''), value: item.brand },
    { label: t('routine.strengthLabel'), value: strength },
    { label: t('routine.servingLabel'), value: item.servingSize !== null && item.servingUnit ? formatDoseText(item.servingSize, item.servingUnit, language) : null },
    { label: t('routine.doseLabel'), value: formatItemDose(item, language) },
    { label: t('routine.formLabel'), value: formLabel(item, language) },
    { label: t('routine.purposeLabel'), value: item.purpose },
    { label: t('routine.ingredientsLabel'), value: item.ingredients.length ? item.ingredients.join(', ') : null },
    { label: t('routine.notesLabel'), value: item.notes },
  ];

  return (
    <Screen onBack={() => router.back()} headerEnd={<IconButton icon="edit-2" accessibilityLabel={t('routine.editItem')} onPress={() => router.push(`/item/${item.id}/edit` as never)} variant="soft" />} testID="item-detail">
      <View style={{ gap: 6 }}>
        <Text variant="title" ltr accessibilityRole="header">
          {item.displayName}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Badge label={t(item.kind === 'medication' ? 'common.medication' : 'common.supplement')} tone={item.kind === 'medication' ? 'medication' : 'primary'} />
          {item.status === 'paused' ? <Badge label={t('routine.paused')} tone="warn" /> : null}
          {item.status === 'archived' ? <Badge label={t('routine.archived')} tone="neutral" /> : null}
          {item.isDemo ? <Badge label={t('common.demo')} tone="demo" /> : null}
        </View>
      </View>

      <SectionHeader title={t('routine.scheduleSummary')} action={item.status === 'active' ? t('common.edit') : undefined} onAction={() => router.push(`/item/${item.id}/schedule` as never)} />
      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="bodyStrong">{summary.summary}</Text>
        <Text variant="small" color="secondary">
          {item.status !== 'active' ? t(item.status === 'paused' ? 'routine.paused' : 'routine.archived') : summary.next ? t('routine.nextDoseLabel', { when: summary.next }) : current?.recurrence.type === 'asNeeded' ? t('routine.asNeededLabel') : t('routine.noNextDose')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {item.status === 'active' ? <Button label={t('routine.editSchedule')} variant="secondary" size="sm" icon="clock" onPress={() => router.push(`/item/${item.id}/schedule` as never)} /> : null}
          <Button label={t('dose.logExtra')} variant="secondary" size="sm" icon="plus-circle" onPress={() => void actions.recordExtra(item)} />
        </View>
      </Card>

      <SectionHeader title={t('routine.details')} action={t('common.edit')} onAction={() => router.push(`/item/${item.id}/edit` as never)} />
      <Card padding={theme.spacing.md}>
        {detailRows
          .filter((row) => row.value)
          .map((row, index) => (
            <View key={row.label}>
              {index > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: 10 }}>
                <Text variant="small" color="secondary" style={{ flex: 1 }}>
                  {row.label}
                </Text>
                <Text variant="smallStrong" ltr style={{ flex: 2 }} align="end">
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
      </Card>

      <SectionHeader title={t('routine.history')} action={t('common.all')} onAction={() => router.push(`/item/${item.id}/history` as never)} />
      <Card padding={theme.spacing.md}>
        {history.length === 0 ? (
          <Text variant="small" color="secondary">
            {t('history.itemEmpty')}
          </Text>
        ) : (
          history.map((log, index) => (
            <View key={log.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow
                title={t(log.action === 'taken' ? 'dose.taken' : log.action === 'skipped' ? 'dose.skipped' : 'dose.missed')}
                subtitle={`${formatInstantDate(log.at, 'short', format)} · ${formatTime(log.at, format)}${log.amount !== null && log.unit ? ` · ${formatDoseText(log.amount, log.unit, language)}` : ''}`}
                icon={log.action === 'taken' ? 'check' : log.action === 'skipped' ? 'minus' : 'x'}
              />
            </View>
          ))
        )}
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {item.status === 'active' ? <Button label={t('routine.pause')} icon="pause" variant="secondary" onPress={() => setConfirm('pause')} /> : null}
        {item.status !== 'active' ? <Button label={item.status === 'paused' ? t('routine.resume') : t('routine.restore')} icon="play" onPress={() => void store.resume(item.id).then(() => toast.show({ message: t('routine.resume'), icon: 'play' }))} /> : null}
        {item.status !== 'archived' ? <Button label={t('routine.archive')} icon="archive" variant="danger" onPress={() => setConfirm('archive')} /> : null}
      </View>

      <Sheet visible={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'pause' ? t('routine.pauseConfirmTitle', { name: item.displayName }) : t('routine.archiveConfirmTitle', { name: item.displayName })} scroll={false}>
        <Text variant="body" color="secondary">
          {confirm === 'pause' ? t('routine.pauseConfirmBody') : t('routine.archiveConfirmBody')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={t('common.cancel')} variant="ghost" onPress={() => setConfirm(null)} />
          <Button label={confirm === 'pause' ? t('routine.pause') : t('routine.archive')} variant={confirm === 'archive' ? 'danger' : 'primary'} onPress={() => void confirmAction()} style={{ flex: 1 }} />
        </View>
      </Sheet>
      {Platform.OS === 'web' ? null : void Alert}
    </Screen>
  );
}
