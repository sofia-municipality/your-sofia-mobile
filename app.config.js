// Set NODE_ENV if not already set (required for Android builds)
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

module.exports = ({config}) => ({
  ...config,
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
