import AsyncStorage from '@react-native-async-storage/async-storage'
import {PUSH_TOKEN_KEY} from './storageKeys'

export const isE2EMockMode = process.env.EXPO_PUBLIC_E2E_MOCK === 'true'

/**
 * Detox always runs on a simulator/emulator, where Device.isDevice is false
 * and push notifications can never register a real token (see
 * registerForPushNotificationsAsync in contexts/NotificationsContext.tsx) —
 * so notifications/index.tsx's Save button, which is disabled without a
 * pushTokenString, would otherwise be permanently unreachable in E2E. Seed a
 * fixed fake token so that screen's flow can be exercised against the E2E
 * mock server (mock-server/). Only takes effect when explicitly enabled at
 * build time — EXPO_PUBLIC_E2E_MOCK is unset in real app builds.
 */
export async function seedE2EMockStateIfEnabled(): Promise<void> {
  if (!isE2EMockMode) return
  try {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, 'ExponentPushToken[e2e-mock-token]')
  } catch {
    // non-fatal — worst case the notifications screen just behaves as if no
    // token is registered, same as it would on a real device without one.
  }
}
