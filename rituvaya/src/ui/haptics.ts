import { Platform } from 'react-native';

type HapticsModule = typeof import('expo-haptics');

let cache: HapticsModule | null | undefined;

function haptics(): HapticsModule | null {
  if (Platform.OS === 'web') return null;
  if (cache === undefined) {
    try {
      cache = require('expo-haptics') as HapticsModule;
    } catch {
      cache = null;
    }
  }
  return cache;
}

/** Light, unobtrusive feedback. All calls are best effort and never throw. */
export const haptic = {
  tap(): void {
    void haptics()?.impactAsync(haptics()!.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  select(): void {
    void haptics()?.selectionAsync().catch(() => undefined);
  },
  success(): void {
    void haptics()?.notificationAsync(haptics()!.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning(): void {
    void haptics()?.notificationAsync(haptics()!.NotificationFeedbackType.Warning).catch(() => undefined);
  },
};
