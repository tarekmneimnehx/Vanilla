# Rituvaya

A calm, local-first iOS and Android app for tracking supplements, medications and water. Working name; prototype for a business launch.

Built with Expo SDK 57 (React Native 0.86, TypeScript), expo-router, expo-sqlite and expo-notifications. No backend, no account, no analytics. Everything is stored on the device.

Screenshots of the working app are in [`docs/screenshots`](docs/screenshots) (captured from the web preview of the same code at iPhone size; see "How it was verified").

## What is implemented

- **Onboarding** (7 guided steps, resumable): language, name, wake-up/bedtime/optional meals, hydration goal, first item and its schedule, routine preview, notification permission with explanation. Time format, units and theme are not asked for here — they follow the device and can be changed in Settings.
- **Today**: greeting and date, truthful progress orb (recorded ÷ scheduled, water ring), prominent next dose, overdue section, chronological schedule with routine groups and a "mark all taken" group action that names the pending count, hydration card with quick add, modest streak pills, completed-day and empty states, time-zone-change notice.
- **Dose logging**: taken now, taken earlier (editable time and amount), skip with reason, snooze (5–60 min), remind tonight (with visible destination time and fallback when the evening time passed), mark missed, undo from a toast, later corrections in History.
- **My Routine**: search, filters (all / supplements / medications / paused / archived), add / edit / pause / resume / archive (history preserved), routine groups (create, edit, archive), schedule editing that only affects future occurrences.
- **Items**: a name is the only required field — enough for people who just want to remember what they take. Brand sits behind its own button, and everything else (generic name, ingredients, strength + unit, serving size, dose amount + unit, form, purpose, notes) is folded under "More details", which opens by itself when an item already carries any of it. Forms: capsule, tablet, powder, liquid, gummy, drops, injection, custom. Small generic seed catalog for names and forms only (no dosing guidance), manual entry always available.
- **Schedules**: daily, selected weekdays, every other day, every N days, on/off cycles, as-needed, multiple times per day, start and optional end date, exact times, anchors (wake-up, meals, bedtime) with offsets, routine-group times. Versioned definitions: edits apply from today; anchors and group times keep dated history.
- **Reminders**: real local notifications, due alert + up to 3 repeats (configurable), combined notifications for items due together, action buttons (Taken, Snooze, Skip, Remind tonight), quiet hours (delay or mute), discreet text, sound choice, permission/status screen with a test reminder, reconciliation that cancels stale alerts and never replays expired ones. Details and limits: [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md).
- **Hydration**: user-set goal, ml or fl oz (stored in ml), configurable quick-add amounts, custom amount, editable/removable entries, optional gentle reminders during waking hours, animated fill with reduced-motion fallback, no extra credit past the goal.
- **History**: calendar with per-day marks, day detail with labelled counts and percentages, corrections and backdated records, weekly bars, per-item history, separate tracking and hydration streaks.
- **Settings**: language, theme (light/dark/system), time format, units, name, anchors, reminder settings, quiet hours, privacy, hydration, JSON export via the share sheet, delete all data, demo data (clearly labelled, removable), storage status ("stored on this device only").
- **Languages**: English, Arabic (full RTL), French, Spanish, German. All visible strings come from translation files. Generated translations still need native-speaker review before commercial release.
- **Accessibility**: labels on every control, 48 pt touch targets, Dynamic Type with per-style caps, reduced-motion support, contrast-checked palette in both themes.

Out of scope, by design: AI chat, recommendations, interaction checks, articles, symptom tracking, inventory/refills, scanning, prebuilt regimens, paywalls, admin dashboards, sign-in, cloud sync.

## Run it on your iPhone

The fastest path uses Expo Go; the full path uses a development build (needed for custom notification sounds and for the most faithful notification behaviour).

### Option A: Expo Go (5 minutes, no Mac needed)

1. Install **Expo Go** from the App Store on the iPhone.
2. On a computer with Node 20+ (any OS):
   ```bash
   cd rituvaya
   npm install
   npm run phone
   ```
   `npm run phone` is `expo start --tunnel --go --clear`: it serves through a tunnel rather than the local network and selects Expo Go directly, so no `s` keypress is needed and the phone does not have to be on the same Wi-Fi. Use plain `npx expo start` when the local network does work — it is faster.
3. Scan the QR code with the iPhone camera. On the local-network variant the phone must be on the same Wi-Fi, and iOS must have granted Expo Go the **Local Network** permission (Settings › Privacy & Security › Local Network) or it cannot reach the computer.
4. Local notifications work in Expo Go. Custom sounds do not (device default plays), and Expo Go can reset the forced RTL layout between launches; the in-app mirroring still applies.

### Option B: Development build on the phone (Mac with Xcode)

1. Install Xcode from the App Store, then `sudo xcode-select -s /Applications/Xcode.app` and open Xcode once to accept the licence.
2. Connect the iPhone by cable, enable Developer Mode on the phone (Settings › Privacy & Security › Developer Mode).
3. In Xcode › Settings › Accounts, sign in with your Apple ID (a free account works for on-device testing; builds expire after 7 days, a paid Apple Developer Program membership removes that limit).
4. Build and install:
   ```bash
   cd rituvaya
   npm install
   npx expo prebuild --platform ios      # generates the ios/ folder from app.json
   npx expo run:ios --device             # pick your iPhone; Xcode signs with your team
   ```
   If signing fails, open `ios/Rituvaya.xcworkspace`, select the target › Signing & Capabilities, choose your Team, and run again. On the phone, the first launch of a build signed with a free Apple ID needs Settings › General › VPN & Device Management › trust the developer.
5. That command makes a **debug** build: it loads JavaScript from the Metro server, so it only opens while `npx expo start --dev-client` is running on the Mac. To use the app away from the computer, build the release variant instead — it embeds the bundle and runs on its own:
   ```bash
   npx expo run:ios --device --configuration Release
   ```
   With a free Apple ID the installed app stops launching after 7 days; re-run the command to reinstall (records on the device are kept).

### Option C: Cloud build with EAS (no Mac required)

```bash
npm install -g eas-cli
eas login
cd rituvaya && eas build:configure
eas build --profile development --platform ios   # or --profile preview for a shareable build
```
EAS asks for Apple credentials; installing on a physical iPhone through EAS requires an Apple Developer Program membership (ad-hoc provisioning). Register the device with `eas device:create`.

### Option D: Web preview in the phone's browser (no install)

The same code runs as a web app with browser storage (no notifications, no native pickers). To host it anywhere static:

```bash
cd rituvaya
npx expo export --platform web
node scripts/prepare-web-preview.js      # makes dist/ relocatable (relative URLs, bundles/ folder)
node scripts/check-web-preview.js        # optional: boots dist/ under a sub-path in headless Chromium
```
Upload the `dist/` folder to any static host (Netlify drop, Vercel, GitHub Pages, S3) and open the link in Safari or Chrome on the phone. Add it to the home screen for a full-screen feel.

## Run it on Android

- **Expo Go**: same as Option A; scan the QR code with the Expo Go app.
- **Emulator or device build**: install Android Studio + an emulator or enable USB debugging on a phone, then
  ```bash
  cd rituvaya
  npx expo prebuild --platform android
  npx expo run:android
  ```
- On Android 13+ the app asks for `POST_NOTIFICATIONS`; on Android 12+ exact alarm times may need the "Alarms & reminders" permission, which the notification status screen explains.

## Signing and identifiers

- Bundle identifier / package: `com.rituvaya.app` (change in `app.json` before store submission).
- The app uses local notifications only, so `plugins/withLocalOnlyNotifications.js` strips the `aps-environment` entitlement that `expo-notifications` adds by default. Without this, a free Apple ID cannot sign a build: personal teams do not support the Push Notifications capability. Remove the plugin if remote push is ever added.
- **UIScene life cycle.** iOS 26 and later assert at launch (`EXC_BREAKPOINT` in `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`) unless the app adopts it, killing the app before any JavaScript runs. Expo SDK 57 ships `ExpoAppSceneDelegate` for this but its template does not wire it, so two pieces here do: `ios.infoPlist.UIApplicationSceneManifest` in `app.json` names the delegate, and `plugins/withSceneLifecycle.js` patches the generated `AppDelegate.swift` to declare `ExpoReactNativeFactoryProvider` conformance and stop creating the window (the scene delegate owns it). Both are needed — the manifest alone makes the scene delegate `fatalError` on connect. Drop them if a later Expo template adopts scenes itself; the plugin throws rather than silently no-op when the template changes.
- Icons, splash, notification icon and the two `.wav` sounds are generated from `scripts/generate-icons.js` and `scripts/generate-sounds.js` and committed under `assets/`.
- No secrets, API keys or services are required.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # jest (domain, i18n, notifications)
npm run web         # web preview at http://localhost:8081 (browser storage instead of SQLite)
node scripts/screenshots.js http://localhost:8081 docs/screenshots   # Playwright walkthrough + screenshots
```

Project layout is described in [`docs/PLAN.md`](docs/PLAN.md). In short: `app/` holds routes, `src/domain` the pure logic, `src/storage` persistence, `src/notifications` the expo-notifications adapter, `src/i18n` translations, `src/ui` the design system, `src/features` screen-level components.

## How it was verified

| Layer | Method | Result |
| --- | --- | --- |
| Domain logic (recurrence, occurrence identity, DST and time-zone changes, statuses, undo, streaks, units, catalog) | Jest, 9 suites | 64 tests pass |
| Services (duplicate notification actions, undo, taken-earlier corrections, group action with partly completed items, schedule edits keeping the past, pause/resume, archive keeping history, hydration corrections and goal history) | Jest against the in-memory repository | pass |
| Translations (every key in all five languages, placeholders, plurals, Arabic isolation, locale formatting) | Jest | pass |
| Notification reconciliation (combining, idempotence, stale cancellation, no replay after undo, permission denied, quiet hours, discreet text, delivered rows dropped) | Jest with a mocked adapter | pass |
| Type safety | `tsc --noEmit` with typed routes | clean |
| Rendered screens (onboarding end to end, Today, logging + undo, routine, item detail, schedule editor, history calendar/week, hydration, settings, dark theme, Arabic RTL, German long labels) | Expo web + headless Chromium at 390×844, console checked | 0 console errors; screenshots in `docs/screenshots` |
| Persistence across relaunch | Web preview reload after onboarding (browser storage); SQLite path exercised only through code review | see limitations |

Not verified here, because this environment has no iOS/Android simulators or devices: notification delivery and action buttons on a real device, the native time pickers, haptics, Dynamic Type at the largest sizes, SQLite on device. The first thing to do on the phone is Settings › Notification status › "Send a test reminder".

## Known limitations

- Notification horizon is ~60 pending alerts; the app tops them up when opened (no background timer). See `docs/NOTIFICATIONS.md`.
- Notification actions open the app to apply the action; they are not processed silently in the background.
- Custom sounds need a native build.
- Translations are machine-generated drafts; review by native speakers is required before release.
- Switching to/from Arabic mirrors the layout immediately in-app; native navigation chrome needs one restart in a development build (the app reloads itself where the OS allows).
- Export is a JSON file for backup and portability; there is no import UI yet.
- The catalog is a small demo list (about 50 generic entries), not a clinical database.

## Next phase (documented, not built)

1. Apple and Google sign-in, using the existing UUID record identities.
2. Cloud backup and cross-device sync over the repository boundary (`src/storage/repository.ts`), with the JSON export format as the wire format starting point.
3. Family profiles and sharing (per-profile items and records).
4. Home-screen widgets (next dose, water), Apple Watch and Wear OS companions.
5. Apple Health and Health Connect for supported types (water intake; medication types where the OS exposes them).
6. Import of the JSON export, background notification actions, richer catalog.
7. Monetization once decided; no paywall or ads exist in this build.
