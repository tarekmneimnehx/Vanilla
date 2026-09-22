import type { CatalogEntry } from '@/domain/types';
import { draftFromCatalog, emptyDraft, hasOptionalDetails } from '../itemDraft';

const entry: CatalogEntry = {
  id: 'vitamin-d',
  name: 'Vitamin D',
  kind: 'supplement',
  forms: ['capsule'],
  defaultUnit: 'IU',
  synonyms: [],
};

describe('hasOptionalDetails', () => {
  it('is false for a blank draft, so a new item opens collapsed', () => {
    expect(hasOptionalDetails(emptyDraft())).toBe(false);
  });

  it('is false for a catalog pick, whose generic name only mirrors the display name', () => {
    expect(hasOptionalDetails(draftFromCatalog(entry))).toBe(false);
  });

  it('is true once a generic name differs from the display name', () => {
    expect(hasOptionalDetails({ ...draftFromCatalog(entry), genericName: 'Cholecalciferol' })).toBe(true);
  });

  it.each([
    ['strength', { strengthValue: '1000' }],
    ['purpose', { purpose: 'bones' }],
    ['notes', { notes: 'with food' }],
    ['ingredients', { ingredients: 'cholecalciferol' }],
    ['a custom form label', { customFormLabel: 'patch' }],
    ['a serving size other than one', { servingSize: '2' }],
    ['a dose other than one', { doseAmount: '3' }],
  ])('is true when the draft carries %s', (_label, patch) => {
    expect(hasOptionalDetails({ ...emptyDraft(), ...patch })).toBe(true);
  });

  it('ignores the brand, which has its own control', () => {
    expect(hasOptionalDetails({ ...emptyDraft(), brand: 'Acme' })).toBe(false);
  });
});
