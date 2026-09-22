import type { LocalDate } from './time/localDate';
import type { TimeOfDay } from './time/clock';

export type Language = 'en' | 'ar' | 'fr' | 'es' | 'de';
export type ThemePreference = 'system' | 'light' | 'dark';
export type TimeFormat = 'system' | '12h' | '24h';
export type VolumeUnit = 'ml' | 'floz';

export type ItemKind = 'supplement' | 'medication';
export type ItemForm = 'capsule' | 'tablet' | 'powder' | 'liquid' | 'gummy' | 'drops' | 'injection' | 'custom';
export type ItemStatus = 'active' | 'paused' | 'archived';

export interface Item {
  id: string;
  kind: ItemKind;
  displayName: string;
  genericName: string | null;
  brand: string | null;
  ingredients: string[];
  strengthValue: number | null;
  strengthUnit: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  doseAmount: number;
  doseUnit: string;
  form: ItemForm;
  customFormLabel: string | null;
  purpose: string | null;
  notes: string | null;
  catalogId: string | null;
  status: ItemStatus;
  isDemo: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export type AnchorKey = 'wake' | 'breakfast' | 'lunch' | 'dinner' | 'bedtime';
export const ANCHOR_KEYS: AnchorKey[] = ['wake', 'breakfast', 'lunch', 'dinner', 'bedtime'];

export type Anchors = Record<AnchorKey, TimeOfDay | null>;

/** A dated history entry; the value applies from `effectiveFrom` (inclusive) until the next entry. */
export interface Dated<T> {
  effectiveFrom: LocalDate;
  value: T;
}

export type TimeSlot =
  | { kind: 'exact'; time: TimeOfDay }
  | { kind: 'anchor'; anchor: AnchorKey; offsetMinutes: number }
  | { kind: 'group'; groupId: string };

export type GroupTime = Exclude<TimeSlot, { kind: 'group' }>;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Recurrence =
  | { type: 'daily' }
  | { type: 'weekdays'; weekdays: Weekday[] }
  | { type: 'interval'; everyDays: number }
  | { type: 'cycle'; onDays: number; offDays: number }
  | { type: 'asNeeded' };

/**
 * How hard a reminder pushes. `insistent` ignores the repeat fields and alerts
 * every couple of minutes until the dose is resolved, for doses that must not be
 * slept through. It is still a notification: iOS silences it like any other when
 * the ringer switch is off, so it is not an alarm and must not be labelled as one.
 */
export type ReminderMode = 'standard' | 'insistent';

export interface ReminderConfig {
  enabled: boolean;
  /** Extra alerts after the due alert. */
  repeatCount: number;
  repeatIntervalMinutes: number;
  /** Absent on records written before this existed; read it as 'standard'. */
  mode?: ReminderMode;
}

export interface Schedule {
  id: string;
  itemId: string;
  recurrence: Recurrence;
  slots: TimeSlot[];
  startDate: LocalDate;
  endDate: LocalDate | null;
  /** Version validity window on the local calendar; `effectiveTo` is exclusive. */
  effectiveFrom: LocalDate;
  effectiveTo: LocalDate | null;
  reminders: ReminderConfig | null;
  createdAt: number;
}

export interface RoutineGroup {
  id: string;
  name: string;
  timeHistory: Dated<GroupTime>[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  archivedAt: number | null;
}

export interface Occurrence {
  key: string;
  itemId: string;
  scheduleId: string;
  localDate: LocalDate;
  slotKey: string;
  slot: TimeSlot;
  groupId: string | null;
  scheduledMinutes: number;
  scheduledAt: number;
  tz: string;
}

export type FinalAction = 'taken' | 'skipped' | 'missed';
export type LogSource = 'app' | 'notification' | 'group' | 'history';

export interface DoseLog {
  id: string;
  itemId: string;
  occurrenceKey: string | null;
  action: FinalAction;
  at: number;
  localDate: LocalDate;
  tz: string;
  amount: number | null;
  unit: string | null;
  reason: string | null;
  note: string | null;
  scheduledAt: number | null;
  itemNameSnapshot: string;
  doseSnapshot: string;
  source: LogSource;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface OccurrenceState {
  key: string;
  snoozedUntil: number | null;
  remindAt: number | null;
  updatedAt: number;
}

export type OccurrenceStatus = 'upcoming' | 'due' | 'snoozed' | 'overdue' | 'autoMissed' | 'taken' | 'skipped' | 'missed';

export interface HydrationEntry {
  id: string;
  amountMl: number;
  at: number;
  localDate: LocalDate;
  tz: string;
  isDemo: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface QuietHours {
  enabled: boolean;
  start: TimeOfDay;
  end: TimeOfDay;
  mode: 'delay' | 'suppress';
}

export type NotificationSound = 'default' | 'chime' | 'drop' | 'none';

export interface ReminderSettings {
  enabled: boolean;
  repeatCount: number;
  repeatIntervalMinutes: number;
  /** Default for every item; a schedule may override it. */
  mode?: ReminderMode;
  snoozeMinutes: number;
  remindTonightTime: TimeOfDay;
  quietHours: QuietHours;
  discreetText: boolean;
  sound: NotificationSound;
}

export interface HydrationSettings {
  goalHistory: Dated<number>[]; // ml
  quickAddsMl: number[];
  remindersEnabled: boolean;
  reminderIntervalMinutes: number;
}

export interface MissedPolicy {
  mode: 'stayOverdue' | 'markMissed';
  afterMinutes: number;
}

export interface OnboardingDraft {
  language?: Language;
  preferredName?: string;
  timeFormat?: TimeFormat;
  volumeUnit?: VolumeUnit;
  anchors?: Partial<Anchors>;
  hydrationGoalMl?: number;
  firstItemId?: string | null;
}

export interface OnboardingState {
  completed: boolean;
  step: number;
  completedAt: number | null;
  draft: OnboardingDraft;
}

export interface Settings {
  language: Language;
  theme: ThemePreference;
  timeFormat: TimeFormat;
  volumeUnit: VolumeUnit;
  preferredName: string;
  anchorHistory: Dated<Anchors>[];
  reminders: ReminderSettings;
  hydration: HydrationSettings;
  missed: MissedPolicy;
  onboarding: OnboardingState;
  lastKnownTz: string | null;
  /** Version stamp for future migration of the JSON blob. */
  schemaVersion: number;
}

export interface CatalogEntry {
  id: string;
  name: string;
  kind: ItemKind;
  forms: ItemForm[];
  aliases: string[];
  defaultUnit: string | null;
}
