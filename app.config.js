// Set NODE_ENV if not already set (required for Android builds)
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

module.exports = ({config}) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
})
