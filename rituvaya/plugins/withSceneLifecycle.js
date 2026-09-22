const { withAppDelegate } = require('expo/config-plugins');

/**
 * Completes the UIScene life-cycle adoption that `ios.infoPlist.UIApplicationSceneManifest`
 * starts. iOS 26 and later assert at launch when an app built against that SDK has no scene
 * manifest, and Expo ships `ExpoAppSceneDelegate` for it — but the generated AppDelegate is
 * still the classic one, so the scene delegate would `fatalError` on connect:
 *
 *   "ExpoAppSceneDelegate couldn't start React Native because the app delegate isn't an
 *    ExpoAppDelegate that provides a React Native factory."
 *
 * Two edits bring it in line with what `ExpoAppSceneDelegate` requires:
 *   1. declare `ExpoReactNativeFactoryProvider` conformance, so the scene delegate can reach
 *      the factory the app delegate built;
 *   2. drop the window creation and `startReactNative` call, because under the scene life
 *      cycle the scene delegate owns the window and starts React Native into it.
 *
 * Remove this plugin (and the manifest in app.json) if a future Expo release adopts scenes
 * in its own template.
 */
const CLASS_DECL = 'class AppDelegate: ExpoAppDelegate {';
const CLASS_DECL_PATCHED = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';
const START_MARKER = '#if os(iOS) || os(tvOS)';
const END_MARKER = '#endif';

function patchAppDelegate(source) {
  if (source.includes('ExpoReactNativeFactoryProvider')) return source;

  if (!source.includes(CLASS_DECL)) {
    throw new Error(`withSceneLifecycle: could not find "${CLASS_DECL}" in AppDelegate.swift. The Expo template changed; update this plugin.`);
  }
  let out = source.replace(CLASS_DECL, CLASS_DECL_PATCHED);

  // The window block sits inside didFinishLaunchingWithOptions and is the only
  // #if os(iOS) || os(tvOS) region in the template.
  const start = out.indexOf(START_MARKER);
  if (start === -1) {
    throw new Error('withSceneLifecycle: could not find the window-creation block in AppDelegate.swift. The Expo template changed; update this plugin.');
  }
  const end = out.indexOf(END_MARKER, start);
  if (end === -1) {
    throw new Error('withSceneLifecycle: window-creation block has no #endif. The Expo template changed; update this plugin.');
  }
  if (!out.slice(start, end).includes('startReactNative')) {
    throw new Error('withSceneLifecycle: the #if block is not the window-creation block. The Expo template changed; update this plugin.');
  }

  const replacement = '    // The window is created and React Native started by ExpoAppSceneDelegate\n    // under the scene life cycle; see plugins/withSceneLifecycle.js.\n';
  out = out.slice(0, start) + replacement + out.slice(end + END_MARKER.length + 1);
  return out;
}

module.exports = function withSceneLifecycle(config) {
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error(`withSceneLifecycle: expected a Swift AppDelegate, got ${mod.modResults.language}.`);
    }
    mod.modResults.contents = patchAppDelegate(mod.modResults.contents);
    return mod;
  });
};

module.exports.patchAppDelegate = patchAppDelegate;
