import React, { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useI18n } from '@/i18n';
import { formatTime } from '@/i18n/format';
import { useFormatContext, useSnapshot, useStore } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { useGoBack } from '@/ui/useGoBack';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Badge, SectionHeader } from '@/ui/components/Controls';
import { Icon } from '@/ui/components/Icon';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Screen } from '@/ui/components/Screen';
import { Text } from '@/ui/components/Text';
import { useToast } from '@/ui/components/Toast';

export default function NotificationStatusScreen() {
  const theme = useTheme();
  const goBack = useGoBack();
  const store = useStore();
  const toast = useToast();
  const { t } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const { permission } = snapshot;
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void store.refreshPermission();
  }, [store]);
  const granted = permission.state === 'granted' || permission.state === 'provisional';
  const tone = granted ? 'primary' : permission.state === 'denied' ? 'danger' : 'neutral';
  const request = async () => {
    setBusy(true);
    try {
      const result = await store.requestNotificationPermission();
      if (result.state === 'denied' && !result.canAskAgain && Platform.OS !== 'web') await Linking.openSettings();
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    const ok = await store.sendTestNotification({ title: t('notifications.dose.testTitle'), body: t('notifications.dose.testBody') });
    toast.show({ message: ok ? t('settings.testReminderSent') : t('errors.notificationsUnavailable'), icon: 'bell' });
  };
  const upcoming = snapshot.notificationRecords.slice(0, 8);
  return (
    <Screen title={t('notifications.status.title')} onBack={() => goBack()} testID="settings-notifications">
      <Card style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Icon name={granted ? 'bell' : 'bell-off'} size={22} color={granted ? theme.colors.primary : theme.colors.danger} mirror={false} />
          <Text variant="subheading" style={{ flex: 1 }}>
            {t(`notifications.status.${permission.state}` as const)}
          </Text>
          <Badge label={granted ? t('common.on') : t('common.off')} tone={tone} />
        </View>
        {permission.state === 'denied' ? (
          <Text variant="small" color="secondary">
            {t('notifications.status.deniedHint')}
          </Text>
        ) : null}
        {permission.state === 'unsupported' ? (
          <Text variant="small" color="secondary">
            {t('onboarding.notifications.web')}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {permission.state === 'undetermined' || (permission.state === 'denied' && permission.canAskAgain) ? <Button label={t('notifications.status.request')} icon="bell" onPress={() => void request()} loading={busy} /> : null}
          {permission.state === 'denied' && Platform.OS !== 'web' ? <Button label={t('notifications.status.openSettings')} icon="external-link" variant="secondary" onPress={() => void Linking.openSettings()} /> : null}
          {granted ? <Button label={t('settings.testReminder')} icon="send" variant="secondary" onPress={() => void test()} /> : null}
          <Button label={t('notifications.status.refresh')} icon="refresh-cw" variant="ghost" onPress={() => void store.reconcileNow().then(() => store.refreshPermission())} />
        </View>
      </Card>

      <SectionHeader title={t('notifications.status.scheduledCount', { count: snapshot.notificationRecords.length })} />
      <Card padding={theme.spacing.md} style={{ gap: 4 }}>
        {upcoming.length === 0 ? (
          <Text variant="small" color="secondary">
            {t('common.none')}
          </Text>
        ) : (
          upcoming.map((record, index) => (
            <View key={record.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow icon={record.kind === 'hydration' ? 'droplet' : 'bell'} title={record.kind === 'hydration' ? t('notifications.channels.hydration') : t('notifications.channels.doses')} subtitle={`${formatTime(record.fireAt, format)} · ${new Date(record.fireAt).toDateString()}`} value={record.occurrenceKeys.length ? String(record.occurrenceKeys.length) : undefined} />
            </View>
          ))
        )}
        {snapshot.lastReconcileAt ? (
          <Text variant="caption" color="muted">
            {t('notifications.status.lastSync', { time: formatTime(snapshot.lastReconcileAt, format) })}
          </Text>
        ) : null}
      </Card>
      <Card tone="soft" style={{ gap: theme.spacing.xs }}>
        <Text variant="small" color="secondary">
          {t('notifications.status.horizon')}
        </Text>
        {Platform.OS === 'android' ? (
          <Text variant="small" color="secondary">
            {t('notifications.status.exactAlarms')}
          </Text>
        ) : null}
      </Card>
    </Screen>
  );
}
