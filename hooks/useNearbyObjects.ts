import {useState, useCallback} from 'react'
import * as Location from 'expo-location'
import {useTranslation} from 'react-i18next'
import {loadNearbyContainers} from '../lib/containerUtils'

interface MapObject {
  id: string
  name: string
  type: string
  distance: number
}

interface UseNearbyObjectsProps {
  selectedObject: MapObject | null
  containerLocation?: {latitude: number; longitude: number}
}

export function useNearbyObjects({selectedObject, containerLocation}: UseNearbyObjectsProps) {
  const {t} = useTranslation()
  const [nearbyObjects, setNearbyObjects] = useState<MapObject[]>([])
  const [loadingNearbyObjects, setLoadingNearbyObjects] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(containerLocation || null)

  const loadNearbyObjectsCallback = useCallback(() => {
    // Don't load if a container is currently selected
    if (selectedObject) {
      console.log('[loadNearbyObjects] Skipping load - container already selected')
      return
    }

    ;(async () => {
      try {
        setLoadingNearbyObjects(true)
        const {status} = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          return
        }

        // For testing: use containerLocation if available, otherwise use current location
        let searchLocation
        if (containerLocation) {
          searchLocation = containerLocation
          setCurrentLocation(containerLocation)
          console.log(
            '[loadNearbyObjects] Using prefilled container location for search:',
            containerLocation
          )
        } else {
          const location = await Location.getCurrentPositionAsync({})
          searchLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
          setCurrentLocation(searchLocation)
          console.log('[loadNearbyObjects] Using current GPS location for search:', searchLocation)
        }

        // Load nearby containers using PostGIS endpoint with 200m radius
        const containers = await loadNearbyContainers(
          searchLocation,
          200, // 200 meter radius
          {limit: 3}
        )

        // Transform containers to MapObject format
        const nearbyMapObjects: MapObject[] = containers.map((container) => ({
          id: container.publicNumber,
          name: `${t('newSignal.objectTypes.wasteContainer')} #${container.publicNumber}`,
          type: 'waste-container',
          distance: container.distance,
        }))

        setNearbyObjects(nearbyMapObjects)
      } catch (error) {
        console.error('Error loading nearby objects:', error)
      } finally {
        setLoadingNearbyObjects(false)
      }
    })()
  }, [selectedObject, containerLocation, t])

  return {
    nearbyObjects,
    setNearbyObjects,
    loadingNearbyObjects,
    currentLocation,
    setCurrentLocation,
    loadNearbyObjects: loadNearbyObjectsCallback,
  }
}
