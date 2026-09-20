import { flozToMl, fromMl, mlToFloz, toMl, clampGoalMl, progressRatio } from '../hydration/units';

describe('hydration units', () => {
  it('stores millilitres regardless of the display unit', () => {
    expect(toMl(250, 'ml')).toBe(250);
    expect(toMl(8, 'floz')).toBeCloseTo(236.588, 2);
    expect(fromMl(toMl(8, 'floz'), 'floz')).toBe(8);
    expect(fromMl(236.588, 'ml')).toBe(237);
  });

  it('round-trips through both units without drift', () => {
    const ml = 1750;
    expect(flozToMl(mlToFloz(ml))).toBeCloseTo(ml, 9);
  });

  it('clamps goals and progress', () => {
    expect(clampGoalMl(-5)).toBe(0);
    expect(clampGoalMl(Number.NaN)).toBe(0);
    expect(clampGoalMl(50_000)).toBe(10_000);
    expect(progressRatio(3000, 2000)).toBe(1);
    expect(progressRatio(500, 0)).toBe(0);
  });
});
