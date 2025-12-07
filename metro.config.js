const {getDefaultConfig} = require('expo/metro-config')
const path = require('path')

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname)

// Add resolver to use mock for react-native-maps on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    // Return mock module for web
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'components/react-native-maps-mock.tsx'),
    }
  }
  // Use default resolver for everything else
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
