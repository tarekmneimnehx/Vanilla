import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/i18n';
import { useIndexes } from '@/state/context';
import { Screen } from '@/ui/components/Screen';
import { useGoBack } from '@/ui/useGoBack';
import { GroupEditor } from '@/features/groups/GroupEditor';

export default function EditGroupScreen() {
  const goBack = useGoBack();
  const { t } = useI18n();
  const idx = useIndexes();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = idx.groupsById.get(id ?? '') ?? null;
  return (
    <Screen title={t('groups.editTitle')} onBack={() => goBack()} keyboard testID="group-edit">
      {group ? <GroupEditor group={group} onSaved={() => goBack()} onArchived={() => goBack()} /> : null}
    </Screen>
  );
}
