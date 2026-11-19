import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import {
  getCurrentAppVersion,
  markWhatsNewSeen,
  resetWhatsNewForTesting,
  shouldShowWhatsNew,
} from '../../lib/whatsNew'

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {expoConfig: {version: '2.4.0'}},
}))

const mockConstants = Constants as unknown as {expoConfig: {version?: string} | null}
const originalDev = __DEV__

beforeEach(async () => {
  await AsyncStorage.clear()
  jest.restoreAllMocks()
  mockConstants.expoConfig = {version: '2.4.0'}
})

afterEach(() => {
  ;(globalThis as unknown as {__DEV__: boolean}).__DEV__ = originalDev
})

describe('getCurrentAppVersion', () => {
  it('returns the version from the Expo config', () => {
    expect(getCurrentAppVersion()).toBe('2.4.0')
  })

  it('falls back to 0.0.0 when the config has no version', () => {
    mockConstants.expoConfig = {}
    expect(getCurrentAppVersion()).toBe('0.0.0')

    mockConstants.expoConfig = null
    expect(getCurrentAppVersion()).toBe('0.0.0')
  })
})

describe('shouldShowWhatsNew', () => {
  // The source comment says first installs skip the splash, but that check was removed on
  // purpose in 5b663cd, so a fresh install now sees it.
  it('shows the splash on a fresh install', async () => {
    await expect(shouldShowWhatsNew()).resolves.toBe(true)
  })

  it('shows the splash after an update', async () => {
    await AsyncStorage.setItem('last-seen-version', '2.3.1')

    await expect(shouldShowWhatsNew()).resolves.toBe(true)
  })

  it('hides the splash once the current version was seen', async () => {
    await AsyncStorage.setItem('last-seen-version', '2.4.0')

    await expect(shouldShowWhatsNew()).resolves.toBe(false)
  })

  it('hides the splash when storage fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk full'))

    await expect(shouldShowWhatsNew()).resolves.toBe(false)
  })
})

describe('markWhatsNewSeen', () => {
  it('stores the current version so the splash is not shown again', async () => {
    await markWhatsNewSeen()

    expect(await AsyncStorage.getItem('last-seen-version')).toBe('2.4.0')
    await expect(shouldShowWhatsNew()).resolves.toBe(false)
  })

  it('shows the splash again after the next update', async () => {
    await markWhatsNewSeen()
    mockConstants.expoConfig = {version: '2.5.0'}

    await expect(shouldShowWhatsNew()).resolves.toBe(true)
  })

  it('does not throw when storage fails', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'))

    await expect(markWhatsNewSeen()).resolves.toBeUndefined()
  })
})

describe('resetWhatsNewForTesting', () => {
  it('clears the seen version in dev builds', async () => {
    ;(globalThis as unknown as {__DEV__: boolean}).__DEV__ = true
    await markWhatsNewSeen()

    await resetWhatsNewForTesting()

    expect(await AsyncStorage.getItem('last-seen-version')).toBeNull()
    await expect(shouldShowWhatsNew()).resolves.toBe(true)
  })

  it('does nothing in release builds', async () => {
    ;(globalThis as unknown as {__DEV__: boolean}).__DEV__ = false
    await markWhatsNewSeen()

    await resetWhatsNewForTesting()

    expect(await AsyncStorage.getItem('last-seen-version')).toBe('2.4.0')
  })
})
