import type { Item, ItemForm, Language } from '@/domain/types';
import { formatNumberFor, translate, type TranslationKey } from './index';

/** Unit keys that have localized, pluralized labels. Anything else is shown verbatim. */
export const KNOWN_UNITS = ['capsule', 'tablet', 'scoop', 'gummy', 'drop', 'ml', 'tsp', 'g', 'mg', 'mcg', 'iu', 'units', 'dose', 'sachet', 'puff'] as const;
export type KnownUnit = (typeof KNOWN_UNITS)[number];

export const DOSE_UNITS_BY_FORM: Record<ItemForm, string[]> = {
  capsule: ['capsule'],
  tablet: ['tablet'],
  powder: ['scoop', 'g', 'sachet', 'tsp'],
  liquid: ['ml', 'tsp', 'dose'],
  gummy: ['gummy'],
  drops: ['drop', 'ml'],
  injection: ['units', 'ml', 'dose'],
  custom: ['dose', 'puff', 'units'],
};

export const SERVING_UNIT_BY_FORM: Record<ItemForm, string> = {
  capsule: 'capsule',
  tablet: 'tablet',
  powder: 'scoop',
  liquid: 'ml',
  gummy: 'gummy',
  drops: 'drop',
  injection: 'units',
  custom: 'dose',
};

export const STRENGTH_UNITS = ['mg', 'mcg', 'g', 'IU', 'ml', '%', 'CFU', 'mEq'];

export function unitLabel(unit: string, count: number, language: Language): string {
  const key = unit.toLowerCase();
  if ((KNOWN_UNITS as readonly string[]).includes(key)) {
    return translate(language, `item.units.${key}` as TranslationKey, { count });
  }
  return unit;
}

export function formatDoseText(amount: number, unit: string, language: Language): string {
  const number = formatNumberFor(amount, language, { maximumFractionDigits: 2 });
  return `${number} ${unitLabel(unit, amount, language)}`.trim();
}

export function formatItemDose(item: Item, language: Language): string {
  return formatDoseText(item.doseAmount, item.doseUnit, language);
}

export function formatStrength(item: Item, language: Language): string | null {
  if (item.strengthValue === null || !item.strengthUnit) return null;
  return `${formatNumberFor(item.strengthValue, language, { maximumFractionDigits: 2 })} ${item.strengthUnit}`;
}

export function formLabel(item: Pick<Item, 'form' | 'customFormLabel'>, language: Language): string {
  if (item.form === 'custom' && item.customFormLabel) return item.customFormLabel;
  return translate(language, `item.forms.${item.form}` as TranslationKey);
}
