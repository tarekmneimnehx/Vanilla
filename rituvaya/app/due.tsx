import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { OccurrenceView } from '@/domain/logging/status';
import { useI18n } from '@/i18n';
import { useIndexes, useSnapshot, useStore } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { EmptyState } from '@/ui/components/EmptyState';
import { Screen } from '@/ui/components/Screen';
import { DoseActionSheet } from '@/features/dose/DoseActionSheet';
import { OccurrenceRow } from '@/features/dose/OccurrenceRow';
import { useDoseActions } from '@/features/dose/useDoseActions';

/** Opened from a notification: shows exactly the occurrences the alert was about. */
export default function DueScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const { t } = useI18n();
  const idx = useIndexes();
  const snapshot = useSnapshot();
  const actions = useDoseActions();
  const params = useLocalSearchParams<{ keys?: string }>();
  const keys = useMemo(() => (params.keys ? decodeURIComponent(params.keys).split(',').filter(Boolean) : []), [params.keys]);
  const views = useMemo(() => store.viewsForKeys(keys), [store, keys, snapshot.version]);
  const pending = views.filter((v) => !v.isFinal);
  const [selected, setSelected] = useState<OccurrenceView | null>(null);
  const liveSelected = selected ? (views.find((v) => v.occurrence.key === selected.occurrence.key) ?? null) : null;

  return (
    <Screen title={t('dose.dueScreen')} subtitle={t('dose.dueScreenSubtitle')} onBack={() => router.back()} testID="due">
      {views.length === 0 ? (
        <Card>
          <EmptyState icon="check-circle" title={t('dose.dueScreenEmpty')} compact actionLabel={t('common.close')} onAction={() => router.back()} />
        </Card>
      ) : (
        <Card style={{ gap: 4 }}>
          {views.map((view) => {
            const item = idx.itemsById.get(view.occurrence.itemId);
            if (!item) return null;
            return <OccurrenceRow key={view.occurrence.key} view={view} item={item} onPress={() => setSelected(view)} onTake={() => void actions.take(view)} />;
          })}
        </Card>
      )}
      {pending.length > 1 ? (
        <View style={{ gap: theme.spacing.xs }}>
          <Button label={t('today.groupActionCount', { count: pending.length })} icon="check-circle" full size="lg" onPress={() => void actions.takeAll(pending)} />
        </View>
      ) : null}
      <DoseActionSheet view={liveSelected} item={selected ? (idx.itemsById.get(selected.occurrence.itemId) ?? null) : null} onClose={() => setSelected(null)} />
    </Screen>
  );
}
