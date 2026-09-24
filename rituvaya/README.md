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
- **Reminders**: real local notifications, due alert + up to 3 repeats (configurable) or an **insistent** style that alerts every 2 minutes until the dose is resolved, combined notifications for items due together, action buttons (Taken, Snooze, Skip, Remind tonight), quiet hours (delay or mute), discreet text, sound choice, permission/status screen with a test reminder, reconciliation that cancels stale alerts and never replays expired ones. Details and limits: [`docs/NOTIFICATIONS.md`](docs/NOTIFICATIONS.md).
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

## Apple Watch

A companion watch app (SwiftUI, in `targets/watch/`) that lists the day's doses with name, size and time, and ticks a dose off with one tap. Reminder buttons pressed on the wrist (Taken, Skip, Snooze, Remind tonight) go through the same path. The phone stays the source of truth — the watch holds no records of its own.

**How it stays in step**

- The phone sends today **and the next two days** (`src/watch/payload.ts`) as WatchConnectivity application context whenever they change (`src/features/WatchBridge.tsx`). The phone app only runs while it's open, so the extra days keep the watch correct on a morning the phone app hasn't been opened yet. The watch picks the day matching its own clock and moves doses from upcoming to due by itself between syncs.
- A tick shows on the watch immediately and is kept across relaunches. It is sent twice — an immediate message when the phone is reachable, and a queued transfer that survives the phone being away — and `AppStore.applyWatchAction` counts the pair once by id. Recording is idempotent per dose anyway, so a dose ticked on both the phone and the watch is logged once.
- The log keeps the time of the tap on the watch, not when the phone heard about it, and is marked with source `watch`.
- Every word the watch shows is sent by the phone in the user's language, including notification button titles and right-to-left layout for Arabic. The only exception is the "open the app on your iPhone" line before the very first sync.

**Running it**

1. `ios.appleTeamId` must be set in `app.json` so the watch target can be signed. With a free Apple ID, find your team ID in an existing build before regenerating: `grep -m1 DEVELOPMENT_TEAM ios/Rituvaya.xcodeproj/project.pbxproj`. It is the 10-character value; add it as `"appleTeamId": "XXXXXXXXXX"` under `ios`.
2. `npx expo prebuild --platform ios --clean` — adds the `RituvayaWatch` target.
3. **Simulator:** open `ios/Rituvaya.xcworkspace`, run the `Rituvaya` scheme on an iPhone simulator that has a paired watch (Xcode creates these pairs; see Window › Devices and Simulators), then choose the `RituvayaWatch` scheme and run it on the paired watch simulator.
4. **Real watch:** the watch needs Developer Mode on (Settings › Privacy & Security on the watch) and must be paired with the phone. Installing the phone app from Xcode installs the watch app with it; if it doesn't appear, open the Watch app on the iPhone › Available Apps › Install.

**Limits, stated plainly**

- A tick reaches the phone at once while the phone app is open or suspended in the background. If the phone app was closed, the tick is recorded — with its original time — the next time the app is opened, and until then the phone's own repeat reminders for that dose can still fire.
- The list is as fresh as the last time the phone app ran, up to two days ahead.
- Undo happens on the phone; a ticked dose can't be un-ticked on the watch.
- The watch payload shape lives in two places: `src/watch/payload.ts` and `targets/watch/Models.swift`. Change them together; the `v` field lets an older watch ignore a newer shape.

## Signing and identifiers

- Bundle identifier / package: `com.rituvaya.app` (change in `app.json` before store submission — it can never change once the app is published).
- **Version and build number.** `expo.version` is the public version (1.0.0); `ios.buildNumber` must go up by one for **every** upload to App Store Connect, including TestFlight-only builds, or the upload is rejected. Settings › About reads the version from the build, so it can't drift from what's shipped.
- **Privacy manifest.** `ios.privacyManifests` in `app.json` declares the required-reason APIs React Native uses (UserDefaults `CA92.1`, file timestamps `C617.1`, system boot time `35F9.1`), no tracking and no collected data; prebuild writes it to `PrivacyInfo.xcprivacy`. "No collected data" is true only while nothing leaves the device — adding analytics, crash reporting or sync means updating this *and* the App Privacy answers in App Store Connect.
- **Medical disclaimer.** App Store guideline 1.4.1 asks health apps to remind people to check with a doctor. `app.medicalDisclaimer` is shown on the onboarding step where the first item is added and in Settings › About. Keep it in both places.
- The app uses local notifications only, so `plugins/withLocalOnlyNotifications.js` strips the `aps-environment` entitlement that `expo-notifications` adds by default. Without this, a free Apple ID cannot sign a build: personal teams do not support the Push Notifications capability. Remove the plugin if remote push is ever added.
- **UIScene life cycle.** iOS 26 and later assert at launch (`EXC_BREAKPOINT` in `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`) unless the app adopts it, killing the app before any JavaScript runs. Expo SDK 57 ships `ExpoAppSceneDelegate` for this but its template does not wire it, so two pieces here do: `ios.infoPlist.UIApplicationSceneManifest` in `app.json` names the delegate, and `plugins/withSceneLifecycle.js` patches the generated `AppDelegate.swift` to declare `ExpoReactNativeFactoryProvider` conformance and stop creating the window (the scene delegate owns it). Both are needed — the manifest alone makes the scene delegate `fatalError` on connect. Drop them if a later Expo template adopts scenes itself; the plugin throws rather than silently no-op when the template changes.
- **Watch app.** `@bacons/apple-targets` builds the `RituvayaWatch` target (`com.rituvaya.app.watchkitapp`, watchOS 10+) from `targets/watch/`. It hardcodes the watch version as 1.0, and App Store Connect requires a watch app's version to match its iPhone app, so `plugins/withWatchVersion.js` copies `version` and `ios.buildNumber` onto the watch target. The watch icon and accent colour are generated into `targets/watch/Assets.xcassets` on prebuild (gitignored).
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
| Watch sync, phone side (payload shape and wording, no nulls for WatchConnectivity, applying ticks with the tap time, dedupe of the message and its queued copy, clock-skew clamp, skip and snooze, malformed messages dropped, no crash without the native module) | Jest against a real store over the in-memory repository | pass |
| Watch app, native side | Swift syntax parsed with tree-sitter; generated Xcode project inspected after prebuild (target, bundle id, watchOS 10, companion link, version 1.0.0, embed phase, files compiled, autolinking) | **not compiled** — see below |

Totals: 16 Jest suites, 125 tests.

Not verified here, because this environment has no iOS/Android simulators or devices: notification delivery and action buttons on a real device, the native time pickers, haptics, Dynamic Type at the largest sizes, SQLite on device. The first thing to do on the phone is Settings › Notification status › "Send a test reminder". **The watch app has never been compiled** — there is no Xcode here — so expect its first build to surface errors a type checker would have caught.

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
4. Home-screen widgets (next dose, water), a watch-face complication, and a Wear OS companion. (The Apple Watch app itself is built; see above.)
5. Apple Health and Health Connect for supported types (water intake; medication types where the OS exposes them).
6. Import of the JSON export, background notification actions, richer catalog.
7. Monetization once decided; no paywall or ads exist in this build.
