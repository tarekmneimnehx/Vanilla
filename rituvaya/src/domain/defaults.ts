import type { Anchors, Settings } from './types';

export const DEFAULT_ANCHORS: Anchors = {
  wake: '07:00',
  breakfast: null,
  lunch: null,
  dinner: null,
  bedtime: '22:30',
};

export const SETTINGS_SCHEMA_VERSION = 1;

export function defaultSettings(today: string, tz: string): Settings {
  return {
    language: 'en',
    theme: 'system',
    timeFormat: 'system',
    volumeUnit: 'ml',
    preferredName: '',
    anchorHistory: [{ effectiveFrom: today, value: DEFAULT_ANCHORS }],
    reminders: {
      enabled: true,
      repeatCount: 3,
      repeatIntervalMinutes: 15,
      snoozeMinutes: 10,
      remindTonightTime: '21:00',
      quietHours: { enabled: false, start: '22:00', end: '07:00', mode: 'delay' },
      discreetText: false,
      sound: 'default',
    },
    hydration: {
      goalHistory: [],
      quickAddsMl: [150, 250, 500],
      remindersEnabled: false,
      reminderIntervalMinutes: 120,
    },
    missed: { mode: 'stayOverdue', afterMinutes: 240 },
    onboarding: { completed: false, step: 0, completedAt: null, draft: {} },
    lastKnownTz: tz,
    schemaVersion: SETTINGS_SCHEMA_VERSION,
  };
}

/** Minutes after the scheduled time during which an unrecorded dose reads as "due" rather than "overdue". */
export const DUE_WINDOW_MINUTES = 60;

/** Notification budget per platform. iOS keeps only the 64 soonest pending local notifications. */
export const NOTIFICATION_BUDGET = { ios: 60, android: 100, default: 60 } as const;

/** How far ahead notifications are planned; the budget usually caps earlier. */
export const NOTIFICATION_HORIZON_DAYS = 7;
