import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useI18n } from '@/i18n';
import { useIndexes } from '@/state/context';
import { Screen } from '@/ui/components/Screen';
import { GroupEditor } from '@/features/groups/GroupEditor';

export default function EditGroupScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const idx = useIndexes();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = idx.groupsById.get(id ?? '') ?? null;
  return (
    <Screen title={t('groups.editTitle')} onBack={() => router.back()} keyboard testID="group-edit">
      {group ? <GroupEditor group={group} onSaved={() => router.back()} onArchived={() => router.back()} /> : null}
    </Screen>
  );
}
