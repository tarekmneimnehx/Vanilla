# Reminders: how they work and what they cannot do

Rituvaya uses **local notifications only** (expo-notifications). Nothing leaves the device, and reminders work offline. This document is the honest description of the behaviour, its limits, and what has and has not been verified.

## Planning model

1. Every scheduled occurrence that is still pending (not taken, skipped or confirmed missed) inside the next 7 days is turned into alert times: the due time plus up to N repeats (default 3, every 15 minutes; per item or global setting).
2. Snoozed occurrences get one alert at the snooze time. "Remind tonight" gets one alert at the configured evening time (or in 60 minutes if that time already passed; the app says which).
3. Alerts whose time falls inside quiet hours are either delayed to the end of the window or muted, according to the visible setting. The schedule and the records never change.
4. Alerts due at the same instant are combined into one notification that lists the items ("2 items due"). Its action button reads "Mark all taken" and applies only to those listed items.
5. The plan is sorted by time and cut to the platform budget (60 on iOS, 100 on Android). Optional hydration nudges are added between wake-up and bedtime and stop once the goal is met.
6. The app keeps a registry of what it scheduled (`scheduled_notifications`). On every launch, foreground, and data change it reconciles: notifications the OS already delivered are dropped from the registry, stale ones are cancelled, new ones are scheduled. Only fire times in the future are ever scheduled, so undoing an action never replays expired alerts.

## Horizon and replenishment

- iOS keeps at most **64 pending local notifications** per app and silently drops the rest; Rituvaya plans 60 at a time. With a busy routine (say 6 alerts a day including repeats) that is roughly 10 days of coverage; with more items it is shorter.
- Replenishment happens when the app is opened or returns to the foreground. There is no background JavaScript timer and no server. If the app is not opened for longer than the horizon, reminders stop until it is opened again.
- Android uses AlarmManager through expo-notifications. Exact delivery on Android 12+ can require the "Alarms & reminders" permission (`SCHEDULE_EXACT_ALARM`, declared in `app.json`); some manufacturers apply aggressive battery restrictions that delay alerts.

## Actions

Categories: single dose (Taken / Snooze / Skip / Remind tonight), combined doses (Mark all taken / Snooze / Remind tonight), hydration (Log water). Android shows at most 3 action buttons, so "Remind tonight" is only visible on iOS there; it is always available inside the app.

All actions open the app (`opensAppToForeground: true`). This is a deliberate trade-off: expo-notifications cannot run JavaScript for a background action when the app has been killed, so an in-app handoff is the reliable path. The app processes the action immediately on open and shows a toast with Undo. Responses are de-duplicated by notification id + action, and recording is idempotent, so a repeated "Taken" never creates a second record.

Tapping the notification body opens the "Due now" screen listing exactly the occurrences the alert was about.

## Time zones

Occurrences are identified by local date + slot, never by an epoch, so a time zone change cannot duplicate them. Reminder fire times are recomputed for the new zone on the next reconcile, and the Today screen shows a one-time notice. History keeps the zone and local date each record was made in.

## What was verified

| Check | Status |
| --- | --- |
| Planner rules (repeats, combining, quiet hours, snooze, remind tonight, budget) | Unit tests |
| Reconciliation (idempotent, cancels stale, no replay after undo, permission denied, delivered rows dropped) | Unit tests with a mocked adapter |
| Notification text, discreet mode, categories | Unit tests |
| Scheduling on a real iPhone or Android device | **Not verified** in this environment (no devices or simulators available). Do this first when you run the app: Settings › Reminders › Notification status › "Send a test reminder". |
| Background delivery, action buttons on the lock screen | **Not verified**; see the test-reminder button and the manual checklist in the README. |

## Known limitations

- Custom sounds ("Soft chime", "Water drop") require the native build; Expo Go plays the device default.
- Expo Go on Android does not support remote push, which is irrelevant here, but Expo Go may also reset some native preferences (for example forced RTL) between launches; use a development build for final checks.
- Notification delivery is never guaranteed by either OS; the app always shows overdue doses in Today so nothing is lost when an alert is missed.

## Reminder style: standard and insistent

`ReminderSettings.mode` (overridable per schedule via `ReminderConfig.mode`) chooses how hard a reminder pushes:

- **standard** — the due alert plus the configured repeats (default 3, every 15 minutes).
- **insistent** — replaces those with an alert every 2 minutes, up to 10 times, stopping as soon as the occurrence becomes final. The constants are `INSISTENT_REPEAT_COUNT` and `INSISTENT_REPEAT_INTERVAL_MINUTES` in `src/domain/notifications/planner.ts`; the cap exists so one dose cannot consume the whole pending budget. The settings screen hides the repeat controls in this mode, because insistent ignores them.

The field is optional and absent on records written before it existed; every reader treats a missing value as `standard`.

**This is not an alarm, and the UI says so.** iOS silences it like any notification when the ringer switch is off.

## What a real alarm would take

A true alarm — rings through silent mode and Focus, full-screen with Stop/Snooze, keeps sounding until dismissed — is possible on iOS 26 and later through **AlarmKit**, but not from `expo-notifications`. Investigated September 2026:

- `expo-alarm-kit` (MIT, v0.1.11) wraps it with `requestAuthorization`, `scheduleAlarm`, `scheduleRepeatingAlarm`, `cancelAlarm`, custom sounds, Stop/Snooze labels, and a launch payload — enough to log the dose when the user hits Stop.
- It requires an **iOS deployment target of 26.0**, which would drop every older iPhone. Keeping a lower target means writing our own module that weak-links AlarmKit behind `@available(iOS 26, *)`.
- It requires an **App Groups entitlement**, which needs a **paid** Apple Developer Program membership. A free Personal Team cannot sign it.

`Critical Alerts` would break through the silent switch without AlarmKit, but that entitlement requires an application to Apple and explicit approval.
