import {Platform} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import {act, renderHook} from '@testing-library/react-native'
import {useNotifications} from '../../hooks/useNotifications'
import {
  NotificationsProvider,
  useNotifications as useNotificationsFromContext,
} from '../../contexts/NotificationsContext'
import {getUniqueReporterId} from '../../lib/deviceId'

type Listener = (event: unknown) => void

let mockReceivedListener: Listener = () => {}
let mockResponseListener: Listener = () => {}
const mockRemoveReceived = jest.fn()
const mockRemoveResponse = jest.fn()

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn((listener: Listener) => {
    mockReceivedListener = listener
    return {remove: mockRemoveReceived}
  }),
  addNotificationResponseReceivedListener: jest.fn((listener: Listener) => {
    mockResponseListener = listener
    return {remove: mockRemoveResponse}
  }),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {MAX: 5},
}))

let mockIsDevice = true

jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice
  },
}))

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {easConfig: {projectId: 'eas-project-1'}},
}))

const mockRouter = {push: jest.fn(), replace: jest.fn()}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('../../lib/deviceId', () => ({
  getUniqueReporterId: jest.fn(),
}))

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

// Captured before any mock is cleared: the module configures the handler on import.
const notificationHandler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0]?.[0]

const notifications = Notifications as jest.Mocked<typeof Notifications>
const mockGetReporterId = getUniqueReporterId as jest.Mock
const PUSH_TOKEN = 'ExponentPushToken[abc]'

const received = (data?: Record<string, unknown>) => ({request: {content: {data}}})
const tapped = (data?: Record<string, unknown>) => ({notification: received(data)})

/** Let fire-and-forget AsyncStorage chains settle. */
const flush = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)))

async function renderNotifications() {
  const hook = await renderHook(() => useNotifications(), {wrapper: NotificationsProvider})
  await flush()
  return hook
}

describe('useNotifications', () => {
  let logSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    mockIsDevice = true
    notifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as Notifications.NotificationPermissionsStatus)
    notifications.requestPermissionsAsync.mockResolvedValue({
      status: 'granted',
    } as Notifications.NotificationPermissionsStatus)
    notifications.getExpoPushTokenAsync.mockResolvedValue({
      data: PUSH_TOKEN,
      type: 'expo',
    })
    mockGetReporterId.mockResolvedValue('device-1')
    global.fetch = jest.fn().mockResolvedValue({ok: true, status: 200}) as unknown as typeof fetch
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('is the hook exposed by NotificationsContext', () => {
    expect(useNotifications).toBe(useNotificationsFromContext)
  })

  it('throws when used outside NotificationsProvider', async () => {
    await expect(renderHook(() => useNotifications())).rejects.toThrow(
      'useNotifications must be used within NotificationsProvider'
    )
  })

  it('shows notifications in the foreground with sound and badge', async () => {
    await expect(notificationHandler.handleNotification()).resolves.toEqual({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    })
  })

  it('restores persisted counters and updated signal ids', async () => {
    await AsyncStorage.multiSet([
      ['unreadNotificationCount', '3'],
      ['closedSignalsCount', '2'],
      ['updatedSignalIds', JSON.stringify(['41', '42'])],
    ])

    const {result} = await renderNotifications()

    expect(result.current).toMatchObject({
      unreadCount: 3,
      closedSignalsCount: 2,
      updatedSignalIds: ['41', '42'],
    })
  })

  describe('push token registration', () => {
    it('registers the device token with the backend', async () => {
      const {result} = await renderNotifications()

      expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({projectId: 'eas-project-1'})
      expect(result.current.expoPushToken).toBe(PUSH_TOKEN)
      expect(await AsyncStorage.getItem('pushToken')).toBe(PUSH_TOKEN)
      expect(global.fetch).toHaveBeenCalledWith('https://api.test/api/push-tokens', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          token: PUSH_TOKEN,
          device: Platform.OS,
          active: true,
          reporterUniqueId: 'device-1',
        }),
      })
    })

    it('omits the reporter id when it cannot be determined', async () => {
      mockGetReporterId.mockRejectedValueOnce(new Error('secure store unavailable'))

      await renderNotifications()

      const [, request] = (global.fetch as jest.Mock).mock.calls[0]
      expect(JSON.parse(request.body)).not.toHaveProperty('reporterUniqueId')
    })

    it('asks for permission when it has not been granted yet', async () => {
      notifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'undetermined',
      } as Notifications.NotificationPermissionsStatus)

      const {result} = await renderNotifications()

      expect(notifications.requestPermissionsAsync).toHaveBeenCalled()
      expect(result.current.expoPushToken).toBe(PUSH_TOKEN)
    })

    it('does not register when permission is denied, keeping a stored token', async () => {
      await AsyncStorage.setItem('pushToken', 'ExponentPushToken[stored]')
      notifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
      } as Notifications.NotificationPermissionsStatus)
      notifications.requestPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
      } as Notifications.NotificationPermissionsStatus)

      const {result} = await renderNotifications()

      expect(notifications.getExpoPushTokenAsync).not.toHaveBeenCalled()
      expect(global.fetch).not.toHaveBeenCalled()
      expect(result.current.expoPushToken).toBe('ExponentPushToken[stored]')
    })

    it('does not register on a simulator', async () => {
      mockIsDevice = false

      const {result} = await renderNotifications()

      expect(notifications.getExpoPushTokenAsync).not.toHaveBeenCalled()
      expect(result.current.expoPushToken).toBeNull()
    })

    it('does not register when the token request fails', async () => {
      notifications.getExpoPushTokenAsync.mockRejectedValueOnce(new Error('FCM not configured'))

      const {result} = await renderNotifications()

      expect(global.fetch).not.toHaveBeenCalled()
      expect(result.current.expoPushToken).toBeNull()
    })

    it('keeps the token when the backend cannot be reached', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('offline'))

      const {result} = await renderNotifications()

      expect(result.current.expoPushToken).toBe(PUSH_TOKEN)
      expect(errorSpy).toHaveBeenCalledWith(
        '[Notifications] Error sending push token to backend:',
        expect.any(Error)
      )
    })

    it('can be re-run on demand', async () => {
      const {result} = await renderNotifications()

      await act(() => result.current.registerAndSendToken())

      expect(global.fetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('receiving notifications', () => {
    it('counts general notifications as unread', async () => {
      const {result} = await renderNotifications()

      await act(async () => mockReceivedListener(received({type: 'update'})))
      await flush()

      expect(result.current.unreadCount).toBe(1)
      expect(await AsyncStorage.getItem('unreadNotificationCount')).toBe('1')
    })

    it.each(['signal-status-update', 'signal-closed'])(
      'tracks "%s" notifications per signal',
      async (type) => {
        const {result} = await renderNotifications()

        await act(async () => mockReceivedListener(received({type, signalId: '42'})))
        await flush()

        expect(result.current.closedSignalsCount).toBe(1)
        expect(result.current.updatedSignalIds).toEqual(['42'])
        expect(result.current.unreadCount).toBe(0)
        expect(await AsyncStorage.getItem('updatedSignalIds')).toBe('["42"]')
      }
    )

    it('lists a signal only once', async () => {
      const {result} = await renderNotifications()

      await act(async () => mockReceivedListener(received({type: 'signal-closed', signalId: '42'})))
      await flush()
      await act(async () => mockReceivedListener(received({type: 'signal-closed', signalId: '42'})))
      await flush()

      expect(result.current.updatedSignalIds).toEqual(['42'])
    })

    // BUG: the badge counts every status notification, but viewing a signal only
    // takes one off it, so a signal that moved through two statuses (e.g.
    // in-progress -> resolved) leaves the Signals tab badge stuck at 1.
    it.failing('clears the badge after viewing a signal that received two updates', async () => {
      const {result} = await renderNotifications()
      const update = received({type: 'signal-status-update', signalId: '42'})

      await act(async () => mockReceivedListener(update))
      await flush()
      await act(async () => mockReceivedListener(update))
      await flush()
      await act(() => result.current.removeUpdatedSignalId('42'))

      expect(result.current.updatedSignalIds).toEqual([])
      expect(result.current.closedSignalsCount).toBe(0)
    })

    // BUG: counters are read-modify-written through AsyncStorage without
    // serialization, so two notifications arriving together count as one.
    it.failing('counts notifications that arrive at the same time', async () => {
      const {result} = await renderNotifications()

      await act(async () => {
        mockReceivedListener(received({type: 'update'}))
        mockReceivedListener(received({type: 'update'}))
      })
      await flush()

      expect(result.current.unreadCount).toBe(2)
    })
  })

  describe('opening notifications', () => {
    it('opens the signal from a signal notification', async () => {
      await renderNotifications()

      await act(async () =>
        mockResponseListener(tapped({type: 'signal-status-update', signalId: '42'}))
      )

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/signals/42')
    })

    it('opens the signals list when the signal id is missing', async () => {
      await renderNotifications()

      await act(async () => mockResponseListener(tapped({type: 'signal-closed'})))

      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/signals')
    })

    it('opens home for city updates', async () => {
      await renderNotifications()

      await act(async () => mockResponseListener(tapped({type: 'update'})))

      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/home')
    })

    it('ignores notifications of unknown type', async () => {
      await renderNotifications()

      await act(async () => mockResponseListener(tapped(undefined)))

      expect(mockRouter.push).not.toHaveBeenCalled()
      expect(mockRouter.replace).not.toHaveBeenCalled()
    })
  })

  describe('clearing', () => {
    beforeEach(async () => {
      await AsyncStorage.multiSet([
        ['unreadNotificationCount', '3'],
        ['closedSignalsCount', '2'],
        ['updatedSignalIds', JSON.stringify(['41', '42'])],
      ])
    })

    it('clears the unread count', async () => {
      const {result} = await renderNotifications()

      await act(() => result.current.clearUnreadCount())

      expect(result.current.unreadCount).toBe(0)
      expect(await AsyncStorage.getItem('unreadNotificationCount')).toBe('0')
    })

    it('clears the closed signals count', async () => {
      const {result} = await renderNotifications()

      await act(() => result.current.clearClosedSignalsCount())

      expect(result.current.closedSignalsCount).toBe(0)
      expect(await AsyncStorage.getItem('closedSignalsCount')).toBe('0')
    })

    it('clears all updated signal ids', async () => {
      const {result} = await renderNotifications()

      await act(() => result.current.clearUpdatedSignalIds())

      expect(result.current.updatedSignalIds).toEqual([])
      expect(await AsyncStorage.getItem('updatedSignalIds')).toBe('[]')
    })

    it('removes a viewed signal and decrements the badge', async () => {
      const {result} = await renderNotifications()

      await act(() => result.current.removeUpdatedSignalId('41'))

      expect(result.current.updatedSignalIds).toEqual(['42'])
      expect(result.current.closedSignalsCount).toBe(1)
      expect(await AsyncStorage.getItem('closedSignalsCount')).toBe('1')
    })

    it('ignores signals that have no pending update', async () => {
      const {result} = await renderNotifications()

      await act(() => result.current.removeUpdatedSignalId('99'))

      expect(result.current.updatedSignalIds).toEqual(['41', '42'])
      expect(result.current.closedSignalsCount).toBe(2)
    })

    it('never decrements the badge below zero', async () => {
      await AsyncStorage.setItem('closedSignalsCount', '0')
      const {result} = await renderNotifications()

      await act(() => result.current.removeUpdatedSignalId('41'))

      expect(result.current.closedSignalsCount).toBe(0)
    })
  })

  it('stops listening when unmounted', async () => {
    const {unmount} = await renderNotifications()

    await unmount()

    expect(mockRemoveReceived).toHaveBeenCalled()
    expect(mockRemoveResponse).toHaveBeenCalled()
  })
})
