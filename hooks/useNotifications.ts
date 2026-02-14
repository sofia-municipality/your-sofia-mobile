import {useEffect, useState, useCallback} from 'react'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {Platform} from 'react-native'

const UNREAD_COUNT_KEY = 'notification-unread-count'

// Configure how notifications should be displayed
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>()

  // Load unread count from storage
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await AsyncStorage.getItem(UNREAD_COUNT_KEY)
        if (count) {
          setUnreadCount(parseInt(count, 10))
        }
      } catch (error) {
        console.error('Error loading unread count:', error)
      }
    }
    loadUnreadCount()
  }, [])

  // Register for push notifications
  useEffect(() => {
    const registerForPushNotifications = async () => {
      try {
        if (Platform.OS === 'web') {
          return
        }

        const {status: existingStatus} = await Notifications.getPermissionsAsync()
        let finalStatus = existingStatus

        if (existingStatus !== 'granted') {
          const {status} = await Notifications.requestPermissionsAsync()
          finalStatus = status
        }

        if (finalStatus !== 'granted') {
          console.warn('Push notification permissions not granted')
          return
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id', // TODO: Replace with actual project ID from app.json
        })
        setExpoPushToken(tokenData.data)

        // TODO: Send token to backend for storage
        // await sendTokenToBackend(tokenData.data)
      } catch (error) {
        console.error('Error registering for push notifications:', error)
      }
    }

    registerForPushNotifications()
  }, [])

  // Listen for incoming notifications
  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        // Increment unread count when notification is received
        setUnreadCount((prev) => {
          const newCount = prev + 1
          AsyncStorage.setItem(UNREAD_COUNT_KEY, newCount.toString())
          return newCount
        })
      }
    )

    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        // Handle notification tap
        console.log('Notification tapped:', response)
        // TODO: Navigate to relevant screen based on notification data
      }
    )

    return () => {
      Notifications.removeNotificationSubscription(notificationListener)
      Notifications.removeNotificationSubscription(responseListener)
    }
  }, [])

  const clearUnreadCount = useCallback(async () => {
    setUnreadCount(0)
    try {
      await AsyncStorage.setItem(UNREAD_COUNT_KEY, '0')
    } catch (error) {
      console.error('Error clearing unread count:', error)
    }
  }, [])

  const incrementUnreadCount = useCallback(async () => {
    setUnreadCount((prev) => {
      const newCount = prev + 1
      AsyncStorage.setItem(UNREAD_COUNT_KEY, newCount.toString())
      return newCount
    })
  }, [])

  return {
    unreadCount,
    clearUnreadCount,
    incrementUnreadCount,
    expoPushToken,
  }
}
