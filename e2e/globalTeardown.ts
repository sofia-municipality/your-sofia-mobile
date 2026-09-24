import {stopMockServer} from './mockServerLifecycle'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const detoxGlobalTeardown = require('detox/runners/jest/globalTeardown')

export default async function globalTeardown(globalConfig: unknown): Promise<void> {
  await detoxGlobalTeardown(globalConfig)
  stopMockServer()
}
