import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let cached: boolean | null = null;
const listeners = new Set<(v: boolean) => void>();

async function load(): Promise<boolean> {
  try {
    const value = await AccessibilityInfo.isReduceMotionEnabled();
    cached = value;
    return value;
  } catch {
    cached = false;
    return false;
  }
}

/** Reduced-motion preference from the OS; animations should degrade to instant state changes when true. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(cached ?? false);
  useEffect(() => {
    let mounted = true;
    if (cached === null) void load().then((v) => mounted && setReduced(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      cached = v;
      setReduced(v);
      listeners.forEach((l) => l(v));
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

export const durations = { fast: 160, base: 240, slow: 420, fill: 700 } as const;
