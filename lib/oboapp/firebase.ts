import {initializeApp, getApp, getApps} from 'firebase/app'
import {getAuth, initializeAuth} from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
// @ts-ignore - Firebase persistence types
import {getReactNativePersistence} from '@firebase/auth/dist/rn/index.js'

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_OBOAPP_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_OBOAPP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_OBOAPP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_OBOAPP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_OBOAPP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_OBOAPP_FIREBASE_APP_ID,
}

const oboApp = getApps().some((app) => app.name === 'oboapp')
  ? getApp('oboapp')
  : initializeApp(firebaseConfig, 'oboapp')

const oboAuth = (() => {
  try {
    return initializeAuth(oboApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  } catch (error) {
    return getAuth(oboApp)
  }
})()

export {oboApp, oboAuth}
