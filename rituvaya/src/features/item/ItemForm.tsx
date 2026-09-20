import React, { useState } from 'react';
import { View } from 'react-native';
import type { ItemForm as ItemFormKind } from '@/domain/types';
import { useI18n } from '@/i18n';
import { DOSE_UNITS_BY_FORM, STRENGTH_UNITS, unitLabel } from '@/i18n/dose';
import { useTheme } from '@/ui/ThemeProvider';
import { Card } from '@/ui/components/Card';
import { Chip } from '@/ui/components/Chip';
import { Badge, SectionHeader, Segmented } from '@/ui/components/Controls';
import { Field } from '@/ui/components/Field';
import { Text } from '@/ui/components/Text';
import { withForm, type DraftErrors, type ItemDraft } from './itemDraft';

const FORMS: ItemFormKind[] = ['capsule', 'tablet', 'powder', 'liquid', 'gummy', 'drops', 'injection', 'custom'];

export interface ItemFormProps {
  draft: ItemDraft;
  onChange: (draft: ItemDraft) => void;
  errors: DraftErrors;
}

/** All item details. Fields adapt to the chosen form without inventing conversions. */
export function ItemForm({ draft, onChange, errors }: ItemFormProps) {
  const theme = useTheme();
  const { t, language } = useI18n();
  const set = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => onChange({ ...draft, [key]: value });
  const doseUnits = DOSE_UNITS_BY_FORM[draft.form];
  const [customDoseUnit, setCustomDoseUnit] = useState(!doseUnits.includes(draft.doseUnit));
  const [customStrengthUnit, setCustomStrengthUnit] = useState(!STRENGTH_UNITS.includes(draft.strengthUnit));
  const doseAmount = Number(draft.doseAmount.replace(',', '.')) || 1;

  return (
    <View style={{ gap: theme.spacing.md }}>
      {draft.catalogId ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Badge label={t('item.fromCatalog', { name: draft.genericName || draft.displayName })} tone="primary" />
        </View>
      ) : null}
      <Card style={{ gap: theme.spacing.md }}>
        <Segmented
          options={[
            { value: 'supplement', label: t('common.supplement') },
            { value: 'medication', label: t('common.medication') },
          ]}
          value={draft.kind}
          onChange={(kind) => set('kind', kind)}
        />
        <Field label={t('item.displayName')} placeholder={t('item.displayNamePlaceholder')} value={draft.displayName} onChangeText={(v) => set('displayName', v)} error={errors.displayName ? t(errors.displayName) : null} autoCapitalize="words" ltr />
        <Field label={t('item.genericName')} placeholder={t('item.genericPlaceholder')} value={draft.genericName} onChangeText={(v) => set('genericName', v)} autoCapitalize="words" ltr />
        <Field label={t('item.brand')} placeholder={t('item.brandPlaceholder')} value={draft.brand} onChangeText={(v) => set('brand', v)} autoCapitalize="words" ltr />
      </Card>

      <SectionHeader title={t('item.form')} />
      <Card style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FORMS.map((form) => (
            <Chip
              key={form}
              label={t(`item.forms.${form}` as const)}
              selected={draft.form === form}
              onPress={() => {
                const next = withForm(draft, form);
                setCustomDoseUnit(false);
                onChange(next);
              }}
            />
          ))}
        </View>
        {draft.form === 'custom' ? (
          <Field label={t('item.customForm')} placeholder={t('item.customFormPlaceholder')} value={draft.customFormLabel} onChangeText={(v) => set('customFormLabel', v)} error={errors.customFormLabel ? t(errors.customFormLabel) : null} ltr />
        ) : null}
        <View style={{ gap: 6 }}>
          <Text variant="smallStrong" color="secondary">
            {t('item.strength')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field placeholder={t('item.strengthValue')} value={draft.strengthValue} onChangeText={(v) => set('strengthValue', v)} keyboardType="decimal-pad" error={errors.strengthValue ? t(errors.strengthValue) : null} ltr accessibilityLabel={t('item.strengthValue')} />
            </View>
            <View style={{ flex: 1 }}>
              {customStrengthUnit ? (
                <Field placeholder={t('item.strengthUnit')} value={draft.strengthUnit} onChangeText={(v) => set('strengthUnit', v)} ltr accessibilityLabel={t('item.strengthUnit')} />
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STRENGTH_UNITS.map((unit) => (
              <Chip key={unit} label={unit} selected={!customStrengthUnit && draft.strengthUnit === unit} onPress={() => { setCustomStrengthUnit(false); set('strengthUnit', unit); }} />
            ))}
            <Chip label={t('common.custom')} selected={customStrengthUnit} onPress={() => setCustomStrengthUnit(true)} />
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Text variant="smallStrong" color="secondary">
            {t('item.servingSize')}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field value={draft.servingSize} onChangeText={(v) => set('servingSize', v)} keyboardType="decimal-pad" error={errors.servingSize ? t(errors.servingSize) : null} ltr accessibilityLabel={t('item.servingSize')} suffix={unitLabel(draft.servingUnit, Number(draft.servingSize) || 1, language)} />
            </View>
          </View>
          <Text variant="small" color="muted">
            {t('item.servingHint')}
          </Text>
        </View>
      </Card>

      <SectionHeader title={t('item.dose')} />
      <Card style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field label={t('item.doseAmount')} value={draft.doseAmount} onChangeText={(v) => set('doseAmount', v)} keyboardType="decimal-pad" error={errors.doseAmount ? t(errors.doseAmount) : null} ltr />
          </View>
          {customDoseUnit ? (
            <View style={{ flex: 1 }}>
              <Field label={t('item.doseUnit')} value={draft.doseUnit} onChangeText={(v) => set('doseUnit', v)} ltr />
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {doseUnits.map((unit) => (
            <Chip key={unit} label={unitLabel(unit, doseAmount, language)} selected={!customDoseUnit && draft.doseUnit === unit} onPress={() => { setCustomDoseUnit(false); set('doseUnit', unit); }} />
          ))}
          <Chip label={t('common.custom')} selected={customDoseUnit} onPress={() => { setCustomDoseUnit(true); if (doseUnits.includes(draft.doseUnit)) set('doseUnit', ''); }} />
        </View>
      </Card>

      <SectionHeader title={t('common.more')} />
      <Card style={{ gap: theme.spacing.md }}>
        <Field label={t('item.purpose')} placeholder={t('item.purposePlaceholder')} value={draft.purpose} onChangeText={(v) => set('purpose', v)} />
        <Field label={t('item.ingredients')} placeholder={t('item.ingredientsPlaceholder')} value={draft.ingredients} onChangeText={(v) => set('ingredients', v)} multiline ltr />
        <Field label={t('item.notes')} placeholder={t('item.notesPlaceholder')} value={draft.notes} onChangeText={(v) => set('notes', v)} multiline />
      </Card>
    </View>
  );
}
