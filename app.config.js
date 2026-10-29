// Set NODE_ENV if not already set (required for Android builds)
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

// Development builds load the JS bundle over plain HTTP from the dev machine's LAN IP,
// so allow cleartext traffic to any host there. Other builds only allow the Detox hosts.
const allowAllCleartextTraffic =
  process.env.EAS_BUILD_PROFILE === 'development' || process.env.ALLOW_CLEARTEXT_TRAFFIC === 'true'

module.exports = ({config}) => ({
  ...config,
  plugins: config.plugins.map((plugin) =>
    plugin === 'expo-detox-config-plugin' && allowAllCleartextTraffic
      ? ['expo-detox-config-plugin', {subdomains: '*'}]
      : plugin
  ),
  android: {
    ...config.android,
    blockedPermissions: ['android.permission.ACTIVITY_RECOGNITION'],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
})
