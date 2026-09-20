import type { VolumeUnit } from '../types';

export const ML_PER_FLOZ = 29.5735295625;

export function mlToFloz(ml: number): number {
  return ml / ML_PER_FLOZ;
}

export function flozToMl(floz: number): number {
  return floz * ML_PER_FLOZ;
}

/** Converts a user-entered amount in the display unit to stored millilitres (never rounded). */
export function toMl(amount: number, unit: VolumeUnit): number {
  return unit === 'ml' ? amount : flozToMl(amount);
}

/** Value for display in the chosen unit. ml are whole numbers, fl oz keep one decimal. */
export function fromMl(ml: number, unit: VolumeUnit): number {
  if (unit === 'ml') return Math.round(ml);
  return Math.round(mlToFloz(ml) * 10) / 10;
}

export function clampGoalMl(ml: number): number {
  if (!Number.isFinite(ml)) return 0;
  return Math.max(0, Math.min(10_000, ml));
}

export function progressRatio(totalMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.max(0, Math.min(1, totalMl / goalMl));
}
