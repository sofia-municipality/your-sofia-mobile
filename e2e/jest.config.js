/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'ts-jest',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.test.[jt]s?(x)'],
  testTimeout: 120000,
  maxWorkers: 1,
  // Wrap Detox's own globalSetup/globalTeardown to also start/stop the
  // OpenAPI-generated mock server (mock-server/) that authenticated and
  // fixture-dependent E2E tests run against instead of the real API.
  globalSetup: '<rootDir>/e2e/globalSetup.ts',
  globalTeardown: '<rootDir>/e2e/globalTeardown.ts',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
}
