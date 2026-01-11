/**
 * Utility functions for waste container operations
 */

import type {WasteContainer} from '../types/wasteContainer'

/**
 * Load nearby containers from Payload CMS based on user location
 * Uses PostGIS backend endpoint for efficient geospatial queries
 * @param userLocation User's current location {latitude, longitude}
 * @param radiusMeters Radius in meters to search within (default: 500m)
 * @param options Optional filters for status and waste type
 * @returns Promise with array of nearby containers sorted by distance
 */
export async function loadNearbyContainers(
  userLocation: {latitude: number; longitude: number},
  radiusMeters: number = 500,
  options?: {
    status?: 'active' | 'full' | 'maintenance' | 'inactive'
    wasteType?: string
  }
): Promise<(WasteContainer & {distance: number})[]> {
  // Import dynamically to avoid circular dependency
  const {fetchNearbyWasteContainers} = await import('./payload')

  try {
    // Use PostGIS backend endpoint for efficient spatial query
    const response = await fetchNearbyWasteContainers(userLocation, radiusMeters, options)

    return response.docs
  } catch (error) {
    console.error('Error loading nearby containers:', error)
    throw error
  }
}
