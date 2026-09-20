import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n';
import { Screen } from '@/ui/components/Screen';
import { AddItemFlow, type AddItemStep } from '@/features/item/AddItemFlow';

export default function NewItemScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<AddItemStep>('search');
  const title = step === 'search' ? t('item.newTitle') : step === 'details' ? t('routine.details') : t('schedule.title');
  return (
    <Screen title={title} subtitle={step === 'search' ? t('onboarding.firstItem.subtitle') : undefined} onBack={() => router.back()} keyboard testID="item-new">
      <AddItemFlow
        onStepChange={setStep}
        onDone={(itemId) => {
          router.dismissTo?.('/(tabs)/routine');
          router.replace(`/item/${itemId}` as never);
        }}
      />
    </Screen>
  );
}
