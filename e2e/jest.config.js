/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.e2e.js'],
  testTimeout: 120000,
  maxWorkers: 1,
  // On the Android CI emulator, Detox's own teardown (closing the adb
  // reverse tunnel / websocket server) doesn't always finish cleanly —
  // Jest then sits waiting for the event loop to drain and never exits,
  // even though the tests themselves already passed. Force the exit once
  // the run (and its teardown, successful or not) has finished.
  forceExit: true,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
}
