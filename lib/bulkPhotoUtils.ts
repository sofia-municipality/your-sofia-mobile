/**
 * Utility functions for bulk photo upload processing
 */

import type {Signal, CreateSignalInput} from '../types/signal'
import {type WasteContainer} from '../types/wasteContainer'
import {fetchNearbyWasteContainers, fetchSignals, updateSignal, cleanContainer} from './payload'

export interface PhotoWithMetadata {
  uri: string
  id: string
  timestamp?: Date
  latitude?: number
  longitude?: number
}

export interface PhotoGroup {
  centerLocation: {latitude: number; longitude: number}
  photos: PhotoWithMetadata[]
  timestamp: Date
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Group photos by proximity (photos within proximityMeters are grouped together)
 */
export function groupPhotosByProximity(
  photos: PhotoWithMetadata[],
  proximityMeters: number = 10
): PhotoGroup[] {
  const groups: PhotoGroup[] = []
  const processed = new Set<string>()

  for (const photo of photos) {
    if (processed.has(photo.id) || !photo.latitude || !photo.longitude || !photo.timestamp) {
      continue
    }

    console.log(photo.timestamp)
    // Create a new group with this photo
    const group: PhotoGroup = {
      centerLocation: {
        latitude: photo.latitude,
        longitude: photo.longitude,
      },
      photos: [photo],
      timestamp: photo.timestamp,
    }
    processed.add(photo.id)

    // Find other photos within proximity
    for (const otherPhoto of photos) {
      if (
        processed.has(otherPhoto.id) ||
        !otherPhoto.latitude ||
        !otherPhoto.longitude ||
        !otherPhoto.timestamp
      ) {
        continue
      }

      const distance = calculateDistance(
        photo.latitude,
        photo.longitude,
        otherPhoto.latitude,
        otherPhoto.longitude
      )

      if (distance <= proximityMeters) {
        group.photos.push(otherPhoto)
        processed.add(otherPhoto.id)

        // Update group timestamp to earliest photo
        if (otherPhoto.timestamp < group.timestamp) {
          group.timestamp = otherPhoto.timestamp
        }
      }
    }

    // Calculate center location as average of all photos in group
    const sumLat = group.photos.reduce((sum, p) => sum + (p.latitude || 0), 0)
    const sumLon = group.photos.reduce((sum, p) => sum + (p.longitude || 0), 0)
    group.centerLocation = {
      latitude: sumLat / group.photos.length,
      longitude: sumLon / group.photos.length,
    }

    groups.push(group)
  }

  return groups
}

/**
 * Find the closest city object (waste container) within maxDistanceMeters
 */
export async function findClosestCityObject(
  location: {latitude: number; longitude: number},
  maxDistanceMeters: number = 10
): Promise<WasteContainer | null> {
  try {
    const response = await fetchNearbyWasteContainers(location, maxDistanceMeters, {
      limit: 1,
      status: 'active',
    })

    if (response.docs && response.docs.length > 0) {
      return response.docs[0]
    }

    return null
  } catch (error) {
    console.error('[findClosestCityObject] Error:', error)
    return null
  }
}

/**
 * Find nearby signals within radius
 */
export async function findNearbySignals(
  location: {latitude: number; longitude: number},
  radiusMeters: number = 10,
  locale: 'bg' | 'en' = 'bg'
): Promise<Signal[]> {
  try {
    const response = await fetchSignals({
      locale,
      limit: 100,
    })

    // Filter signals by distance (API doesn't support geo queries yet)
    const nearbySignals = response.docs.filter((signal) => {
      if (!signal.location?.latitude || !signal.location?.longitude) {
        return false
      }

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        signal.location.latitude,
        signal.location.longitude
      )

      return distance <= radiusMeters
    })

    return nearbySignals
  } catch (error) {
    console.error('[findNearbySignals] Error:', error)
    return []
  }
}

/**
 * Upload photos and return their media IDs
 */
export async function uploadPhotos(
  photos: PhotoWithMetadata[],
  reporterUniqueId?: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const imageIds: string[] = []

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]

    if (onProgress) {
      onProgress(i + 1, photos.length)
    }

    try {
      const formData = new FormData()
      formData.append('file', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: `photo-${photo.id}.jpg`,
      } as any)

      formData.append(
        '_payload',
        JSON.stringify({
          reporterUniqueId: reporterUniqueId || null,
        })
      )

      const uploadResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/media`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (uploadResponse.ok) {
        const uploadedImage = await uploadResponse.json()
        imageIds.push(uploadedImage.doc.id)
      } else {
        const errorData = await uploadResponse.json().catch(() => ({}))
        console.error('[uploadPhotos] Failed to upload photo:', errorData)
      }
    } catch (error) {
      console.error('[uploadPhotos] Error uploading photo:', error)
    }
  }

  return imageIds
}

/**
 * Create signals from photo groups
 */
export async function createSignalsFromPhotos(
  groups: PhotoGroup[],
  reporterUniqueId?: string,
  locale: 'bg' | 'en' = 'bg',
  onProgress?: (current: number, total: number) => void
): Promise<{created: number; failed: number}> {
  let created = 0
  let failed = 0

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]

    if (onProgress) {
      onProgress(i + 1, groups.length)
    }

    try {
      // Find closest city object within 10m
      const cityObject = await findClosestCityObject(group.centerLocation, 10)

      if (!cityObject) {
        console.log(`[createSignalsFromPhotos] No city object found near group ${i + 1}, skipping`)
        failed++
        continue
      }

      // Upload photos first
      const imageIds = await uploadPhotos(group.photos, reporterUniqueId)

      if (imageIds.length === 0) {
        console.error(`[createSignalsFromPhotos] Failed to upload photos for group ${i + 1}`)
        failed++
        continue
      }

      // Create signal
      const signalData: CreateSignalInput = {
        title: `Сигнал от масово качване на снимки`,
        description: 'Създаден от масово качване на снимки',
        category: 'waste-container',
        cityObject: {
          type: 'waste-container',
          referenceId: cityObject.publicNumber,
          name: `Контейнер ${cityObject.publicNumber}`,
        },
        containerState: ['full'],
        location: {
          latitude: group.centerLocation.latitude,
          longitude: group.centerLocation.longitude,
        },
        reporterUniqueId,
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/signals?locale=${locale}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...signalData,
            images: imageIds,
          }),
        }
      )

      if (response.ok) {
        created++
        console.log(`[createSignalsFromPhotos] Created signal for group ${i + 1}`)
      } else {
        failed++
        const errorData = await response.json().catch(() => ({}))
        console.error(`[createSignalsFromPhotos] Failed to create signal:`, errorData)
      }
    } catch (error) {
      failed++
      console.error(`[createSignalsFromPhotos] Error processing group ${i + 1}:`, error)
    }
  }

  return {created, failed}
}

/**
 * Close nearby signals and create waste container observations
 */
export async function closeSignalsWithPhotos(
  groups: PhotoGroup[],
  authToken: string,
  onProgress?: (current: number, total: number) => void
): Promise<{closedSignals: number; cleanedContainers: number; failed: number}> {
  let closedSignals = 0
  let cleanedContainers = 0
  let failed = 0

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]

    if (onProgress) {
      onProgress(i + 1, groups.length)
    }

    try {
      // Find closest waste container
      const container = await findClosestCityObject(group.centerLocation, 10)

      if (!container) {
        console.log(`[closeSignalsWithPhotos] No city object found near group ${i + 1}, skipping`)
        failed++
        continue
      }

      await cleanContainer(
        container.id,
        authToken,
        {
          uri: group.photos[0].uri,
          type: 'image/jpeg',
          name: `photo-${group.photos[0].id}.jpg`,
        },
        `от масово качване на снимки.`
      )

      cleanedContainers++
    } catch (error) {
      failed++
      console.error(`[closeSignalsWithPhotos] Error processing group ${i + 1}:`, error)
    }
  }

  return {closedSignals, cleanedContainers: cleanedContainers, failed}
}

/**
 * Create waste container objects from photos
 */
export async function createObjectsFromPhotos(
  groups: PhotoGroup[],
  authToken: string,
  reporterUniqueId?: string,
  locale: 'bg' | 'en' = 'bg',
  onProgress?: (current: number, total: number) => void
): Promise<{createdObjects: number; closedSignals: number; failed: number}> {
  let createdObjects = 0
  let closedSignals = 0
  let failed = 0

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]

    if (onProgress) {
      onProgress(i + 1, groups.length)
    }

    try {
      // Find nearby signals within 10m
      const nearbySignals = await findNearbySignals(group.centerLocation, 10, locale)
      const activeSignals = nearbySignals.filter(
        (signal) => signal.status !== 'resolved' && signal.status !== 'rejected'
      )

      // Upload photos
      const imageIds = await uploadPhotos(group.photos, reporterUniqueId)

      if (imageIds.length === 0) {
        console.error(`[createObjectsFromPhotos] Failed to upload photos for group ${i + 1}`)
        failed++
        continue
      }

      // Generate unique public number
      const publicNumber = `WC-${Date.now()}-${i}`

      // Create waste container
      const containerData = {
        publicNumber,
        image: imageIds[0], // Use first photo as main container image
        location: {
          latitude: group.centerLocation.latitude,
          longitude: group.centerLocation.longitude,
        },
        capacityVolume: 1.1, // Default standard bin size
        capacitySize: 'standard' as const,
        binCount: 1,
        wasteType: 'general' as const,
        status: 'active' as const,
        notes: `Създаден от масово качване на снимки. Общо снимки: ${imageIds.length}`,
      }

      const containerResponse = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'}/api/waste-containers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(containerData),
        }
      )

      if (containerResponse.ok) {
        createdObjects++
        console.log(`[createObjectsFromPhotos] Created waste container for group ${i + 1}`)

        // Mark nearby signals as resolved
        for (const signal of activeSignals) {
          try {
            await updateSignal(
              signal.id,
              {
                status: 'resolved',
              },
              locale
            )
            closedSignals++
          } catch (error) {
            console.error(`[createObjectsFromPhotos] Failed to update signal ${signal.id}:`, error)
          }
        }
      } else {
        failed++
        const errorData = await containerResponse.json().catch(() => ({}))
        console.error(`[createObjectsFromPhotos] Failed to create container:`, errorData)
      }
    } catch (error) {
      failed++
      console.error(`[createObjectsFromPhotos] Error processing group ${i + 1}:`, error)
    }
  }

  return {createdObjects, closedSignals, failed}
}
