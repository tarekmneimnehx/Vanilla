import React from 'react';
import { useI18n } from '@/i18n';
import { Screen } from '@/ui/components/Screen';
import { useGoBack } from '@/ui/useGoBack';
import { GroupEditor } from '@/features/groups/GroupEditor';

export default function NewGroupScreen() {
  const goBack = useGoBack();
  const { t } = useI18n();
  return (
    <Screen title={t('groups.newTitle')} onBack={() => goBack()} keyboard testID="group-new">
      <GroupEditor group={null} onSaved={() => goBack()} />
    </Screen>
  );
}
