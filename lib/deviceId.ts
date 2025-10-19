import * as SecureStore from 'expo-secure-store'
import * as Application from 'expo-application'
import * as Crypto from 'expo-crypto'
import {Platform} from 'react-native'

const DEVICE_ID_KEY = 'unique_reporter_id'

/**
 * Generates a unique device ID using platform-specific methods
 * Falls back to a standard UUID if platform methods are unavailable
 */
async function generateUniqueId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      // Try to get Android ID
      return Application.getAndroidId()
    } else if (Platform.OS === 'ios') {
      // Try to get iOS ID for vendor
      const iosId = await Application.getIosIdForVendorAsync()
      if (iosId) {
        return `${iosId}`
      }
    }

    // Fallback: Generate a standard UUID using expo-crypto
    const uuid = Crypto.randomUUID()
    return `${uuid}`
  } catch (error) {
    console.error('Error generating unique ID:', error)
    const uuid = Crypto.randomUUID()
    return `${uuid}`
  }
}

/**
 * Gets the unique reporter ID from secure storage
 * Creates and stores a new one if it doesn't exist
 */
export async function getUniqueReporterId(): Promise<string> {
  try {
    // Try to retrieve existing ID
    const existingId = await SecureStore.getItemAsync(DEVICE_ID_KEY)

    if (existingId) {
      return existingId
    }

    // Generate new ID if none exists
    const newId = await generateUniqueId()

    // Store the new ID securely
    await SecureStore.setItemAsync(DEVICE_ID_KEY, newId)

    return newId
  } catch (error) {
    console.error('Error getting unique reporter ID:', error)
    // Return a temporary ID if storage fails
    return await generateUniqueId()
  }
}

/**
 * Initializes the unique reporter ID on app start
 * Call this in your app's root component
 */
export async function initializeReporterId(): Promise<string> {
  return await getUniqueReporterId()
}
