import { useSyncExternalStore } from 'react';
import type { Language } from '@/domain/types';
import { pluralCategory } from './plural';
import { en, type Translation, type TranslationKey } from './translations/en';
import { ar } from './translations/ar';
import { fr } from './translations/fr';
import { es } from './translations/es';
import { de } from './translations/de';

export type { TranslationKey };

export const LANGUAGES: { code: Language; name: string; nativeName: string; rtl: boolean; locale: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English', rtl: false, locale: 'en-GB' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, locale: 'ar' },
  { code: 'fr', name: 'French', nativeName: 'Français', rtl: false, locale: 'fr-FR' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, locale: 'es-ES' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, locale: 'de-DE' },
];

export const TRANSLATIONS: Record<Language, Translation> = { en, ar, fr, es, de };

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.some((l) => l.code === value);
}

export function isRTL(language: Language): boolean {
  return LANGUAGES.find((l) => l.code === language)?.rtl ?? false;
}

export function localeFor(language: Language): string {
  return LANGUAGES.find((l) => l.code === language)?.locale ?? 'en-GB';
}

let currentLanguage: Language = 'en';
const listeners = new Set<() => void>();

export function setLanguage(language: Language): void {
  if (language === currentLanguage) return;
  currentLanguage = language;
  listeners.forEach((l) => l());
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function useLanguage(): Language {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => currentLanguage,
    () => currentLanguage,
  );
}

export type Params = Record<string, string | number | undefined>;

type Leaf = string | readonly string[] | { zero?: string; one: string; two?: string; few?: string; many?: string; other: string };

function lookup(table: Translation, key: string): Leaf | undefined {
  let node: unknown = table;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node as Leaf | undefined;
}

const FSI = '⁨';
const PDI = '⁩';

function interpolate(template: string, params: Params | undefined, language: Language): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    const text = typeof value === 'number' ? formatNumberFor(value, language) : value;
    // Isolate user-provided text inside Arabic sentences so mixed-direction names and numbers keep their order.
    return language === 'ar' && typeof value === 'string' && /[A-Za-z0-9]/.test(text) ? `${FSI}${text}${PDI}` : text;
  });
}

const numberFormatters = new Map<string, Intl.NumberFormat | null>();

export function formatNumberFor(value: number, language: Language, options?: Intl.NumberFormatOptions): string {
  const locale = localeFor(language);
  const cacheKey = `${locale}|${JSON.stringify(options ?? {})}`;
  let formatter = numberFormatters.get(cacheKey);
  if (formatter === undefined) {
    try {
      formatter = new Intl.NumberFormat(locale, options);
    } catch {
      formatter = null;
    }
    numberFormatters.set(cacheKey, formatter);
  }
  if (!formatter) return String(value);
  try {
    return formatter.format(value);
  } catch {
    return String(value);
  }
}

/** Translates a key in a given language, with interpolation and plural selection via a `count` param. */
export function translate(language: Language, key: TranslationKey, params?: Params): string {
  const leaf = lookup(TRANSLATIONS[language], key) ?? lookup(en, key);
  if (leaf === undefined) return key;
  if (typeof leaf === 'string') return interpolate(leaf, params, language);
  if (Array.isArray(leaf)) return leaf.join(', ');
  const forms = leaf as Exclude<Leaf, string | readonly string[]>;
  const count = typeof params?.count === 'number' ? params.count : 0;
  const category = pluralCategory(language, count);
  const text = forms[category] ?? forms.other;
  return interpolate(text, params, language);
}

export function translateList(language: Language, key: TranslationKey): readonly string[] {
  const leaf = lookup(TRANSLATIONS[language], key) ?? lookup(en, key);
  return Array.isArray(leaf) ? (leaf as readonly string[]) : [];
}

export function t(key: TranslationKey, params?: Params): string {
  return translate(currentLanguage, key, params);
}

export interface I18n {
  language: Language;
  locale: string;
  rtl: boolean;
  t: (key: TranslationKey, params?: Params) => string;
  list: (key: TranslationKey) => readonly string[];
  n: (value: number, options?: Intl.NumberFormatOptions) => string;
}

export function useI18n(): I18n {
  const language = useLanguage();
  return {
    language,
    locale: localeFor(language),
    rtl: isRTL(language),
    t: (key, params) => translate(language, key, params),
    list: (key) => translateList(language, key),
    n: (value, options) => formatNumberFor(value, language, options),
  };
}
