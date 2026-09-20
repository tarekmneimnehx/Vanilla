import { LANGUAGES, TRANSLATIONS, translate } from '../index';
import { en } from '../translations/en';
import { pluralCategory } from '../plural';
import { formatDuration, formatMinutes, formatLocalDate, formatVolume } from '../format';

function leaves(node: unknown, prefix = ''): string[] {
  if (typeof node === 'string') return [prefix];
  if (Array.isArray(node)) return [prefix];
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (typeof obj.one === 'string' && typeof obj.other === 'string') return [prefix];
    return Object.keys(obj).flatMap((k) => leaves(obj[k], prefix ? `${prefix}.${k}` : k));
  }
  return [];
}

function placeholders(text: string): string[] {
  return (text.match(/\{\w+\}/g) ?? []).sort();
}

function lookup(table: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), table);
}

describe('translations', () => {
  const keys = leaves(en);

  it.each(LANGUAGES.map((l) => l.code))('%s provides every key with matching placeholders', (code) => {
    const table = TRANSLATIONS[code];
    const missing = keys.filter((key) => lookup(table, key) === undefined);
    expect(missing).toEqual([]);
    for (const key of keys) {
      const source = lookup(en, key);
      const target = lookup(table, key);
      if (typeof source === 'string' && typeof target === 'string') {
        expect({ key, placeholders: placeholders(target) }).toEqual({ key, placeholders: placeholders(source) });
      }
    }
  });

  it('selects plural forms', () => {
    expect(translate('en', 'common.days', { count: 1 })).toBe('1 day');
    expect(translate('en', 'common.days', { count: 3 })).toBe('3 days');
    expect(translate('fr', 'common.days', { count: 0 })).toBe('0 jour');
    expect(translate('ar', 'common.days', { count: 2 })).toBe('يومان');
    expect(pluralCategory('ar', 11)).toBe('many');
    expect(pluralCategory('ar', 103)).toBe('few');
    expect(pluralCategory('de', 1)).toBe('one');
  });

  it('isolates Latin names inside Arabic sentences', () => {
    const text = translate('ar', 'notifications.dose.titleOne', { name: 'Vitamin D3' });
    expect(text).toContain('⁨Vitamin D3⁩');
  });

  it('formats times, dates, volumes and durations per locale', () => {
    const ctx = { language: 'en' as const, timeFormat: '24h' as const, tz: 'UTC', deviceUses24h: true };
    expect(formatMinutes(8 * 60 + 5, ctx)).toBe('08:05');
    expect(formatMinutes(20 * 60 + 5, { ...ctx, timeFormat: '12h' })).toMatch(/8:05\s?pm/i);
    expect(formatLocalDate('2026-09-20', 'weekday', 'de')).toBe('Sonntag');
    expect(formatLocalDate('2026-09-20', 'short', 'fr')).toContain('20');
    expect(formatVolume(2000, 'ml', 'en')).toBe('2,000 ml');
    expect(formatVolume(2000, 'floz', 'en')).toBe('67.6 fl oz');
    expect(formatDuration(90, 'en')).toBe('1 hour 30 minutes');
    expect(formatDuration(15, 'es')).toBe('15 minutos');
  });
});
