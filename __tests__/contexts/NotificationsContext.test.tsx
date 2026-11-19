// Behaviour shared with the useNotifications hook (counters, routing, token
// registration) is covered in __tests__/hooks/useNotifications.test.tsx. This
// file covers the remaining provider branches.
import {Platform} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import {act, renderHook} from '@testing-library/react-native'
import {NotificationsProvider, useNotifications} from '../../contexts/NotificationsContext'

type Listener = (event: unknown) => void

let mockReceivedListener: Listener = () => {}

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn((listener: Listener) => {
    mockReceivedListener = listener
    return {remove: jest.fn()}
  }),
  addNotificationResponseReceivedListener: jest.fn(() => ({remove: jest.fn()})),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {MAX: 5},
}))

jest.mock('expo-device', () => ({isDevice: true}))

let mockConstants: Record<string, unknown> = {}

jest.mock('expo-constants', () => ({
  __esModule: true,
  get default() {
    return mockConstants
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({push: jest.fn(), replace: jest.fn()}),
}))

jest.mock('../../lib/deviceId', () => ({
  getUniqueReporterId: jest.fn().mockResolvedValue('device-1'),
}))

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const notifications = Notifications as jest.Mocked<typeof Notifications>
const PUSH_TOKEN = 'ExponentPushToken[abc]'
const originalOS = Platform.OS

const received = (data?: Record<string, unknown>) => ({request: {content: {data}}})
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))

async function renderNotifications() {
  const hook = await renderHook(() => useNotifications(), {wrapper: NotificationsProvider})
  await flush()
  return hook
}

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {configurable: true, get: () => os})
}

describe('NotificationsProvider', () => {
  let logSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    mockConstants = {easConfig: {projectId: 'eas-project-1'}}
    notifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as Notifications.NotificationPermissionsStatus)
    notifications.getExpoPushTokenAsync.mockResolvedValue({data: PUSH_TOKEN, type: 'expo'})
    global.fetch = jest.fn().mockResolvedValue({ok: true, status: 200}) as unknown as typeof fetch
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    setPlatform(originalOS)
    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe('Android notification channel', () => {
    it('creates a high-importance default channel on Android', async () => {
      setPlatform('android')

      await renderNotifications()

      expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
        name: 'default',
        importance: 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      })
      const [, request] = (global.fetch as jest.Mock).mock.calls[0]
      expect(JSON.parse(request.body).device).toBe('android')
    })

    it('does not create a channel on iOS', async () => {
      setPlatform('ios')

      await renderNotifications()

      expect(notifications.setNotificationChannelAsync).not.toHaveBeenCalled()
    })
  })

  describe('EAS project id', () => {
    it.each([
      ['expoConfig.extra', {expoConfig: {extra: {eas: {projectId: 'from-extra'}}}}, 'from-extra'],
      [
        'the legacy manifest',
        {manifest: {extra: {eas: {projectId: 'from-manifest'}}}},
        'from-manifest',
      ],
      ['manifest2', {manifest2: {extra: {eas: {projectId: 'from-manifest2'}}}}, 'from-manifest2'],
    ])('reads the project id from %s', async (_source, constants, projectId) => {
      mockConstants = constants

      await renderNotifications()

      expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({projectId})
    })

    it('prefers easConfig over the other sources', async () => {
      mockConstants = {
        easConfig: {projectId: 'from-eas'},
        expoConfig: {extra: {eas: {projectId: 'from-extra'}}},
      }

      await renderNotifications()

      expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({projectId: 'from-eas'})
    })

    it('requests a token without a project id when none is configured', async () => {
      mockConstants = {}

      const {result} = await renderNotifications()

      expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith()
      expect(result.current.expoPushToken).toBe(PUSH_TOKEN)
    })
  })

  it('keeps the token when the backend rejects it', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ok: false, status: 500})

    const {result} = await renderNotifications()

    expect(result.current.expoPushToken).toBe(PUSH_TOKEN)
    expect(logSpy).toHaveBeenCalledWith('[Notifications] Token registration response:', 500)
  })

  it('counts a signal notification without a signal id but lists nothing', async () => {
    const {result} = await renderNotifications()

    await act(async () => mockReceivedListener(received({type: 'signal-closed'})))
    await flush()

    expect(result.current.closedSignalsCount).toBe(1)
    expect(result.current.updatedSignalIds).toEqual([])
    expect(result.current.unreadCount).toBe(0)
  })

  it('counts a notification without data as unread', async () => {
    const {result} = await renderNotifications()

    await act(async () => mockReceivedListener(received(undefined)))
    await flush()

    expect(result.current.unreadCount).toBe(1)
  })

  it('starts with no updated signals when the stored list is corrupt', async () => {
    await AsyncStorage.setItem('updatedSignalIds', '{not json')

    const {result} = await renderNotifications()

    expect(result.current.updatedSignalIds).toEqual([])
  })

  it('starts with empty counters when storage cannot be read', async () => {
    const getItem = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValue(new Error('disk I/O'))

    try {
      const {result} = await renderNotifications()

      expect(result.current).toMatchObject({
        unreadCount: 0,
        closedSignalsCount: 0,
        updatedSignalIds: [],
      })
    } finally {
      getItem.mockRestore()
    }
  })
})
