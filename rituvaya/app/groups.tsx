import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n';
import { useFormatContext, useIndexes, useSnapshot, useToday } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { useGoBack } from '@/ui/useGoBack';
import { Button, IconButton } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { EmptyState } from '@/ui/components/EmptyState';
import { Divider, ListRow } from '@/ui/components/ListRow';
import { Screen } from '@/ui/components/Screen';
import { slotLabel } from '@/features/schedule/summary';

export default function GroupsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const { t, language } = useI18n();
  const format = useFormatContext();
  const snapshot = useSnapshot();
  const idx = useIndexes();
  const today = useToday();
  const groups = snapshot.groups.filter((g) => g.archivedAt === null);
  const ctx = useMemo(() => ({ language, format, anchorHistory: snapshot.settings.anchorHistory, groupsById: idx.groupsById, today }), [language, format, snapshot.settings.anchorHistory, idx.groupsById, today]);
  const memberCount = (groupId: string) => snapshot.schedules.filter((s) => s.effectiveTo === null && s.slots.some((slot) => slot.kind === 'group' && slot.groupId === groupId)).length;
  return (
    <Screen title={t('groups.title')} subtitle={t('routine.groupsSubtitle')} onBack={() => goBack()} headerEnd={<IconButton icon="plus" accessibilityLabel={t('routine.newGroup')} onPress={() => router.push('/group/new')} variant="primary" />} testID="groups">
      {groups.length === 0 ? (
        <Card>
          <EmptyState icon="layers" title={t('routine.noGroups')} body={t('routine.noGroupsSubtitle')} actionLabel={t('routine.newGroup')} onAction={() => router.push('/group/new')} compact />
        </Card>
      ) : (
        <Card padding={theme.spacing.md}>
          {groups.map((group, index) => (
            <View key={group.id}>
              {index > 0 ? <Divider /> : null}
              <ListRow title={group.name} subtitle={`${slotLabel({ kind: 'group', groupId: group.id }, ctx)} · ${t('routine.itemCount', { count: memberCount(group.id) })}`} icon="layers" chevron onPress={() => router.push(`/group/${group.id}` as never)} />
            </View>
          ))}
        </Card>
      )}
      {groups.length > 0 ? <Button label={t('routine.newGroup')} icon="plus" variant="secondary" onPress={() => router.push('/group/new')} /> : null}
    </Screen>
  );
}
