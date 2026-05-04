import React, {createContext, useContext, useState, useEffect, useRef} from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import {Platform} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import {useRouter} from 'expo-router'
import {getUniqueReporterId} from '../lib/deviceId'
import {environmentManager} from '../lib/environment'
const PUSH_TOKEN_KEY = 'pushToken'
const UNREAD_COUNT_KEY = 'unreadNotificationCount'
const CLOSED_SIGNALS_KEY = 'closedSignalsCount'
const UPDATED_SIGNAL_IDS_KEY = 'updatedSignalIds'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

interface NotificationsContextValue {
  expoPushToken: string | null
  unreadCount: number
  clearUnreadCount: () => Promise<void>
  closedSignalsCount: number
  clearClosedSignalsCount: () => Promise<void>
  updatedSignalIds: string[]
  removeUpdatedSignalId: (signalId: string) => Promise<void>
  clearUpdatedSignalIds: () => Promise<void>
  registerAndSendToken: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({children}: {children: React.ReactNode}) {
  const router = useRouter()
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [closedSignalsCount, setClosedSignalsCount] = useState(0)
  const [updatedSignalIds, setUpdatedSignalIds] = useState<string[]>([])
  const notificationListener = useRef<Notifications.Subscription | null>(null)
  const responseListener = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    loadStoredPushToken()
    registerAndSendToken()

    loadUnreadCount()
    loadClosedSignalsCount()
    loadUpdatedSignalIds()

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const notifData = notification.request.content.data as Record<string, unknown> | undefined
      if (notifData?.type === 'signal-status-update' || notifData?.type === 'signal-closed') {
        incrementClosedSignalsCount()
        const signalId = notifData.signalId as string | undefined
        if (signalId) addUpdatedSignalId(signalId)
      } else {
        incrementUnreadCount()
      }
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const notifData = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined
      if (notifData?.type === 'signal-status-update' || notifData?.type === 'signal-closed') {
        const signalId = notifData.signalId as string | undefined
        if (signalId) {
          router.push(`/(tabs)/signals/${signalId}` as any)
        } else {
          router.replace('/(tabs)/signals')
        }
      } else if (notifData?.type === 'update') {
        router.replace('/(tabs)/home')
      }
    })

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [])

  const loadUnreadCount = async () => {
    try {
      const count = await AsyncStorage.getItem(UNREAD_COUNT_KEY)
      setUnreadCount(count ? parseInt(count, 10) : 0)
    } catch {}
  }

  const loadStoredPushToken = async () => {
    try {
      const stored = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
      if (stored) {
        setExpoPushToken(stored)
      }
    } catch {}
  }

  const loadClosedSignalsCount = async () => {
    try {
      const count = await AsyncStorage.getItem(CLOSED_SIGNALS_KEY)
      setClosedSignalsCount(count ? parseInt(count, 10) : 0)
    } catch {}
  }

  const loadUpdatedSignalIds = async () => {
    try {
      const stored = await AsyncStorage.getItem(UPDATED_SIGNAL_IDS_KEY)
      setUpdatedSignalIds(stored ? JSON.parse(stored) : [])
    } catch {}
  }

  const incrementUnreadCount = async () => {
    try {
      const stored = await AsyncStorage.getItem(UNREAD_COUNT_KEY)
      const newCount = (stored ? parseInt(stored, 10) : 0) + 1
      setUnreadCount(newCount)
      await AsyncStorage.setItem(UNREAD_COUNT_KEY, newCount.toString())
    } catch {}
  }

  const incrementClosedSignalsCount = async () => {
    try {
      const stored = await AsyncStorage.getItem(CLOSED_SIGNALS_KEY)
      const newCount = (stored ? parseInt(stored, 10) : 0) + 1
      setClosedSignalsCount(newCount)
      await AsyncStorage.setItem(CLOSED_SIGNALS_KEY, newCount.toString())
    } catch {}
  }

  const addUpdatedSignalId = async (signalId: string) => {
    try {
      const stored = await AsyncStorage.getItem(UPDATED_SIGNAL_IDS_KEY)
      const current: string[] = stored ? JSON.parse(stored) : []
      if (!current.includes(signalId)) {
        const updated = [...current, signalId]
        setUpdatedSignalIds(updated)
        await AsyncStorage.setItem(UPDATED_SIGNAL_IDS_KEY, JSON.stringify(updated))
      }
    } catch {}
  }

  const removeUpdatedSignalId = async (signalId: string) => {
    try {
      const stored = await AsyncStorage.getItem(UPDATED_SIGNAL_IDS_KEY)
      const current: string[] = stored ? JSON.parse(stored) : []
      if (!current.includes(signalId)) return
      const updated = current.filter((id) => id !== signalId)
      setUpdatedSignalIds(updated)
      await AsyncStorage.setItem(UPDATED_SIGNAL_IDS_KEY, JSON.stringify(updated))
      const countStored = await AsyncStorage.getItem(CLOSED_SIGNALS_KEY)
      const newCount = Math.max(0, (countStored ? parseInt(countStored, 10) : 0) - 1)
      setClosedSignalsCount(newCount)
      await AsyncStorage.setItem(CLOSED_SIGNALS_KEY, newCount.toString())
    } catch {}
  }

  const clearUnreadCount = async () => {
    try {
      setUnreadCount(0)
      await AsyncStorage.setItem(UNREAD_COUNT_KEY, '0')
    } catch {}
  }

  const clearClosedSignalsCount = async () => {
    try {
      setClosedSignalsCount(0)
      await AsyncStorage.setItem(CLOSED_SIGNALS_KEY, '0')
    } catch {}
  }

  const clearUpdatedSignalIds = async () => {
    try {
      setUpdatedSignalIds([])
      await AsyncStorage.setItem(UPDATED_SIGNAL_IDS_KEY, JSON.stringify([]))
    } catch {}
  }

  const registerAndSendToken = async () => {
    console.log('[Notifications] registerAndSendToken called')
    try {
      const token = await registerForPushNotificationsAsync()
      if (token) {
        console.log('[Notifications] Token obtained:', token)
        setExpoPushToken(token)
        await sendTokenToBackend(token)
      } else {
        console.warn('[Notifications] No token returned from registerForPushNotificationsAsync')
      }
    } catch (error) {
      console.error('[Notifications] Failed to register push notifications:', error)
    }
  }

  const sendTokenToBackend = async (token: string) => {
    try {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
      const reporterUniqueId = await getUniqueReporterId().catch(() => null)
      const response = await fetch(`${environmentManager.getApiUrl()}/api/push-tokens`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          token,
          device: Platform.OS,
          active: true,
          ...(reporterUniqueId ? {reporterUniqueId} : {}),
        }),
      })
      if (!response.ok) {
        console.log('[Notifications] Token registration response:', response.status)
      }
    } catch (error) {
      console.error('[Notifications] Error sending push token to backend:', error)
    }
  }

  return (
    <NotificationsContext.Provider
      value={{
        expoPushToken,
        unreadCount,
        clearUnreadCount,
        closedSignalsCount,
        clearClosedSignalsCount,
        updatedSignalIds,
        removeUpdatedSignalId,
        clearUpdatedSignalIds,
        registerAndSendToken,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn(
      '[Notifications] Not a physical device — push tokens are not supported on simulators'
    )
    return null
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  const {status: existingStatus} = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const {status} = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const projectId = getEasProjectId()

  try {
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({projectId})
      : await Notifications.getExpoPushTokenAsync()

    return tokenResponse.data
  } catch (error) {
    console.error('[Notifications] Error getting Expo push token:', error)
    return null
  }
}

function getEasProjectId(): string | undefined {
  const fromEasConfig = Constants?.easConfig?.projectId
  const fromExpoExtra = Constants?.expoConfig?.extra?.eas?.projectId
  const fromLegacyManifest = (Constants as any)?.manifest?.extra?.eas?.projectId
  const fromManifest2 = (Constants as any)?.manifest2?.extra?.eas?.projectId

  return fromEasConfig ?? fromExpoExtra ?? fromLegacyManifest ?? fromManifest2
}
