/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.release': {
      // Release (not Debug) so the JS bundle is embedded at build time —
      // a Debug build launches into expo-dev-client's dev-server picker
      // screen instead of the app, which stalls device.reloadReactNative().
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/YourSofia.app',
      build:
        "xcodebuild -workspace ios/YourSofia.xcworkspace -scheme YourSofia -configuration Release -sdk iphonesimulator -derivedDataPath ios/build -destination 'generic/platform=iOS Simulator'",
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      testBinaryPath: 'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        // 'iPhone 16' isn't installed on every machine — check `xcrun simctl
        // list devices available` and match whatever's actually there.
        type: 'iPhone 16e',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        // Must match an AVD you've already created (Android Studio > Device Manager,
        // or `avdmanager create avd -n Pixel_7_API_34 ...`). Rename to match your setup.
        avdName: 'Pixel_7_API_34',
      },
    },
  },
  configurations: {
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emulator.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
}
