import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useI18n } from '@/i18n';
import { useIndexes, useStore } from '@/state/context';
import { useTheme } from '@/ui/ThemeProvider';
import { Button } from '@/ui/components/Button';
import { Screen } from '@/ui/components/Screen';
import { useToast } from '@/ui/components/Toast';
import { haptic } from '@/ui/haptics';
import { ItemForm } from '@/features/item/ItemForm';
import { draftFromItem, draftToInput, validateDraft, type DraftErrors, type ItemDraft } from '@/features/item/itemDraft';

export default function EditItemScreen() {
  const theme = useTheme();
  const router = useRouter();
  const store = useStore();
  const toast = useToast();
  const { t } = useI18n();
  const idx = useIndexes();
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = idx.itemsById.get(id ?? '');
  const [draft, setDraft] = useState<ItemDraft | null>(() => (item ? draftFromItem(item) : null));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [saving, setSaving] = useState(false);
  if (!item || !draft) {
    return (
      <Screen title={t('common.error')} onBack={() => router.back()}>
        {null}
      </Screen>
    );
  }
  const save = async () => {
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await store.editItem(item.id, draftToInput(draft));
      haptic.success();
      toast.show({ message: t('item.saved'), icon: 'check' });
      router.back();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen title={t('item.editTitle')} onBack={() => router.back()} keyboard testID="item-edit">
      <ItemForm draft={draft} onChange={setDraft} errors={errors} />
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
        <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        <Button label={t('common.save')} icon="check" onPress={() => void save()} loading={saving} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}
