type EnvironmentModule = typeof import('../../lib/environment')
type AsyncStorageModule = typeof import('@react-native-async-storage/async-storage').default

const ENV_KEYS = [
  'EXPO_PUBLIC_DEFAULT_ENV',
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_STAGING_API_URL',
  'EXPO_PUBLIC_PRODUCTION_API_URL',
] as const

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
const originalDev = __DEV__

/**
 * The environment module reads env vars and __DEV__ when it is first loaded and keeps a
 * singleton manager, so every test loads a fresh copy with the settings it needs.
 */
function loadEnvironment(
  env: Partial<Record<(typeof ENV_KEYS)[number], string>> = {},
  {dev = true}: {dev?: boolean} = {}
) {
  for (const key of ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key]
    else process.env[key] = env[key]
  }
  ;(globalThis as unknown as {__DEV__: boolean}).__DEV__ = dev

  let mod!: EnvironmentModule
  let storage!: AsyncStorageModule
  jest.isolateModules(() => {
    mod = require('../../lib/environment')
    storage = require('@react-native-async-storage/async-storage')
  })
  return {...mod, storage}
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key]
    else process.env[key] = originalEnv[key]
  }
  ;(globalThis as unknown as {__DEV__: boolean}).__DEV__ = originalDev
})

describe('ENVIRONMENTS', () => {
  it('uses the built-in URLs when no env vars are set', () => {
    const {ENVIRONMENTS} = loadEnvironment()

    expect(ENVIRONMENTS.development.apiUrl).toBe('http://localhost:3000')
    expect(ENVIRONMENTS.staging.apiUrl).toBe('https://staging-your.sofia.bg')
    expect(ENVIRONMENTS.production.apiUrl).toBe('https://your.sofia.bg')
  })

  it('takes API URLs from env vars', () => {
    const {ENVIRONMENTS} = loadEnvironment({
      EXPO_PUBLIC_API_URL: 'http://10.0.2.2:3000',
      EXPO_PUBLIC_STAGING_API_URL: 'https://staging.test',
      EXPO_PUBLIC_PRODUCTION_API_URL: 'https://prod.test',
    })

    expect(ENVIRONMENTS.development.apiUrl).toBe('http://10.0.2.2:3000')
    expect(ENVIRONMENTS.staging.apiUrl).toBe('https://staging.test')
    expect(ENVIRONMENTS.production.apiUrl).toBe('https://prod.test')
  })

  it('names each environment after its key', () => {
    const {ENVIRONMENTS} = loadEnvironment()

    for (const [key, config] of Object.entries(ENVIRONMENTS)) {
      expect(config.name).toBe(key)
    }
  })
})

describe('environmentManager defaults', () => {
  it('starts on development in dev builds', () => {
    const {environmentManager} = loadEnvironment({}, {dev: true})

    expect(environmentManager.getCurrentEnvironment()).toBe('development')
    expect(environmentManager.getApiUrl()).toBe('http://localhost:3000')
  })

  it('starts on production in release builds', () => {
    const {environmentManager} = loadEnvironment({}, {dev: false})

    expect(environmentManager.getCurrentEnvironment()).toBe('production')
    expect(environmentManager.getCurrentConfig().displayName).toBe('Production')
  })

  it('starts on the environment named by EXPO_PUBLIC_DEFAULT_ENV', () => {
    const {environmentManager} = loadEnvironment({EXPO_PUBLIC_DEFAULT_ENV: 'staging'})

    expect(environmentManager.getCurrentEnvironment()).toBe('staging')
  })

  it('ignores an unknown EXPO_PUBLIC_DEFAULT_ENV', () => {
    const {environmentManager} = loadEnvironment({EXPO_PUBLIC_DEFAULT_ENV: 'qa'}, {dev: false})

    expect(environmentManager.getCurrentEnvironment()).toBe('production')
  })

  it('lists all three environments', () => {
    const {environmentManager} = loadEnvironment()

    expect(environmentManager.getAllEnvironments().map((e) => e.name)).toEqual([
      'development',
      'staging',
      'production',
    ])
  })

  it('only allows switching environments in dev builds', () => {
    expect(loadEnvironment({}, {dev: true}).environmentManager.canSwitchEnvironment()).toBe(true)
    expect(loadEnvironment({}, {dev: false}).environmentManager.canSwitchEnvironment()).toBe(false)
  })
})

describe('environmentManager.initialize', () => {
  it('restores the environment saved in storage', async () => {
    const {environmentManager, storage} = loadEnvironment()
    await storage.setItem('api-environment', 'staging')

    await environmentManager.initialize()

    expect(environmentManager.getCurrentEnvironment()).toBe('staging')
    expect(environmentManager.getApiUrl()).toBe('https://staging-your.sofia.bg')
  })

  it('keeps the default when nothing is saved', async () => {
    const {environmentManager} = loadEnvironment()

    await environmentManager.initialize()

    expect(environmentManager.getCurrentEnvironment()).toBe('development')
  })

  it('ignores an unknown saved value', async () => {
    const {environmentManager, storage} = loadEnvironment()
    await storage.setItem('api-environment', 'qa')

    await environmentManager.initialize()

    expect(environmentManager.getCurrentEnvironment()).toBe('development')
  })

  it('prefers EXPO_PUBLIC_DEFAULT_ENV over the saved value without reading storage', async () => {
    const {environmentManager, storage} = loadEnvironment({EXPO_PUBLIC_DEFAULT_ENV: 'production'})
    await storage.setItem('api-environment', 'staging')
    const getItem = jest.spyOn(storage, 'getItem')

    await environmentManager.initialize()

    expect(environmentManager.getCurrentEnvironment()).toBe('production')
    expect(getItem).not.toHaveBeenCalled()
  })

  it('keeps the default and warns when storage fails', async () => {
    const {environmentManager, storage} = loadEnvironment()
    jest.spyOn(storage, 'getItem').mockRejectedValueOnce(new Error('disk full'))

    await environmentManager.initialize()

    expect(environmentManager.getCurrentEnvironment()).toBe('development')
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to load environment from storage:',
      expect.any(Error)
    )
  })

  it('only reads storage once', async () => {
    const {environmentManager, storage} = loadEnvironment()
    const getItem = jest.spyOn(storage, 'getItem')

    await environmentManager.initialize()
    await storage.setItem('api-environment', 'production')
    await environmentManager.initialize()

    expect(getItem).toHaveBeenCalledTimes(1)
    expect(environmentManager.getCurrentEnvironment()).toBe('development')
  })
})

describe('environmentManager.setEnvironment', () => {
  it('switches the API URL and saves the choice', async () => {
    const {environmentManager, storage} = loadEnvironment()

    await environmentManager.setEnvironment('production')

    expect(environmentManager.getApiUrl()).toBe('https://your.sofia.bg')
    expect(await storage.getItem('api-environment')).toBe('production')
  })

  it('survives a restart through storage', async () => {
    const first = loadEnvironment()
    await first.environmentManager.setEnvironment('staging')
    const saved = await first.storage.getItem('api-environment')

    const second = loadEnvironment()
    await second.storage.setItem('api-environment', saved!)
    await second.environmentManager.initialize()

    expect(second.environmentManager.getCurrentEnvironment()).toBe('staging')
  })

  it('rejects an unknown environment and keeps the current one', async () => {
    const {environmentManager, storage} = loadEnvironment()
    const setItem = jest.spyOn(storage, 'setItem')

    await expect(environmentManager.setEnvironment('qa' as never)).rejects.toThrow(
      'Invalid environment: qa'
    )
    expect(environmentManager.getCurrentEnvironment()).toBe('development')
    expect(setItem).not.toHaveBeenCalled()
  })

  it('rethrows when the choice cannot be saved', async () => {
    const {environmentManager, storage} = loadEnvironment()
    jest.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('disk full'))

    await expect(environmentManager.setEnvironment('staging')).rejects.toThrow('disk full')
    expect(console.error).toHaveBeenCalledWith(
      'Failed to save environment to storage:',
      expect.any(Error)
    )
  })
})
