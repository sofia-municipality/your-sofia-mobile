import {act, renderHook, waitFor} from '@testing-library/react-native'
import {EnvironmentProvider, useEnvironment} from '../../contexts/EnvironmentContext'
import type {Environment, EnvironmentConfig} from '../../lib/environment'

const CONFIGS: Record<Environment, EnvironmentConfig> = {
  development: {name: 'development', apiUrl: 'http://localhost:3000', displayName: 'Development'},
  staging: {name: 'staging', apiUrl: 'https://staging.test', displayName: 'Staging'},
  production: {name: 'production', apiUrl: 'https://prod.test', displayName: 'Production'},
}

let mockCurrent: Environment = 'development'
let mockStored: Environment | null = null
let mockCanSwitch = true
let mockResolveInit: () => void = () => {}

jest.mock('@/lib/environment', () => ({
  environmentManager: {
    getCurrentEnvironment: jest.fn(() => mockCurrent),
    getCurrentConfig: jest.fn(() => CONFIGS[mockCurrent]),
    initialize: jest.fn(
      () =>
        new Promise<void>((resolve) => {
          mockResolveInit = () => {
            if (mockStored) mockCurrent = mockStored
            resolve()
          }
        })
    ),
    setEnvironment: jest.fn(async (env: Environment) => {
      mockCurrent = env
    }),
    canSwitchEnvironment: jest.fn(() => mockCanSwitch),
    getAllEnvironments: jest.fn(() => Object.values(CONFIGS)),
  },
}))

const {environmentManager} = jest.requireMock('@/lib/environment')

async function renderEnvironment() {
  return renderHook(() => useEnvironment(), {wrapper: EnvironmentProvider})
}

describe('EnvironmentContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCurrent = 'development'
    mockStored = null
    mockCanSwitch = true
  })

  it('throws when used outside EnvironmentProvider', async () => {
    await expect(renderHook(() => useEnvironment())).rejects.toThrow(
      'useEnvironment must be used within an EnvironmentProvider'
    )
  })

  it('starts with the default environment', async () => {
    const {result} = await renderEnvironment()

    expect(result.current.environment).toBe('development')
    expect(result.current.config).toEqual(CONFIGS.development)
  })

  it('switches to the stored environment once it has been loaded', async () => {
    mockStored = 'staging'
    const {result} = await renderEnvironment()

    await act(async () => mockResolveInit())

    expect(environmentManager.initialize).toHaveBeenCalledTimes(1)
    expect(result.current.environment).toBe('staging')
    expect(result.current.config).toEqual(CONFIGS.staging)
  })

  it('switches environment and persists the choice', async () => {
    const {result} = await renderEnvironment()
    await act(async () => mockResolveInit())

    await act(() => result.current.setEnvironment('production'))

    expect(environmentManager.setEnvironment).toHaveBeenCalledWith('production')
    expect(result.current.environment).toBe('production')
    expect(result.current.config).toEqual(CONFIGS.production)
  })

  it('keeps the current environment when switching fails', async () => {
    environmentManager.setEnvironment.mockRejectedValueOnce(new Error('disk full'))
    const {result} = await renderEnvironment()

    await expect(act(() => result.current.setEnvironment('production'))).rejects.toThrow(
      'disk full'
    )
    await waitFor(() => expect(result.current.environment).toBe('development'))
  })

  it('lists every environment', async () => {
    const {result} = await renderEnvironment()

    expect(result.current.allEnvironments).toEqual(Object.values(CONFIGS))
  })

  it.each([true, false])('reports whether switching is allowed (%s)', async (canSwitch) => {
    mockCanSwitch = canSwitch

    const {result} = await renderEnvironment()

    expect(result.current.canSwitch).toBe(canSwitch)
  })
})
