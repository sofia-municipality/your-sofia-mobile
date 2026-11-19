import {Platform} from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as Application from 'expo-application'
import * as Crypto from 'expo-crypto'
import {getUniqueReporterId, initializeReporterId} from '../../lib/deviceId'

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}))
jest.mock('expo-application', () => ({
  getAndroidId: jest.fn(),
  getIosIdForVendorAsync: jest.fn(),
}))
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}))

const getItemAsync = SecureStore.getItemAsync as jest.Mock
const setItemAsync = SecureStore.setItemAsync as jest.Mock
const getAndroidId = Application.getAndroidId as jest.Mock
const getIosIdForVendorAsync = Application.getIosIdForVendorAsync as jest.Mock
const randomUUID = Crypto.randomUUID as jest.Mock

function setPlatform(os: typeof Platform.OS) {
  jest.replaceProperty(Platform, 'OS', os)
}

beforeEach(() => {
  jest.clearAllMocks()
  getItemAsync.mockResolvedValue(null)
  setItemAsync.mockResolvedValue(undefined)
  getAndroidId.mockReturnValue('android-id-1')
  getIosIdForVendorAsync.mockResolvedValue('IOS-VENDOR-ID')
  randomUUID.mockReturnValue('uuid-1')
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('getUniqueReporterId', () => {
  it('returns the stored ID without generating a new one', async () => {
    getItemAsync.mockResolvedValue('stored-id')

    await expect(getUniqueReporterId()).resolves.toBe('stored-id')
    expect(getItemAsync).toHaveBeenCalledWith('unique_reporter_id')
    expect(setItemAsync).not.toHaveBeenCalled()
    expect(randomUUID).not.toHaveBeenCalled()
  })

  it('uses and stores the Android ID on Android', async () => {
    setPlatform('android')

    await expect(getUniqueReporterId()).resolves.toBe('android-id-1')
    expect(setItemAsync).toHaveBeenCalledWith('unique_reporter_id', 'android-id-1')
    expect(getIosIdForVendorAsync).not.toHaveBeenCalled()
  })

  it('uses and stores the vendor ID on iOS', async () => {
    setPlatform('ios')

    await expect(getUniqueReporterId()).resolves.toBe('IOS-VENDOR-ID')
    expect(setItemAsync).toHaveBeenCalledWith('unique_reporter_id', 'IOS-VENDOR-ID')
    expect(getAndroidId).not.toHaveBeenCalled()
  })

  it('falls back to a random UUID when iOS has no vendor ID', async () => {
    setPlatform('ios')
    getIosIdForVendorAsync.mockResolvedValue(null)

    await expect(getUniqueReporterId()).resolves.toBe('uuid-1')
    expect(setItemAsync).toHaveBeenCalledWith('unique_reporter_id', 'uuid-1')
  })

  it('uses a random UUID on other platforms', async () => {
    setPlatform('web')

    await expect(getUniqueReporterId()).resolves.toBe('uuid-1')
    expect(getAndroidId).not.toHaveBeenCalled()
    expect(getIosIdForVendorAsync).not.toHaveBeenCalled()
  })

  it('falls back to a random UUID when the platform ID throws', async () => {
    setPlatform('android')
    getAndroidId.mockImplementation(() => {
      throw new Error('not available')
    })

    await expect(getUniqueReporterId()).resolves.toBe('uuid-1')
    expect(console.error).toHaveBeenCalledWith('Error generating unique ID:', expect.any(Error))
  })

  it('returns a temporary ID when secure storage cannot be read', async () => {
    setPlatform('web')
    getItemAsync.mockRejectedValue(new Error('keychain locked'))

    await expect(getUniqueReporterId()).resolves.toBe('uuid-1')
    expect(setItemAsync).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      'Error getting unique reporter ID:',
      expect.any(Error)
    )
  })

  it('still returns an ID when it cannot be saved', async () => {
    setPlatform('android')
    setItemAsync.mockRejectedValue(new Error('keychain locked'))

    await expect(getUniqueReporterId()).resolves.toBe('android-id-1')
  })

  it('keeps returning the same ID once one is stored', async () => {
    setPlatform('web')
    const store = new Map<string, string>()
    getItemAsync.mockImplementation(async (key: string) => store.get(key) ?? null)
    setItemAsync.mockImplementation(async (key: string, value: string) => {
      store.set(key, value)
    })
    randomUUID.mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2')

    const first = await getUniqueReporterId()
    const second = await getUniqueReporterId()

    expect(first).toBe('uuid-1')
    expect(second).toBe('uuid-1')
    expect(randomUUID).toHaveBeenCalledTimes(1)
  })
})

describe('initializeReporterId', () => {
  it('returns the same ID as getUniqueReporterId', async () => {
    getItemAsync.mockResolvedValue('stored-id')

    await expect(initializeReporterId()).resolves.toBe('stored-id')
  })
})
