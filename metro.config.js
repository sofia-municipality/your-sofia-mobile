// Learn more https://docs.expo.dev/guides/customizing-metro
// Sentry's wrapper keeps the default Expo config and adds source map generation.
const {getSentryExpoConfig} = require('@sentry/react-native/metro')

const config = getSentryExpoConfig(__dirname)

module.exports = config
