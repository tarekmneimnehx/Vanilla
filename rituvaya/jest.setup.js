// Keep domain tests deterministic: the "device" zone is pinned per test via
// setDeviceTimeZone, and process TZ is fixed so Date getters are predictable.
process.env.TZ = process.env.TZ || 'UTC';
