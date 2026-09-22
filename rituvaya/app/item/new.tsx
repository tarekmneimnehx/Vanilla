import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n';
import { Screen } from '@/ui/components/Screen';
import { useGoBack } from '@/ui/useGoBack';
import { AddItemFlow, type AddItemStep } from '@/features/item/AddItemFlow';

export default function NewItemScreen() {
  const router = useRouter();
  const goBack = useGoBack();
  const { t } = useI18n();
  const [step, setStep] = useState<AddItemStep>('search');
  const title = step === 'search' ? t('item.newTitle') : step === 'details' ? t('routine.details') : t('schedule.title');

  /**
   * Inside the flow the header arrow means "previous step", not "throw this away":
   * dismissing from the details or schedule step would lose everything typed. Only
   * the first step closes the sheet.
   */
  const back = () => {
    if (step === 'schedule') return setStep('details');
    if (step === 'details') return setStep('search');
    goBack();
  };

  return (
    <Screen title={title} subtitle={step === 'search' ? t('onboarding.firstItem.subtitle') : undefined} onBack={back} keyboard testID="item-new">
      <AddItemFlow
        step={step}
        onStepChange={setStep}
        onDone={(itemId) => {
          router.dismissTo?.('/(tabs)/routine');
          router.replace(`/item/${itemId}` as never);
        }}
      />
    </Screen>
  );
}
