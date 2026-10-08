import {startMockServer} from './mockServerLifecycle'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const detoxGlobalSetup = require('detox/runners/jest/globalSetup')

export default async function globalSetup(globalConfig: unknown): Promise<void> {
  await startMockServer()
  await detoxGlobalSetup(globalConfig)
}
