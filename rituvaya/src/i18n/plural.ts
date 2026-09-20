import type { Language } from '@/domain/types';

export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * CLDR plural categories for the supported languages, implemented by hand
 * because Intl.PluralRules is missing on some Hermes builds.
 */
export function pluralCategory(language: Language, n: number): PluralCategory {
  const abs = Math.abs(n);
  switch (language) {
    case 'fr':
      return abs === 0 || abs === 1 ? 'one' : 'other';
    case 'ar': {
      if (abs === 0) return 'zero';
      if (abs === 1) return 'one';
      if (abs === 2) return 'two';
      const mod = abs % 100;
      if (mod >= 3 && mod <= 10) return 'few';
      if (mod >= 11 && mod <= 99) return 'many';
      return 'other';
    }
    default:
      return abs === 1 ? 'one' : 'other';
  }
}
