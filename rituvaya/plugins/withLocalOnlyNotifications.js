const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Rituvaya schedules local notifications only — it never registers for remote push,
 * so the `aps-environment` entitlement that expo-notifications adds by default is
 * unused. Dropping it also lets a free Apple ID sign development builds: personal
 * teams cannot create a provisioning profile that includes the Push Notifications
 * capability.
 *
 * Listed FIRST in app.json on purpose: config-plugin mods run in reverse order of
 * registration, so the earliest entry is the last to touch the entitlements plist.
 *
 * Remove this plugin if the app ever adds remote push notifications.
 */
module.exports = function withLocalOnlyNotifications(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
