import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n';
import { useSnapshot, useStore } from '@/state/context';
import { storageEngineName } from '@/storage';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { SectionHeader } from '@/ui/components/Controls';
import { Screen } from '@/ui/components/Screen';
import { Sheet } from '@/ui/components/Sheet';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';

async function shareExport(json: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rituvaya-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const FileSystem = require('expo-file-system') as typeof import('expo-file-system');
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  const file = new FileSystem.File(FileSystem.Paths.cache, `rituvaya-export-${new Date().toISOString().slice(0, 10)}.json`);
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Rituvaya export' });
}

export default function DataSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const toast = useToast();
  const { t } = useI18n();
  const snapshot = useSnapshot();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const hasDemo = store.hasDemoData();

  const doExport = async () => {
    setBusy('export');
    try {
      await shareExport(await store.exportJson());
      toast.show({ message: t('settings.exportDone'), icon: 'download' });
    } catch {
      toast.show({ message: t('settings.exportFailed'), icon: 'alert-circle' });
    } finally {
      setBusy(null);
    }
  };
  const deleteAll = async () => {
    setBusy('delete');
    try {
      await store.deleteAllData();
      setConfirmDelete(false);
      router.replace('/onboarding');
    } finally {
      setBusy(null);
    }
  };
  const toggleDemo = async () => {
    setBusy('demo');
    try {
      if (hasDemo) {
        await store.removeDemo();
        toast.show({ message: t('settings.demoRemoved'), icon: 'trash-2' });
      } else {
        await store.loadDemo();
        toast.show({ message: t('settings.demoLoaded'), icon: 'check' });
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title={t('settings.sections.data')} onBack={() => router.back()} testID="settings-data">
      <SectionHeader title={t('settings.storage')} />
      <Card style={{ gap: theme.spacing.xs }}>
        <Text variant="small" color="secondary">
          {t('settings.storageStatus')}
        </Text>
        <Text variant="caption" color="muted">
          {t('settings.storageEngine', { engine: storageEngineName(store.repo) })} · {snapshot.items.length} / {snapshot.logs.filter((l) => l.deletedAt === null).length}
        </Text>
      </Card>
      <SectionHeader title={t('settings.export')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="small" color="secondary">
          {t('settings.exportHint')}
        </Text>
        <Button label={t('settings.export')} icon="download" onPress={() => void doExport()} loading={busy === 'export'} />
      </Card>
      <SectionHeader title={t('settings.demoData')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="small" color="secondary">
          {t('settings.demoDataHint')}
        </Text>
        <Button label={hasDemo ? t('settings.removeDemo') : t('settings.loadDemo')} icon={hasDemo ? 'trash-2' : 'package'} variant="secondary" onPress={() => void toggleDemo()} loading={busy === 'demo'} />
      </Card>
      <SectionHeader title={t('settings.deleteAll')} />
      <Card style={{ gap: theme.spacing.sm }}>
        <Text variant="small" color="secondary">
          {t('settings.deleteAllBody')}
        </Text>
        <Button label={t('settings.deleteAll')} icon="trash-2" variant="danger" onPress={() => setConfirmDelete(true)} />
      </Card>
      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('settings.deleteAll')} scroll={false}>
        <Text variant="body" color="secondary">
          {t('settings.deleteAllBody')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label={t('common.cancel')} variant="ghost" onPress={() => setConfirmDelete(false)} />
          <Button label={t('settings.deleteAllConfirm')} variant="danger" onPress={() => void deleteAll()} loading={busy === 'delete'} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </Screen>
  );
}
