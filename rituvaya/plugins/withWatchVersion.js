const { withXcodeProject } = require('expo/config-plugins');

/**
 * @bacons/apple-targets gives the watch target a fixed MARKETING_VERSION of
 * "1.0", while the phone app's version comes from app.json. App Store Connect
 * checks that a watch app's version matches the iPhone app it ships inside, so
 * copy the phone's version and build number onto every watchOS target.
 *
 * Listed before @bacons/apple-targets in app.json on purpose: mods run in reverse
 * registration order, so this runs after the watch target has been created.
 */
module.exports = function withWatchVersion(config) {
  return withXcodeProject(config, (mod) => {
    const version = config.version;
    const build = config.ios?.buildNumber;
    const configurations = mod.modResults.pbxXCBuildConfigurationSection();
    for (const [key, entry] of Object.entries(configurations)) {
      if (key.endsWith('_comment') || !entry.buildSettings) continue;
      if (!('WATCHOS_DEPLOYMENT_TARGET' in entry.buildSettings)) continue;
      if (version) entry.buildSettings.MARKETING_VERSION = version;
      if (build) entry.buildSettings.CURRENT_PROJECT_VERSION = build;
    }
    return mod;
  });
};
