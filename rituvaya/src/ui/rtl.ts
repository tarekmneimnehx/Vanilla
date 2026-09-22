import { DevSettings, I18nManager, Platform } from 'react-native';

export type DirectionResult = 'unchanged' | 'reloading' | 'restartNeeded';

export interface DirectionOptions {
  /**
   * Reload the app so native navigation chrome picks up the new direction.
   * Callers that hold screen-local state pass `false`: a reload restarts the
   * bundle and loses it. Onboarding does this, because the reload landed the
   * user back on the language step every time they chose a language.
   */
  reload?: boolean;
}

/**
 * Aligns the native layout direction with the chosen language. Screens also
 * set `direction` on their root view, so most of the UI mirrors immediately;
 * native navigation chrome needs a reload, which we attempt here unless the
 * caller opts out.
 */
export async function applyLayoutDirection(rtl: boolean, options: DirectionOptions = {}): Promise<DirectionResult> {
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
  // forceRTL applies on the next launch regardless; the reload only brings it
  // forward. Skipping it leaves the in-app `direction` styling to mirror the UI.
  if (options.reload === false) return 'restartNeeded';
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
