import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useIndexes, useSnapshot } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button, IconButton } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { SectionHeader } from '@/ui/components/Controls';
import { EmptyState } from '@/ui/components/EmptyState';
import { Field } from '@/ui/components/Field';
import { Screen } from '@/ui/components/Screen';
import { TAB_BAR_HEIGHT } from '@/ui/components/TabBar';
import { Text } from '@/ui/components/Text';
import { ItemCard } from '@/features/item/ItemCard';

type Filter = 'all' | 'supplements' | 'medications' | 'paused' | 'archived';

export default function RoutineScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const matches = (item: Item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [item.displayName, item.genericName ?? '', item.brand ?? '', item.purpose ?? ''].some((s) => s.toLowerCase().includes(q));
  };
  const items = useMemo(() => {
    return snapshot.items.filter((item) => {
      if (!matches(item)) return false;
      switch (filter) {
        case 'all':
          return item.status === 'active';
        case 'supplements':
          return item.status === 'active' && item.kind === 'supplement';
        case 'medications':
          return item.status === 'active' && item.kind === 'medication';
        case 'paused':
          return item.status === 'paused';
        case 'archived':
          return item.status === 'archived';
      }
    });
  }, [snapshot.items, filter, query]);
  const groups = snapshot.groups.filter((g) => g.archivedAt === null);
  const hasAny = snapshot.items.length > 0;
  const filters: Filter[] = ['all', 'supplements', 'medications', 'paused', 'archived'];

  return (
    <Screen title={t('routine.title')} bottomInset={TAB_BAR_HEIGHT + 24} headerEnd={<IconButton icon="plus" accessibilityLabel={t('routine.addItem')} onPress={() => router.push('/item/new')} variant="primary" />} testID="routine">
      {hasAny ? (
        <>
          <Field placeholder={t('routine.searchPlaceholder')} value={query} onChangeText={setQuery} autoCorrect={false} compact accessibilityLabel={t('common.search')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {filters.map((key) => (
              <Chip key={key} label={t(`routine.filters.${key}` as const)} selected={filter === key} onPress={() => setFilter(key)} />
            ))}
          </View>
        </>
      ) : null}

      {!hasAny ? (
        <Card>
          <EmptyState icon="feather" title={t('routine.empty')} body={t('routine.emptySubtitle')} actionLabel={t('routine.addItem')} onAction={() => router.push('/item/new')} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="search" title={t('routine.noResults')} compact />
        </Card>
      ) : (
        items.map((item) => <ItemCard key={item.id} item={item} versions={idx.entries.find((e) => e.item.id === item.id)?.versions ?? []} onPress={() => router.push(`/item/${item.id}` as never)} />)
      )}

      <SectionHeader title={t('routine.groups')} action={t('routine.manageGroups')} onAction={() => router.push('/groups')} />
      {groups.length === 0 ? (
        <Card style={{ gap: theme.spacing.sm }}>
          <Text variant="bodyStrong">{t('routine.noGroups')}</Text>
          <Text variant="small" color="secondary">
            {t('routine.noGroupsSubtitle')}
          </Text>
          <Button label={t('routine.newGroup')} icon="plus" variant="secondary" size="sm" onPress={() => router.push('/group/new')} />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {groups.map((group) => (
            <Chip key={group.id} label={group.name} icon="layers" onPress={() => router.push(`/group/${group.id}` as never)} />
          ))}
          <Chip label={t('routine.newGroup')} icon="plus" onPress={() => router.push('/group/new')} />
        </View>
      )}
    </Screen>
  );
}
