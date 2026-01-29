import React, {useState, useEffect, useCallback, useRef} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native'
import MapView, {Marker, PROVIDER_DEFAULT} from 'react-native-maps'
import * as Location from 'expo-location'
import {useTranslation} from 'react-i18next'
import {Navigation, NavigationOff, Plus} from 'lucide-react-native'
import {useRouter, useLocalSearchParams} from 'expo-router'
import {WasteContainerCard} from '../../../components/WasteContainerCard'
import {WasteContainerMarker} from '../../../components/WasteContainerMarker'
import {fetchWasteContainerById} from '../../../lib/payload'
import {loadNearbyContainers} from '../../../lib/containerUtils'
import {getDistanceFromLatLonInMeters} from '../../../lib/mapUtils'
import {type WasteContainer, type ContainerState} from '../../../types/wasteContainer'

type ContainerFilter = 'all' | ContainerState

export default function WasteContainers() {
  const {t} = useTranslation()
  const router = useRouter()
  const params = useLocalSearchParams()
  const mapRef = useRef<MapView>(null)
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<ContainerFilter>('all')
  const [selectedContainer, setSelectedContainer] = useState<WasteContainer | null>(null)
  const [showContainerCard, setShowContainerCard] = useState(false)
  const [containers, setContainers] = useState<WasteContainer[]>([])
  const [containersLoading, setContainersLoading] = useState(false)
  const [mapCenter, setMapCenter] = useState<{latitude: number; longitude: number} | null>(null)
  const [followMe, setFollowMe] = useState(true)
  const loadingRef = useRef(false)
  const lastLoadLocationRef = useRef<{latitude: number; longitude: number} | null>(null)
  const isMountedRef = useRef(true)
  const watchRef = useRef<any>(null)
  const regionDeltaRef = useRef<{latitudeDelta: number; longitudeDelta: number}>({
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      loadingRef.current = false
      if (watchRef.current) {
        watchRef.current.remove()
        watchRef.current = null
      }
    }
  }, [])

  // Load nearby containers based on map center position
  const loadContainers = useCallback(async () => {
    // Prevent concurrent loading requests
    if (loadingRef.current) {
      console.log('[loadContainers] Already loading, skipping')
      return
    }

    // Don't load if component is unmounted
    if (!isMountedRef.current) {
      return
    }

    const searchLocation =
      mapCenter ||
      (location
        ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        : null)

    if (!searchLocation) return

    // Check if we've moved significantly since last load (>250 meters)
    // This creates a buffer zone so markers don't disappear on small movements
    if (lastLoadLocationRef.current) {
      const distance = getDistanceFromLatLonInMeters(
        lastLoadLocationRef.current.latitude,
        lastLoadLocationRef.current.longitude,
        searchLocation.latitude,
        searchLocation.longitude
      )
      if (distance < 500) {
        console.log('[loadContainers] Moved only', distance, 'meters, skipping reload')
        return
      }
    }

    try {
      loadingRef.current = true
      setContainersLoading(true)
      console.log('[loadContainers] Loading from position:', searchLocation)

      const radiusMeters = 1000

      const nearbyContainers = await loadNearbyContainers(searchLocation, radiusMeters)

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setContainers(nearbyContainers)
        lastLoadLocationRef.current = searchLocation
      }
    } catch (error) {
      console.error('Error loading nearby containers:', error)
      if (isMountedRef.current) {
        Alert.alert(t('common.error'), t('containers.loadError'))
      }
    } finally {
      if (isMountedRef.current) {
        loadingRef.current = false
        setContainersLoading(false)
      } else {
        loadingRef.current = false
      }
    }
  }, [mapCenter, location, t])

  // Load containers when map center changes or location is available
  useEffect(() => {
    if (mapCenter || location) {
      loadContainers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapCenter, location])

  useEffect(() => {
    ;(async () => {
      // Request location permissions
      const {status} = await Location.requestForegroundPermissionsAsync()
      setPermissionStatus(status)

      if (status !== 'granted') {
        return
      }

      // Get current location
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        setLocation(currentLocation)
      } catch (error) {
        console.error('Error getting location:', error)
        Alert.alert(t('common.error'), 'Не можахме да получим текущото ви местоположение.')
      }
    })()
  }, [t])

  // Animate to user location when it becomes available
  useEffect(() => {
    if (location && mapRef.current && followMe) {
      const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta,
          longitudeDelta,
        },
        1000
      )
    }
  }, [location, followMe])

  useEffect(() => {
    let mounted = true

    const startWatching = async () => {
      try {
        if (permissionStatus !== 'granted') {
          const {status} = await Location.requestForegroundPermissionsAsync()
          setPermissionStatus(status)
          if (status !== 'granted') return
        }

        if (watchRef.current) return

        watchRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (pos) => {
            if (!mounted) return
            setLocation(pos)
          }
        )
      } catch (error) {
        console.error('Error starting location watch:', error)
      }
    }

    if (followMe) {
      startWatching()
    } else {
      if (watchRef.current) {
        watchRef.current.remove()
        watchRef.current = null
      }
    }

    return () => {
      mounted = false
      if (watchRef.current) {
        watchRef.current.remove()
        watchRef.current = null
      }
    }
  }, [followMe, permissionStatus])

  const toggleFollowMe = () => {
    const next = !followMe
    setFollowMe(next)
    if (next && location && mapRef.current) {
      const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
      mapRef.current.animateToRegion(
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta,
          longitudeDelta,
        },
        500
      )
    }
  }

  const requestPermission = async () => {
    const {status} = await Location.requestForegroundPermissionsAsync()
    setPermissionStatus(status)
    if (status === 'granted') {
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        setLocation(currentLocation)
      } catch (error) {
        console.error('Error getting location:', error)
      }
    }
  }

  // Calculate counts for each filter
  const getFilterCount = useCallback(
    (filterKey: ContainerFilter): number => {
      if (filterKey === 'all') return containers.length
      return containers.filter((container) => {
        return container.state?.includes(filterKey) ?? false
      }).length
    },
    [containers]
  )

  const filters: {key: ContainerFilter; label: string}[] = [
    {key: 'all', label: t('wasteContainers.filters.all')},
    {key: 'full', label: t('wasteContainers.filters.full')},
    {key: 'dirty', label: t('wasteContainers.filters.dirty')},
    {key: 'damaged', label: t('wasteContainers.filters.damaged')},
    {key: 'leaves', label: t('wasteContainers.filters.leaves')},
    {key: 'maintenance', label: t('wasteContainers.filters.maintenance')},
    {key: 'bagged', label: t('wasteContainers.filters.bagged')},
    {key: 'fallen', label: t('wasteContainers.filters.fallen')},
    {key: 'bulkyWaste', label: t('wasteContainers.filters.bulkyWaste')},
  ]

  // Filter containers based on selected filter - use useMemo to avoid recalculating on every render
  const visibleContainers = React.useMemo(() => {
    if (selectedFilter === 'all') return containers
    return containers.filter((container) => container.state?.includes(selectedFilter) ?? false)
  }, [containers, selectedFilter])

  // Memoize container markers to prevent re-renders during map movement
  const containerMarkers = React.useMemo(() => {
    return visibleContainers.map((container) => ({
      id: container.id,
      coordinate: {
        latitude: container.location.latitude,
        longitude: container.location.longitude,
      },
      pinColor: getContainerPinColor(container),
      container,
    }))
  }, [visibleContainers])

  const handleFilterChange = useCallback((filter: ContainerFilter) => {
    // Force immediate state update without batching
    React.startTransition(() => {
      setSelectedFilter(filter)
    })
  }, [])

  const handleContainerPress = async (container: WasteContainer) => {
    // Show the card immediately with basic info
    setSelectedContainer(container)
    setShowContainerCard(true)

    // Fetch full details with observations in the background
    try {
      const fullContainer = await fetchWasteContainerById(container.id)
      setSelectedContainer(fullContainer)
    } catch (error) {
      console.error('Error fetching container details:', error)
      // Keep showing basic container info even if detailed fetch fails
    }
  }

  const handleCloseCard = () => {
    setShowContainerCard(false)
  }

  const handleContainerUpdated = useCallback(
    async (containerId?: string) => {
      const idToFetch = containerId || selectedContainer?.id
      if (!idToFetch) return

      try {
        // Fetch the updated container from the API
        const updatedContainer = await fetchWasteContainerById(idToFetch)

        // Update the container in the containers array
        setContainers((prevContainers) =>
          prevContainers.map((c) => (c.id === updatedContainer.id ? updatedContainer : c))
        )

        // Update the selected container to reflect the new status in the card
        setSelectedContainer(updatedContainer)
      } catch (error) {
        console.error('Error refreshing container:', error)
        // Fallback to full refresh if single container fetch fails
        loadContainers()
      }
    },
    [selectedContainer, loadContainers]
  )

  // Handle refreshContainerId param from navigation
  useEffect(() => {
    const refreshContainerId = params.refreshContainerId as string | undefined
    if (refreshContainerId) {
      // Clear the param
      router.setParams({refreshContainerId: undefined})

      // Use handleContainerUpdated to fetch and show the container
      handleContainerUpdated(refreshContainerId)
    }
  }, [params.refreshContainerId, router, handleContainerUpdated])

  if (permissionStatus !== 'granted') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionTitle}>{t('map.permissions.title')}</Text>
        <Text style={styles.permissionMessage}>{t('map.permissions.message')}</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>{t('map.permissions.button')}</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Use user location if available, otherwise default to Sofia center
  const region = {
    latitude: location?.coords.latitude || 42.6977,
    longitude: location?.coords.longitude || 23.3219,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        onRegionChangeComplete={(region) => {
          setMapCenter({
            latitude: region.latitude,
            longitude: region.longitude,
          })
          regionDeltaRef.current = {
            latitudeDelta: region.latitudeDelta,
            longitudeDelta: region.longitudeDelta,
          }
        }}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
      >
        {/* Waste container markers */}
        {containerMarkers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={marker.coordinate}
            onPress={() => handleContainerPress(marker.container)}
            tracksViewChanges={false}
            pinColor={marker.pinColor}
          >
            <WasteContainerMarker
              color={marker.pinColor}
              wasteType={marker.container.wasteType}
              state={marker.container.state}
            />
          </Marker>
        ))}
      </MapView>

      {/* Filter chips - overlay */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {filters.map((filter) => {
            const count = getFilterCount(filter.key)
            const isActive = selectedFilter === filter.key
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => handleFilterChange(filter.key)}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {filter.label} ({count})
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/new/new-signal' as any,
              params: {returnTo: '/(tabs)/maps'},
            })
          }
        >
          <Plus size={28} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, followMe && styles.actionButtonActive]}
          onPress={toggleFollowMe}
        >
          {followMe ? (
            <Navigation size={20} color="#ffffff" />
          ) : (
            <NavigationOff size={20} color="#6B7280" />
          )}
        </TouchableOpacity>
      </View>

      {/* Container Info Modal */}
      <Modal
        visible={showContainerCard}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCard}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={handleCloseCard}>
          <View style={styles.modalContent}>
            {selectedContainer && (
              <WasteContainerCard
                container={selectedContainer}
                onClose={handleCloseCard}
                onContainerUpdated={handleContainerUpdated}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Loading overlay for containers */}
      {containersLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1E40AF" />
        </View>
      )}
    </View>
  )
}

// Helper function to get pin color based on container status
function getContainerPinColor(container: WasteContainer): string {
  if (container.state?.includes('full') || container.status === 'full') {
    return 'red'
  }
  if (container.state?.includes('damaged') || container.state?.includes('bagged')) {
    return 'black'
  }
  if (container.state && container.state.length > 0) {
    return 'orange'
  }
  return 'green'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersScrollContent: {
    padding: 4,
    gap: 4,
  },
  filterChip: {
    alignSelf: 'auto',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  map: {
    flex: 1,
  },
  callout: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  calloutText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 70,
    right: 16,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    gap: 12,
  },
  actionButton: {
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonActive: {
    backgroundColor: '#1E40AF',
  },
})
