import { DevSettings, I18nManager, Platform } from 'react-native';

export type DirectionResult = 'unchanged' | 'reloading' | 'restartNeeded';

/**
 * Aligns the native layout direction with the chosen language. Screens also
 * set `direction` on their root view, so most of the UI mirrors immediately;
 * native navigation chrome needs a reload, which we attempt here.
 */
export async function applyLayoutDirection(rtl: boolean): Promise<DirectionResult> {
  if (Platform.OS === 'web') {
    try {
      const doc = (globalThis as { document?: { documentElement: { dir: string } } }).document;
      if (doc) doc.documentElement.dir = rtl ? 'rtl' : 'ltr';
    } catch {
      // ignore
    }
    return 'unchanged';
  }
  if (I18nManager.isRTL === rtl) return 'unchanged';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  try {
    const Updates = require('expo-updates') as typeof import('expo-updates');
    await Updates.reloadAsync();
    return 'reloading';
  } catch {
    // Not available in development builds or Expo Go; fall back to the dev reload.
  }
  try {
    if (__DEV__) {
      DevSettings.reload();
      return 'reloading';
    }
  } catch {
    // ignore
  }
  return 'restartNeeded';
}
