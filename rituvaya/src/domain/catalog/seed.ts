import type { CatalogEntry } from '../types';

/**
 * A small generic seed catalog for name and form lookup only. It is not
 * comprehensive and not clinically verified; it never suggests doses,
 * purposes, benefits, interactions or timing.
 */
export const CATALOG: CatalogEntry[] = [
  { id: 'vitamin-d3', name: 'Vitamin D3', kind: 'supplement', forms: ['capsule', 'tablet', 'drops', 'gummy'], aliases: ['cholecalciferol', 'vitamine d', 'vitamina d', 'فيتامين د'], defaultUnit: 'IU' },
  { id: 'vitamin-c', name: 'Vitamin C', kind: 'supplement', forms: ['tablet', 'capsule', 'powder', 'gummy'], aliases: ['ascorbic acid', 'vitamine c', 'vitamina c', 'فيتامين سي'], defaultUnit: 'mg' },
  { id: 'vitamin-b12', name: 'Vitamin B12', kind: 'supplement', forms: ['tablet', 'capsule', 'drops', 'injection'], aliases: ['cobalamin', 'methylcobalamin', 'vitamine b12', 'vitamina b12', 'فيتامين ب12'], defaultUnit: 'mcg' },
  { id: 'vitamin-b-complex', name: 'Vitamin B complex', kind: 'supplement', forms: ['tablet', 'capsule'], aliases: ['b complex', 'complexe b', 'complejo b', 'b-komplex'], defaultUnit: null },
  { id: 'vitamin-k2', name: 'Vitamin K2', kind: 'supplement', forms: ['capsule', 'drops', 'tablet'], aliases: ['menaquinone', 'mk-7', 'vitamine k2', 'vitamina k2'], defaultUnit: 'mcg' },
  { id: 'vitamin-a', name: 'Vitamin A', kind: 'supplement', forms: ['capsule', 'tablet', 'drops'], aliases: ['retinol', 'vitamine a', 'vitamina a'], defaultUnit: 'IU' },
  { id: 'vitamin-e', name: 'Vitamin E', kind: 'supplement', forms: ['capsule'], aliases: ['tocopherol', 'vitamine e', 'vitamina e'], defaultUnit: 'IU' },
  { id: 'folate', name: 'Folate', kind: 'supplement', forms: ['tablet', 'capsule'], aliases: ['folic acid', 'vitamin b9', 'acide folique', 'ácido fólico', 'folsäure', 'حمض الفوليك'], defaultUnit: 'mcg' },
  { id: 'biotin', name: 'Biotin', kind: 'supplement', forms: ['tablet', 'capsule', 'gummy'], aliases: ['vitamin b7', 'biotine', 'biotina'], defaultUnit: 'mcg' },
  { id: 'magnesium', name: 'Magnesium', kind: 'supplement', forms: ['capsule', 'tablet', 'powder'], aliases: ['magnesium glycinate', 'magnesium citrate', 'magnésium', 'magnesio', 'مغنيسيوم'], defaultUnit: 'mg' },
  { id: 'zinc', name: 'Zinc', kind: 'supplement', forms: ['tablet', 'capsule', 'drops'], aliases: ['zinc picolinate', 'zink', 'زنك'], defaultUnit: 'mg' },
  { id: 'iron', name: 'Iron', kind: 'supplement', forms: ['tablet', 'capsule', 'liquid', 'drops'], aliases: ['ferrous sulfate', 'ferrous bisglycinate', 'fer', 'hierro', 'eisen', 'حديد'], defaultUnit: 'mg' },
  { id: 'calcium', name: 'Calcium', kind: 'supplement', forms: ['tablet', 'capsule', 'powder'], aliases: ['calcium citrate', 'calcium carbonate', 'calcio', 'kalzium', 'كالسيوم'], defaultUnit: 'mg' },
  { id: 'potassium', name: 'Potassium', kind: 'supplement', forms: ['tablet', 'capsule', 'powder'], aliases: ['potasio', 'kalium', 'بوتاسيوم'], defaultUnit: 'mg' },
  { id: 'selenium', name: 'Selenium', kind: 'supplement', forms: ['tablet', 'capsule'], aliases: ['sélénium', 'selenio', 'selen'], defaultUnit: 'mcg' },
  { id: 'iodine', name: 'Iodine', kind: 'supplement', forms: ['tablet', 'drops'], aliases: ['iode', 'yodo', 'jod'], defaultUnit: 'mcg' },
  { id: 'omega-3', name: 'Omega-3', kind: 'supplement', forms: ['capsule', 'liquid', 'gummy'], aliases: ['fish oil', 'epa', 'dha', 'huile de poisson', 'aceite de pescado', 'fischöl', 'أوميغا 3'], defaultUnit: 'mg' },
  { id: 'multivitamin', name: 'Multivitamin', kind: 'supplement', forms: ['tablet', 'capsule', 'gummy', 'powder'], aliases: ['multi', 'multivitamine', 'multivitamínico', 'فيتامينات متعددة'], defaultUnit: null },
  { id: 'probiotic', name: 'Probiotic', kind: 'supplement', forms: ['capsule', 'powder', 'liquid', 'gummy'], aliases: ['probiotique', 'probiótico', 'probiotikum', 'بروبيوتيك'], defaultUnit: 'CFU' },
  { id: 'collagen', name: 'Collagen', kind: 'supplement', forms: ['powder', 'capsule', 'liquid'], aliases: ['collagène', 'colágeno', 'kollagen', 'كولاجين'], defaultUnit: 'g' },
  { id: 'creatine', name: 'Creatine', kind: 'supplement', forms: ['powder', 'capsule', 'gummy'], aliases: ['creatine monohydrate', 'créatine', 'creatina', 'kreatin'], defaultUnit: 'g' },
  { id: 'protein-powder', name: 'Protein powder', kind: 'supplement', forms: ['powder'], aliases: ['whey', 'protéine', 'proteína', 'proteinpulver'], defaultUnit: 'g' },
  { id: 'electrolytes', name: 'Electrolytes', kind: 'supplement', forms: ['powder', 'tablet', 'liquid'], aliases: ['électrolytes', 'electrolitos', 'elektrolyte'], defaultUnit: null },
  { id: 'coq10', name: 'Coenzyme Q10', kind: 'supplement', forms: ['capsule', 'tablet'], aliases: ['coq10', 'ubiquinol', 'ubiquinone'], defaultUnit: 'mg' },
  { id: 'melatonin', name: 'Melatonin', kind: 'supplement', forms: ['tablet', 'gummy', 'drops', 'liquid'], aliases: ['mélatonine', 'melatonina', 'ميلاتونين'], defaultUnit: 'mg' },
  { id: 'ashwagandha', name: 'Ashwagandha', kind: 'supplement', forms: ['capsule', 'powder', 'tablet', 'gummy'], aliases: ['withania', 'أشواغاندا'], defaultUnit: 'mg' },
  { id: 'turmeric', name: 'Turmeric', kind: 'supplement', forms: ['capsule', 'powder', 'tablet', 'liquid'], aliases: ['curcumin', 'curcuma', 'cúrcuma', 'kurkuma', 'كركم'], defaultUnit: 'mg' },
  { id: 'ginger', name: 'Ginger', kind: 'supplement', forms: ['capsule', 'powder', 'liquid'], aliases: ['gingembre', 'jengibre', 'ingwer', 'زنجبيل'], defaultUnit: 'mg' },
  { id: 'glucosamine', name: 'Glucosamine', kind: 'supplement', forms: ['tablet', 'capsule', 'powder'], aliases: ['chondroitin', 'glucosamina', 'glucosamin'], defaultUnit: 'mg' },
  { id: 'l-theanine', name: 'L-Theanine', kind: 'supplement', forms: ['capsule', 'tablet', 'powder'], aliases: ['theanine', 'théanine', 'teanina'], defaultUnit: 'mg' },
  { id: 'fiber', name: 'Fiber', kind: 'supplement', forms: ['powder', 'capsule', 'gummy'], aliases: ['psyllium', 'fibre', 'fibra', 'ballaststoffe', 'ألياف'], defaultUnit: 'g' },
  { id: 'lions-mane', name: "Lion's mane", kind: 'supplement', forms: ['capsule', 'powder', 'liquid'], aliases: ['hericium', 'crinière de lion', 'melena de león'], defaultUnit: 'mg' },
  { id: 'spirulina', name: 'Spirulina', kind: 'supplement', forms: ['tablet', 'powder', 'capsule'], aliases: ['spiruline', 'espirulina'], defaultUnit: 'g' },
  { id: 'triphala', name: 'Triphala', kind: 'supplement', forms: ['tablet', 'powder', 'capsule'], aliases: [], defaultUnit: 'mg' },
  { id: 'paracetamol', name: 'Paracetamol', kind: 'medication', forms: ['tablet', 'capsule', 'liquid'], aliases: ['acetaminophen', 'paracétamol', 'باراسيتامول'], defaultUnit: 'mg' },
  { id: 'ibuprofen', name: 'Ibuprofen', kind: 'medication', forms: ['tablet', 'capsule', 'liquid'], aliases: ['ibuprofène', 'ibuprofeno', 'إيبوبروفين'], defaultUnit: 'mg' },
  { id: 'aspirin', name: 'Aspirin', kind: 'medication', forms: ['tablet'], aliases: ['acetylsalicylic acid', 'aspirine', 'aspirina', 'أسبرين'], defaultUnit: 'mg' },
  { id: 'metformin', name: 'Metformin', kind: 'medication', forms: ['tablet', 'liquid'], aliases: ['metformine', 'metformina', 'ميتفورمين'], defaultUnit: 'mg' },
  { id: 'levothyroxine', name: 'Levothyroxine', kind: 'medication', forms: ['tablet', 'liquid'], aliases: ['thyroxine', 'levotiroxina', 'ليفوثيروكسين'], defaultUnit: 'mcg' },
  { id: 'omeprazole', name: 'Omeprazole', kind: 'medication', forms: ['capsule', 'tablet'], aliases: ['oméprazole', 'omeprazol', 'أوميبرازول'], defaultUnit: 'mg' },
  { id: 'amoxicillin', name: 'Amoxicillin', kind: 'medication', forms: ['capsule', 'tablet', 'liquid'], aliases: ['amoxicilline', 'amoxicilina', 'أموكسيسيلين'], defaultUnit: 'mg' },
  { id: 'atorvastatin', name: 'Atorvastatin', kind: 'medication', forms: ['tablet'], aliases: ['atorvastatine', 'atorvastatina'], defaultUnit: 'mg' },
  { id: 'lisinopril', name: 'Lisinopril', kind: 'medication', forms: ['tablet'], aliases: [], defaultUnit: 'mg' },
  { id: 'amlodipine', name: 'Amlodipine', kind: 'medication', forms: ['tablet'], aliases: ['amlodipino'], defaultUnit: 'mg' },
  { id: 'losartan', name: 'Losartan', kind: 'medication', forms: ['tablet'], aliases: ['losartán'], defaultUnit: 'mg' },
  { id: 'sertraline', name: 'Sertraline', kind: 'medication', forms: ['tablet', 'liquid'], aliases: ['sertralina', 'sertralin'], defaultUnit: 'mg' },
  { id: 'cetirizine', name: 'Cetirizine', kind: 'medication', forms: ['tablet', 'liquid', 'drops'], aliases: ['cétirizine', 'cetirizina', 'سيتريزين'], defaultUnit: 'mg' },
  { id: 'loratadine', name: 'Loratadine', kind: 'medication', forms: ['tablet', 'liquid'], aliases: ['loratadina'], defaultUnit: 'mg' },
  { id: 'insulin', name: 'Insulin', kind: 'medication', forms: ['injection'], aliases: ['insuline', 'insulina', 'أنسولين'], defaultUnit: 'units' },
  { id: 'vitamin-d-drops', name: 'Vitamin D drops', kind: 'supplement', forms: ['drops'], aliases: ['baby vitamin d'], defaultUnit: 'IU' },
];

export const CATALOG_BY_ID: ReadonlyMap<string, CatalogEntry> = new Map(CATALOG.map((entry) => [entry.id, entry]));

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Simple ranked search over names and aliases: prefix matches first, then substring matches. */
export function searchCatalog(query: string, limit = 8): CatalogEntry[] {
  const q = normalise(query);
  if (!q) return [];
  const tokens = q.split(' ');
  const scored: { entry: CatalogEntry; score: number }[] = [];
  for (const entry of CATALOG) {
    const candidates = [entry.name, ...entry.aliases].map(normalise);
    let best = 0;
    for (const candidate of candidates) {
      const words = candidate.split(' ');
      if (candidate === q) best = Math.max(best, 100);
      else if (candidate.startsWith(q)) best = Math.max(best, 80);
      else if (tokens.every((token) => words.some((word) => word.startsWith(token)))) best = Math.max(best, 60);
      else if (candidate.includes(q)) best = Math.max(best, 40);
    }
    if (best > 0) scored.push({ entry, score: best });
  }
  scored.sort((a, b) => b.score - a.score || a.entry.name.length - b.entry.name.length || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, limit).map((s) => s.entry);
}
