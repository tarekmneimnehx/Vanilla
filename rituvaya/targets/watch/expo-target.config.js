/**
 * The Apple Watch companion app. `@bacons/apple-targets` turns this folder into a
 * watchOS target during `expo prebuild`; every file here is compiled into it.
 * The phone owns the schedule and all records — the watch shows what the phone
 * sends and sends ticks back (see src/watch/ and src/features/WatchBridge.tsx).
 *
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'watch',
  name: 'RituvayaWatch',
  displayName: config.name,
  bundleIdentifier: '.watchkitapp',
  // watchOS 10 runs on Series 4 and later.
  deploymentTarget: '10.0',
  icon: '../../assets/icon.png',
  colors: {
    // The watch is always dark, so it uses the app's dark-theme jade.
    $accent: '#8CC5AA',
  },
  frameworks: ['SwiftUI', 'WatchConnectivity', 'UserNotifications'],
});
