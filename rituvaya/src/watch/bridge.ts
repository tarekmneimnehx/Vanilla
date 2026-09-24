import { Platform } from 'react-native';
import type { WatchPayload } from './payload';

type WatchModule = typeof import('react-native-watch-connectivity');

let cached: WatchModule | null | undefined;

/**
 * react-native-watch-connectivity looks up its native half the moment it is
 * imported and throws when that is missing — on the web preview, Android, in
 * tests and in Expo Go. So it is required lazily, on iOS only, and a failure
 * means "no watch here" rather than a crash.
 */
function watchModule(): WatchModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'ios') {
    cached = null;
    return cached;
  }
  try {
    cached = require('react-native-watch-connectivity') as WatchModule;
  } catch {
    cached = null;
  }
  return cached;
}

export function watchSupported(): boolean {
  return watchModule() !== null;
}

/**
 * Application context holds only the latest value and reaches the watch even
 * when its app isn't running, which is what a "today" list wants: the watch
 * never needs yesterday's copies, only the current one.
 */
export function sendToWatch(payload: WatchPayload): boolean {
  const mod = watchModule();
  if (!mod) return false;
  try {
    mod.updateApplicationContext(payload as unknown as Record<string, unknown>);
    return true;
  } catch {
    // No paired watch or no watch app installed: nothing to keep in step.
    return false;
  }
}

/**
 * Everything the watch sends arrives here, whether as an immediate message or a
 * queued user-info transfer. The library replays transfers that arrived before
 * this subscribed, so ticks made while the phone app was closed are not lost.
 */
export function onWatchMessages(handler: (raw: unknown) => void): () => void {
  const mod = watchModule();
  if (!mod) return () => undefined;
  const offUserInfo = mod.watchEvents.on('user-info', (items) => {
    for (const item of items) handler(item);
  });
  const offMessage = mod.watchEvents.on('message', (payload, reply) => {
    handler(payload);
    reply?.({ ok: true });
  });
  return () => {
    offUserInfo();
    offMessage();
  };
}
