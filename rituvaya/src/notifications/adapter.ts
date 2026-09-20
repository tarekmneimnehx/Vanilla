import { Platform } from 'react-native';
import type { Language, NotificationSound } from '@/domain/types';
import { translate } from '@/i18n';
import {
  ACTION_LOG_WATER,
  ACTION_SKIP,
  ACTION_SNOOZE,
  ACTION_TAKEN,
  ACTION_TONIGHT,
  CATEGORY_DOSE,
  CATEGORY_DOSE_MULTI,
  CATEGORY_HYDRATION,
  type NotificationPayload,
  type NotificationText,
} from './content';

/**
 * Thin wrapper over expo-notifications. Every function is a safe no-op on
 * web so the preview build never touches the native module.
 */
export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

type ExpoNotifications = typeof import('expo-notifications');

let moduleCache: ExpoNotifications | null = null;

function expo(): ExpoNotifications | null {
  if (!notificationsSupported) return null;
  if (!moduleCache) moduleCache = require('expo-notifications') as ExpoNotifications;
  return moduleCache;
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'provisional' | 'unsupported';

export interface PermissionInfo {
  state: PermissionState;
  canAskAgain: boolean;
}

export const CHANNEL_PREFIX = 'doses';
export const CHANNEL_HYDRATION = 'hydration';

export function channelFor(sound: NotificationSound): string {
  return `${CHANNEL_PREFIX}-${sound}`;
}

function soundFile(sound: NotificationSound): string | boolean {
  switch (sound) {
    case 'default':
      return 'default';
    case 'none':
      return false;
    case 'chime':
      return 'chime.wav';
    case 'drop':
      return 'drop.wav';
  }
}

let configuredLanguage: Language | null = null;

/** Sets the foreground handler, action categories and Android channels. Re-run when the language changes. */
export async function configureNotifications(language: Language): Promise<void> {
  const api = expo();
  if (!api) return;
  if (configuredLanguage === null) {
    api.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
  }
  if (configuredLanguage === language) return;
  configuredLanguage = language;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  await api.setNotificationCategoryAsync(CATEGORY_DOSE, [
    { identifier: ACTION_TAKEN, buttonTitle: t('notifications.actions.taken'), options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: t('notifications.actions.snooze'), options: { opensAppToForeground: true } },
    { identifier: ACTION_SKIP, buttonTitle: t('notifications.actions.skip'), options: { opensAppToForeground: true, isDestructive: true } },
    { identifier: ACTION_TONIGHT, buttonTitle: t('notifications.actions.remindTonight'), options: { opensAppToForeground: true } },
  ]);
  await api.setNotificationCategoryAsync(CATEGORY_DOSE_MULTI, [
    { identifier: ACTION_TAKEN, buttonTitle: t('notifications.actions.takenAll'), options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: t('notifications.actions.snooze'), options: { opensAppToForeground: true } },
    { identifier: ACTION_TONIGHT, buttonTitle: t('notifications.actions.remindTonight'), options: { opensAppToForeground: true } },
  ]);
  await api.setNotificationCategoryAsync(CATEGORY_HYDRATION, [
    { identifier: ACTION_LOG_WATER, buttonTitle: t('notifications.actions.log'), options: { opensAppToForeground: true } },
  ]);
  if (Platform.OS === 'android') {
    const sounds: NotificationSound[] = ['default', 'chime', 'drop', 'none'];
    for (const sound of sounds) {
      const file = soundFile(sound);
      await api.setNotificationChannelAsync(channelFor(sound), {
        name: t('notifications.channels.doses'),
        importance: api.AndroidImportance.HIGH,
        sound: typeof file === 'string' ? file : null,
        vibrationPattern: sound === 'none' ? undefined : [0, 200, 150, 200],
        lockscreenVisibility: api.AndroidNotificationVisibility.PRIVATE,
      });
    }
    await api.setNotificationChannelAsync(CHANNEL_HYDRATION, {
      name: t('notifications.channels.hydration'),
      importance: api.AndroidImportance.DEFAULT,
      sound: 'default',
      lockscreenVisibility: api.AndroidNotificationVisibility.PRIVATE,
    });
  }
}

function mapPermission(response: { granted: boolean; status: string; canAskAgain: boolean; ios?: { status: number } }): PermissionInfo {
  const api = expo();
  if (api && response.ios && response.ios.status === api.IosAuthorizationStatus.PROVISIONAL) return { state: 'provisional', canAskAgain: response.canAskAgain };
  if (response.granted) return { state: 'granted', canAskAgain: response.canAskAgain };
  if (response.status === 'undetermined') return { state: 'undetermined', canAskAgain: true };
  return { state: 'denied', canAskAgain: response.canAskAgain };
}

export async function getPermission(): Promise<PermissionInfo> {
  const api = expo();
  if (!api) return { state: 'unsupported', canAskAgain: false };
  try {
    return mapPermission(await api.getPermissionsAsync());
  } catch {
    return { state: 'unsupported', canAskAgain: false };
  }
}

export async function requestPermission(): Promise<PermissionInfo> {
  const api = expo();
  if (!api) return { state: 'unsupported', canAskAgain: false };
  try {
    return mapPermission(await api.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } }));
  } catch {
    return { state: 'unsupported', canAskAgain: false };
  }
}

export interface ScheduleOptions {
  category: string;
  sound: NotificationSound;
  channel: string;
}

export async function scheduleAt(text: NotificationText, payload: NotificationPayload, fireAt: number, options: ScheduleOptions): Promise<string | null> {
  const api = expo();
  if (!api) return null;
  const file = soundFile(options.sound);
  return api.scheduleNotificationAsync({
    content: {
      title: text.title,
      body: text.body,
      data: { ...payload },
      categoryIdentifier: options.category,
      sound: Platform.OS === 'ios' ? file : undefined,
      interruptionLevel: 'timeSensitive',
    },
    trigger: { type: api.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: options.channel },
  });
}

export async function cancelNative(nativeId: string): Promise<void> {
  const api = expo();
  if (!api) return;
  try {
    await api.cancelScheduledNotificationAsync(nativeId);
  } catch {
    // already gone
  }
}

export async function cancelAllNative(): Promise<void> {
  const api = expo();
  if (!api) return;
  try {
    await api.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function pendingNativeIds(): Promise<Set<string> | null> {
  const api = expo();
  if (!api) return null;
  try {
    const list = await api.getAllScheduledNotificationsAsync();
    return new Set(list.map((n) => n.identifier));
  } catch {
    return null;
  }
}

export async function scheduleTest(text: NotificationText, sound: NotificationSound): Promise<boolean> {
  const api = expo();
  if (!api) return false;
  const file = soundFile(sound);
  await api.scheduleNotificationAsync({
    content: { title: text.title, body: text.body, data: { kind: 'test', plannedId: 'test', occurrenceKeys: [] }, sound: Platform.OS === 'ios' ? file : undefined, categoryIdentifier: CATEGORY_DOSE },
    trigger: { type: api.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: channelFor(sound) },
  });
  return true;
}

export interface ResponseEvent {
  id: string;
  actionIdentifier: string;
  isDefaultAction: boolean;
  payload: unknown;
}

function toEvent(api: ExpoNotifications, response: import('expo-notifications').NotificationResponse): ResponseEvent {
  return {
    id: `${response.notification.request.identifier}:${response.actionIdentifier}`,
    actionIdentifier: response.actionIdentifier,
    isDefaultAction: response.actionIdentifier === api.DEFAULT_ACTION_IDENTIFIER,
    payload: response.notification.request.content.data,
  };
}

export function addResponseListener(listener: (event: ResponseEvent) => void): () => void {
  const api = expo();
  if (!api) return () => undefined;
  const sub = api.addNotificationResponseReceivedListener((response) => listener(toEvent(api, response)));
  return () => sub.remove();
}

/** The response that launched the app (if any), cleared so it is handled once. */
export async function consumeLaunchResponse(): Promise<ResponseEvent | null> {
  const api = expo();
  if (!api) return null;
  try {
    const response = await api.getLastNotificationResponseAsync();
    if (!response) return null;
    await api.clearLastNotificationResponseAsync();
    return toEvent(api, response);
  } catch {
    return null;
  }
}

export async function dismissPresented(): Promise<void> {
  const api = expo();
  if (!api) return;
  try {
    await api.dismissAllNotificationsAsync();
  } catch {
    // ignore
  }
}
