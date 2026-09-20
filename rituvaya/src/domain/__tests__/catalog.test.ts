import { CATALOG, searchCatalog } from '../catalog/seed';

describe('catalog search', () => {
  it('matches names, aliases and accented input', () => {
    expect(searchCatalog('vit d')[0]?.id).toBe('vitamin-d3');
    expect(searchCatalog('magnésium')[0]?.id).toBe('magnesium');
    expect(searchCatalog('fer').map((e) => e.id)).toContain('iron');
    expect(searchCatalog('حديد')[0]?.id).toBe('iron');
    expect(searchCatalog('acetaminophen')[0]?.id).toBe('paracetamol');
  });

  it('returns nothing for empty or unknown queries', () => {
    expect(searchCatalog('')).toEqual([]);
    expect(searchCatalog('   ')).toEqual([]);
    expect(searchCatalog('zzzzzz')).toEqual([]);
  });

  it('never carries dosing guidance', () => {
    for (const entry of CATALOG) {
      expect(Object.keys(entry).sort()).toEqual(['aliases', 'defaultUnit', 'forms', 'id', 'kind', 'name']);
      expect(entry.forms.length).toBeGreaterThan(0);
    }
  });
});
