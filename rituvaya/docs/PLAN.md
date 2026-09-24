# Rituvaya — implementation plan

Working name: **Rituvaya**. A local-first supplement, medication and hydration tracker for iOS and Android.

## Environment findings

- Repository `tarekmneimnehx/Vanilla` is a static bakery site. The app lives in its own folder, `rituvaya/`, so the site is untouched and the two never share tooling.
- Build container is Linux: no Xcode, no iOS simulator, no Android emulator. Verification here is (1) TypeScript, (2) Jest, (3) rendered screenshots through Expo web + headless Chromium. Physical-device and simulator checks are documented as hand-off steps, never claimed.
- Expo docs site is blocked from this container; API details were taken from the installed package type definitions (SDK 57) and the versioned docs mirrored on GitHub.

## Stack (verified against installed versions)

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | Expo SDK 57, React Native 0.86, React 19.2, TypeScript 6 | `expo@~57.0.24` |
| Navigation | expo-router (file based, typed routes) | `~57.0.22` |
| Storage | expo-sqlite, WAL, `PRAGMA user_version` migrations | `~57.0.3` |
| Notifications | expo-notifications (local only) | `~57.0.20` |
| Animation | react-native-reanimated 4 + worklets | `4.5.1` |
| Vector art | react-native-svg | `15.15.4` |
| Haptics / locale / device | expo-haptics, expo-localization, expo-device | SDK 57 |
| Export | expo-file-system + expo-sharing | SDK 57 |
| Fonts | Fraunces (display), Manrope (text), IBM Plex Sans Arabic (Arabic) | `@expo-google-fonts/*` |
| Tests | jest-expo + @testing-library/react-native | `57.0.5` |

No backend, no paid services, no analytics.

## Architecture

```
rituvaya/
  app/                 expo-router routes only (thin screens)
  src/domain/          pure TypeScript, no React, fully unit tested
    time/              wall-clock + IANA time zone helpers (no Intl.PluralRules / formatToParts dependence)
    schedule/          schedule definitions -> occurrences (identity = itemId|localDate|slotKey)
    logging/           taken / skipped / missed / snoozed state machine + undo
    streaks/           tracking streak and hydration streak
    hydration/         ml <-> fl oz, goals
    notifications/     desired-notification planner (repeats, quiet hours, combining, horizon)
  src/storage/         SQLite schema, migrations, repositories, export, demo data
  src/notifications/   expo-notifications adapter: permissions, categories, reconcile, responses
  src/state/           app store (useSyncExternalStore) + hooks that compose domain + storage
  src/i18n/            translation files (en, ar, fr, es, de), plural rules, formatting
  src/ui/              theme tokens, typography, components, artwork
  src/watch/           Apple Watch sync: payload builder, action parsing, WatchConnectivity bridge
  targets/watch/       the SwiftUI watch app (built into Xcode by @bacons/apple-targets)
  plugins/             config plugins: push entitlement, scene life cycle, watch version
  docs/                this plan, notifications behaviour, handoff
```

Rules:

- Schedule definitions are versioned (`effective_from` / `effective_to`). Editing creates a new version from today; earlier days keep generating from the old version, so history never rewrites.
- Occurrences are computed, not stored, except for state overrides (`occurrence_state`: snoozed, resolved) and dose logs. An occurrence key is stable across regeneration and time zone changes because it is built from the local date and the slot definition, never from an epoch.
- Every log stores a snapshot (item name, dose, scheduled time, time zone, local date). Undo is a soft delete that restores the occurrence to pending; notification reconciliation only ever schedules fire times in the future, so undo cannot replay expired alerts.
- Notifications are reconciled, not fired ad hoc: desired set (from occurrences within the horizon) minus registry of already scheduled ids. Stale ones are cancelled; missing ones scheduled; capped to the OS budget (64 on iOS).
- Actions from notifications are processed idempotently (a log for an occurrence key with a final state is never duplicated).

## Delivery stages

1. Setup and plan (this file). Done.
2. Domain + tests. Done.
3. Storage + store. Done.
4. Design system + i18n. Done.
5. Screens. Done.
6. Notifications. Done (device delivery not verifiable here; see `docs/NOTIFICATIONS.md`).
7. Verification (typecheck, tests, screenshots) and fixes. Done; results in `README.md`.
8. Handoff docs, commit, push. Done.
