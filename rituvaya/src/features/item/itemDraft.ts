import type { NewItemInput } from '@/domain/services/scheduleService';
import type { CatalogEntry, Item, ItemForm, ItemKind } from '@/domain/types';
import type { TranslationKey } from '@/i18n';
import { DOSE_UNITS_BY_FORM, SERVING_UNIT_BY_FORM } from '@/i18n/dose';

export interface ItemDraft {
  kind: ItemKind;
  displayName: string;
  genericName: string;
  brand: string;
  ingredients: string;
  strengthValue: string;
  strengthUnit: string;
  servingSize: string;
  servingUnit: string;
  doseAmount: string;
  doseUnit: string;
  form: ItemForm;
  customFormLabel: string;
  purpose: string;
  notes: string;
  catalogId: string | null;
  isDemo: boolean;
}

export function emptyDraft(kind: ItemKind = 'supplement'): ItemDraft {
  return {
    kind,
    displayName: '',
    genericName: '',
    brand: '',
    ingredients: '',
    strengthValue: '',
    strengthUnit: 'mg',
    servingSize: '1',
    servingUnit: 'capsule',
    doseAmount: '1',
    doseUnit: 'capsule',
    form: 'capsule',
    customFormLabel: '',
    purpose: '',
    notes: '',
    catalogId: null,
    isDemo: false,
  };
}

export function draftFromCatalog(entry: CatalogEntry): ItemDraft {
  const form = entry.forms[0] ?? 'capsule';
  return {
    ...emptyDraft(entry.kind),
    displayName: entry.name,
    genericName: entry.name,
    catalogId: entry.id,
    form,
    strengthUnit: entry.defaultUnit ?? 'mg',
    servingUnit: SERVING_UNIT_BY_FORM[form],
    doseUnit: DOSE_UNITS_BY_FORM[form][0],
  };
}

export function draftFromItem(item: Item): ItemDraft {
  return {
    kind: item.kind,
    displayName: item.displayName,
    genericName: item.genericName ?? '',
    brand: item.brand ?? '',
    ingredients: item.ingredients.join('\n'),
    strengthValue: item.strengthValue === null ? '' : String(item.strengthValue),
    strengthUnit: item.strengthUnit ?? 'mg',
    servingSize: item.servingSize === null ? '' : String(item.servingSize),
    servingUnit: item.servingUnit ?? SERVING_UNIT_BY_FORM[item.form],
    doseAmount: String(item.doseAmount),
    doseUnit: item.doseUnit,
    form: item.form,
    customFormLabel: item.customFormLabel ?? '',
    purpose: item.purpose ?? '',
    notes: item.notes ?? '',
    catalogId: item.catalogId,
    isDemo: item.isDemo,
  };
}

/** Applies a form change, moving unit defaults along unless the user typed a custom unit. */
export function withForm(draft: ItemDraft, form: ItemForm): ItemDraft {
  const units = DOSE_UNITS_BY_FORM[form];
  const previousUnits = DOSE_UNITS_BY_FORM[draft.form];
  const keepDose = !previousUnits.includes(draft.doseUnit) && draft.form === 'custom';
  return {
    ...draft,
    form,
    doseUnit: keepDose ? draft.doseUnit : units[0],
    servingUnit: previousUnits.includes(draft.servingUnit) || draft.servingUnit === SERVING_UNIT_BY_FORM[draft.form] ? SERVING_UNIT_BY_FORM[form] : draft.servingUnit,
  };
}

function parseNumber(text: string): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

export type DraftErrors = Partial<Record<'displayName' | 'doseAmount' | 'strengthValue' | 'servingSize' | 'customFormLabel', TranslationKey>>;

export function validateDraft(draft: ItemDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.displayName.trim()) errors.displayName = 'item.errors.nameRequired';
  const dose = parseNumber(draft.doseAmount);
  if (dose === null || Number.isNaN(dose) || dose <= 0) errors.doseAmount = 'item.errors.doseRequired';
  const strength = parseNumber(draft.strengthValue);
  if (strength !== null && (Number.isNaN(strength) || strength < 0)) errors.strengthValue = 'item.errors.strengthInvalid';
  const serving = parseNumber(draft.servingSize);
  if (serving !== null && (Number.isNaN(serving) || serving <= 0)) errors.servingSize = 'item.errors.servingInvalid';
  if (draft.form === 'custom' && !draft.customFormLabel.trim()) errors.customFormLabel = 'item.errors.customFormRequired';
  return errors;
}

export function draftToInput(draft: ItemDraft): NewItemInput {
  const strength = parseNumber(draft.strengthValue);
  const serving = parseNumber(draft.servingSize);
  return {
    kind: draft.kind,
    displayName: draft.displayName.trim(),
    genericName: draft.genericName.trim() || null,
    brand: draft.brand.trim() || null,
    ingredients: draft.ingredients
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    strengthValue: strength === null || Number.isNaN(strength) ? null : strength,
    strengthUnit: strength === null || Number.isNaN(strength) ? null : draft.strengthUnit.trim() || null,
    servingSize: serving === null || Number.isNaN(serving) ? null : serving,
    servingUnit: serving === null || Number.isNaN(serving) ? null : draft.servingUnit.trim() || null,
    doseAmount: parseNumber(draft.doseAmount) ?? 1,
    doseUnit: draft.doseUnit.trim() || 'dose',
    form: draft.form,
    customFormLabel: draft.form === 'custom' ? draft.customFormLabel.trim() || null : null,
    purpose: draft.purpose.trim() || null,
    notes: draft.notes.trim() || null,
    catalogId: draft.catalogId,
    isDemo: draft.isDemo,
  };
}
