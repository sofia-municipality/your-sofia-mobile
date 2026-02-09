import {useCallback, useEffect, useRef, useState} from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import {Platform} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import {useOboAppAuth} from '@/contexts/OboAppAuthContext'

const OBOAPP_API_URL = process.env.EXPO_PUBLIC_OBOAPP_API_URL
const PUSH_TOKEN_KEY = 'pushToken'
const UNREAD_COUNT_KEY = 'unreadNotificationCount'

let listenersInitialized = false
let notificationListener: Notifications.Subscription | null = null
let responseListener: Notifications.Subscription | null = null

// Configure how notifications are displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const {user: oboUser, loading: oboLoading, getIdToken, isAuthenticated} = useOboAppAuth()
  const registerAbortRef = useRef(false)

  useEffect(() => {
    // Load unread count from storage
    loadUnreadCount()

    // Listen for incoming notifications
    if (!listenersInitialized) {
      notificationListener = Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification)
        incrementUnreadCount()
      })

      // Listen for notification interactions
      responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification tapped:', response)
        // You can handle navigation here
      })

      listenersInitialized = true
    }

    return () => {}
  }, [])

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!OBOAPP_API_URL || !oboUser) {
      setIsSubscribed(false)
      return
    }

    try {
      const idToken = await getIdToken()
      if (!idToken) {
        setIsSubscribed(false)
        return
      }

      const response = await fetch(`${OBOAPP_API_URL}/api/mobile/notifications/subscription`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        setIsSubscribed(false)
        return
      }

      const data = await response.json()
      setIsSubscribed(data.hasSubscription === true)
    } catch (error) {
      console.error('Error checking subscription status:', error)
      setIsSubscribed(false)
    }
  }, [getIdToken, oboUser])

  const sendTokenToBackend = useCallback(
    async (token: string) => {
      if (!OBOAPP_API_URL || !oboUser) {
        return
      }

      try {
        const idToken = await getIdToken()
        if (!idToken) {
          return
        }

        const response = await fetch(`${OBOAPP_API_URL}/api/mobile/notifications/subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            token,
            endpoint: `https://fcm.googleapis.com/fcm/send/${token}`,
            deviceInfo: {
              platform: Platform.OS,
              modelName: Device.modelName,
              osVersion: Device.osVersion,
              appVersion: Constants.expoConfig?.version,
            },
          }),
        })

        if (!response.ok) {
          console.log('Token registration response:', response.status)
          return
        }

        setIsSubscribed(true)
      } catch (error) {
        console.error('Error sending push token to backend:', error)
      }
    },
    [getIdToken, oboUser]
  )

  const subscribeToOboApp = useCallback(async () => {
    if (!oboUser) {
      return
    }

    if (!OBOAPP_API_URL) {
      console.warn('Missing EXPO_PUBLIC_OBOAPP_API_URL')
      return
    }

    setIsRegistering(true)
    registerAbortRef.current = false

    try {
      const token = await registerForPushNotificationsAsync()
      if (!token || registerAbortRef.current) {
        return
      }

      setExpoPushToken(token)
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
      await sendTokenToBackend(token)
    } finally {
      setIsRegistering(false)
    }
  }, [oboUser, sendTokenToBackend])

  const unsubscribeFromOboApp = useCallback(async () => {
    if (!oboUser || !OBOAPP_API_URL) {
      return
    }

    try {
      const idToken = await getIdToken()
      if (!idToken) {
        return
      }

      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
      if (!token) {
        return
      }

      const response = await fetch(
        `${OBOAPP_API_URL}/api/mobile/notifications/subscription?token=${encodeURIComponent(
          token
        )}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        }
      )

      if (response.ok) {
        setIsSubscribed(false)
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY)
      }
    } catch (error) {
      console.error('Error removing push token:', error)
    }
  }, [getIdToken, oboUser])

  useEffect(() => {
    if (oboLoading || !oboUser) {
      setIsSubscribed(false)
      return
    }

    fetchSubscriptionStatus()
  }, [fetchSubscriptionStatus, oboLoading, oboUser])

  useEffect(() => {
    if (!isAuthenticated || oboLoading) {
      return
    }

    subscribeToOboApp()

    return () => {
      registerAbortRef.current = true
    }
  }, [isAuthenticated, oboLoading, subscribeToOboApp])

  const loadUnreadCount = async () => {
    try {
      const count = await AsyncStorage.getItem(UNREAD_COUNT_KEY)
      setUnreadCount(count ? parseInt(count, 10) : 0)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const incrementUnreadCount = async () => {
    try {
      const newCount = unreadCount + 1
      setUnreadCount(newCount)
      await AsyncStorage.setItem(UNREAD_COUNT_KEY, newCount.toString())
    } catch (error) {
      console.error('Error incrementing unread count:', error)
    }
  }

  const clearUnreadCount = async () => {
    try {
      setUnreadCount(0)
      await AsyncStorage.setItem(UNREAD_COUNT_KEY, '0')
    } catch (error) {
      console.error('Error clearing unread count:', error)
    }
  }

  return {
    expoPushToken,
    unreadCount,
    clearUnreadCount,
    isSubscribed,
    isRegistering,
    subscribeToOboApp,
    unsubscribeFromOboApp,
    refreshSubscriptionStatus: fetchSubscriptionStatus,
  }
}

async function registerForPushNotificationsAsync() {
  let token

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  if (Device.isDevice) {
    const {status: existingStatus} = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const {status} = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!')
      return null
    }

    const deviceToken = await Notifications.getDevicePushTokenAsync()

    if (deviceToken.type !== 'fcm') {
      console.log(`Unsupported push token type: ${deviceToken.type}`)
      return null
    }

    token = deviceToken.data
  } else {
    console.log('Must use physical device for Push Notifications')
  }

  return token
}
