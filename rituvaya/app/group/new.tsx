import React from 'react';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n';
import { Screen } from '@/ui/components/Screen';
import { GroupEditor } from '@/features/groups/GroupEditor';

export default function NewGroupScreen() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Screen title={t('groups.newTitle')} onBack={() => router.back()} keyboard testID="group-new">
      <GroupEditor group={null} onSaved={() => router.back()} />
    </Screen>
  );
}
