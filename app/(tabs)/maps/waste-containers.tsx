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
import {
  Navigation,
  NavigationOff,
  Plus,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  ScanSearch,
} from 'lucide-react-native'
import {useRouter, useLocalSearchParams} from 'expo-router'
import {WasteContainerCard} from '../../../components/WasteContainerCard'
import {WasteContainerMarker} from '../../../components/WasteContainerMarker'
import {WasteContainerCluster} from '../../../components/WasteContainerCluster'
import {
  fetchWasteContainerById,
  fetchContainerClusters,
  type ContainerCluster,
} from '../../../lib/payload'
import {loadNearbyContainers} from '../../../lib/containerUtils'
import {getDistanceFromLatLonInMeters} from '../../../lib/mapUtils'
import {colors, fonts, fontSizes} from '@/styles/tokens'
import {useAuth} from '../../../contexts/AuthContext'
import {
  type WasteContainer,
  type ContainerState,
  type WasteType,
} from '../../../types/wasteContainer'

/** Derive an approximate integer zoom level from a MapView latitudeDelta. */
function latDeltaToZoom(latitudeDelta: number): number {
  return Math.round(Math.log2(360 / Math.max(latitudeDelta, 0.0001)))
}

/** Zoom level at which we switch from clusters to individual markers (matches server). */
const INDIVIDUAL_ZOOM = 16

type ContainerFilter = 'all' | 'active' | 'uncollected' | ContainerState

export default function WasteContainers({onOpenAR}: {onOpenAR?: () => void}) {
  const {t} = useTranslation()
  const router = useRouter()
  const {isAuthenticated} = useAuth()
  const params = useLocalSearchParams()
  const mapRef = useRef<MapView>(null)
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)
  const [selectedStateFilter, setSelectedStateFilter] = useState<ContainerFilter>('active')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<WasteType | 'all'>('all')
  const [showStateFilters, setShowStateFilters] = useState(false)
  const [showTypeFilters, setShowTypeFilters] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState<WasteContainer | null>(null)
  const [showContainerCard, setShowContainerCard] = useState(false)
  const [containers, setContainers] = useState<WasteContainer[]>([])
  const [clusters, setClusters] = useState<ContainerCluster[]>([])
  const [zoom, setZoom] = useState<number>(latDeltaToZoom(0.01)) // matches default latitudeDelta
  const [containersLoading, setContainersLoading] = useState(false)
  const [containersError, setContainersError] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<{latitude: number; longitude: number} | null>(null)
  const [followMe, setFollowMe] = useState(true)
  const loadingRef = useRef(false)
  const lastLoadLocationRef = useRef<{latitude: number; longitude: number} | null>(null)
  const lastAttemptLocationRef = useRef<{latitude: number; longitude: number} | null>(null)
  const lastAttemptAtRef = useRef<number>(0)
  const isMountedRef = useRef(true)
  const watchRef = useRef<any>(null)
  const regionDeltaRef = useRef<{latitudeDelta: number; longitudeDelta: number}>({
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })
  const clusterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (clusterDebounceRef.current) clearTimeout(clusterDebounceRef.current)
    }
  }, [])

  // Fetch server-side clusters for the current viewport (zoom < INDIVIDUAL_ZOOM)
  const fetchClusters = useCallback(
    async (region: {
      latitude: number
      longitude: number
      latitudeDelta: number
      longitudeDelta: number
    }) => {
      const z = latDeltaToZoom(region.latitudeDelta)
      setZoom(z)

      if (z >= INDIVIDUAL_ZOOM) {
        // Individual marker mode — clusters not needed
        setClusters([])
        return
      }

      try {
        const bounds = {
          minLat: region.latitude - region.latitudeDelta / 2,
          maxLat: region.latitude + region.latitudeDelta / 2,
          minLng: region.longitude - region.longitudeDelta / 2,
          maxLng: region.longitude + region.longitudeDelta / 2,
        }
        const statusFilter = selectedStateFilter === 'active' ? 'active' : undefined
        const data = await fetchContainerClusters({zoom: z, ...bounds, status: statusFilter})
        if (isMountedRef.current && data.type === 'clusters') {
          setClusters(data.docs)
        }
      } catch (err) {
        console.error('[fetchClusters] Error:', err)
      }
    },
    [selectedStateFilter]
  )

  // Load nearby containers based on map center position
  const loadContainers = useCallback(async () => {
    const FAILURE_COOLDOWN_MS = 15000

    // Prevent concurrent loading requests
    if (loadingRef.current) {
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

    // Avoid rapid retries when previous attempts are failing
    if (lastAttemptLocationRef.current) {
      const distanceSinceLastAttempt = getDistanceFromLatLonInMeters(
        lastAttemptLocationRef.current.latitude,
        lastAttemptLocationRef.current.longitude,
        searchLocation.latitude,
        searchLocation.longitude
      )

      const withinCooldown = Date.now() - lastAttemptAtRef.current < FAILURE_COOLDOWN_MS
      if (withinCooldown && distanceSinceLastAttempt < 300) {
        return
      }
    }

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
        return
      }
    }

    try {
      loadingRef.current = true
      lastAttemptAtRef.current = Date.now()
      lastAttemptLocationRef.current = searchLocation
      setContainersLoading(true)
      setContainersError(null)

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
        setContainersError(t('wasteContainers.loadError'))
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

  // Initial cluster fetch using the default region (before the user pans)
  useEffect(() => {
    const center = mapCenter || {
      latitude: location?.coords.latitude ?? 42.6977,
      longitude: location?.coords.longitude ?? 23.3219,
    }
    const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
    fetchClusters({...center, latitudeDelta, longitudeDelta})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  useEffect(() => {
    const center = mapCenter || {
      latitude: location?.coords.latitude ?? 42.6977,
      longitude: location?.coords.longitude ?? 23.3219,
    }
    const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
    fetchClusters({...center, latitudeDelta, longitudeDelta})
  }, [selectedStateFilter, mapCenter, location, fetchClusters])

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

  const zoomIn = () => {
    if (!mapRef.current) return
    const center = mapCenter || {
      latitude: location?.coords.latitude ?? 42.6977,
      longitude: location?.coords.longitude ?? 23.3219,
    }
    const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
    mapRef.current.animateToRegion(
      {
        ...center,
        latitudeDelta: latitudeDelta / 2,
        longitudeDelta: longitudeDelta / 2,
      },
      300
    )
  }

  const zoomOut = () => {
    if (!mapRef.current) return
    const center = mapCenter || {
      latitude: location?.coords.latitude ?? 42.6977,
      longitude: location?.coords.longitude ?? 23.3219,
    }
    const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
    mapRef.current.animateToRegion(
      {
        ...center,
        latitudeDelta: Math.min(latitudeDelta * 2, 90),
        longitudeDelta: Math.min(longitudeDelta * 2, 180),
      },
      300
    )
  }

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

  // Calculate counts for each state filter
  const getStateFilterCount = useCallback(
    (filterKey: ContainerFilter): number => {
      if (filterKey === 'all') {
        // If type filter is active, count only containers of that type
        if (selectedTypeFilter !== 'all') {
          return containers.filter((c) => c.wasteType === selectedTypeFilter).length
        }
        return containers.length
      }
      if (filterKey === 'active') {
        return containers.filter((container) => {
          const matchesStatus = isOperational(container)
          const matchesType =
            selectedTypeFilter === 'all' || container.wasteType === selectedTypeFilter
          return matchesStatus && matchesType
        }).length
      }
      if (filterKey === 'uncollected') {
        if (selectedTypeFilter !== 'all') {
          return containers.filter((c) => c.wasteType === selectedTypeFilter).length
        }
        return containers.length
      }
      return containers.filter((container) => {
        const matchesState = container.state?.includes(filterKey as ContainerState) ?? false
        const matchesType =
          selectedTypeFilter === 'all' || container.wasteType === selectedTypeFilter
        return matchesState && matchesType
      }).length
    },
    [containers, selectedTypeFilter]
  )

  // Calculate counts for each type filter
  const getTypeFilterCount = useCallback(
    (typeKey: WasteType | 'all'): number => {
      if (typeKey === 'all') {
        // If state filter is active, count only operational containers
        if (selectedStateFilter === 'active') {
          return containers.filter((c) => isOperational(c)).length
        }
        if (selectedStateFilter !== 'all' && selectedStateFilter !== 'uncollected') {
          return containers.filter(
            (c) => c.state?.includes(selectedStateFilter as ContainerState) ?? false
          ).length
        }
        return containers.length
      }
      return containers.filter((container) => {
        const matchesType = container.wasteType === typeKey
        const matchesState =
          selectedStateFilter === 'all' ||
          (selectedStateFilter === 'active' && isOperational(container)) ||
          selectedStateFilter === 'uncollected' ||
          (container.state?.includes(selectedStateFilter as ContainerState) ?? false)
        return matchesType && matchesState
      }).length
    },
    [containers, selectedStateFilter]
  )

  const stateFilters: {key: ContainerFilter; label: string}[] = [
    {key: 'all', label: t('wasteContainers.filters.all')},
    {key: 'active', label: t('wasteContainers.statuses.active')},
    {key: 'full', label: t('wasteContainers.filters.full')},
    {key: 'dirty', label: t('wasteContainers.filters.dirty')},
    {key: 'damaged', label: t('wasteContainers.filters.damaged')},
    {key: 'leaves', label: t('wasteContainers.filters.leaves')},
    {key: 'maintenance', label: t('wasteContainers.filters.maintenance')},
    {key: 'bagged', label: t('wasteContainers.filters.bagged')},
    {key: 'fallen', label: t('wasteContainers.filters.fallen')},
    {key: 'bulkyWaste', label: t('wasteContainers.filters.bulkyWaste')},
    {key: 'uncollected', label: t('wasteContainers.filters.uncollected')},
  ]

  const typeFilters: {key: WasteType | 'all'; label: string}[] = [
    {key: 'all', label: t('wasteContainers.filters.all')},
    {key: 'general', label: t('wasteContainers.types.general')},
    {key: 'recyclables', label: t('wasteContainers.types.recyclables')},
    {key: 'organic', label: t('wasteContainers.types.organic')},
    {key: 'glass', label: t('wasteContainers.types.glass')},
    {key: 'paper', label: t('wasteContainers.types.paper')},
    {key: 'plastic', label: t('wasteContainers.types.plastic')},
    {key: 'metal', label: t('wasteContainers.types.metal')},
    {key: 'trashCan', label: t('wasteContainers.types.trashCan')},
  ]

  // 'active' filter means "operational" — hide only inactive/pending containers.
  // Containers that gain states (full, dirty, etc.) via signals remain visible.
  const isOperational = (container: WasteContainer) =>
    container.status !== 'inactive' && container.status !== 'pending'

  // Filter containers based on selected filters - use useMemo to avoid recalculating on every render
  const visibleContainers = React.useMemo(() => {
    return containers.filter((container) => {
      const matchesState =
        selectedStateFilter === 'all' ||
        (selectedStateFilter === 'active' && isOperational(container)) ||
        selectedStateFilter === 'uncollected' ||
        (container.state?.includes(selectedStateFilter as ContainerState) ?? false)
      const matchesType = selectedTypeFilter === 'all' || container.wasteType === selectedTypeFilter
      return matchesState && matchesType
    })
  }, [containers, selectedStateFilter, selectedTypeFilter])

  // Memoize container markers to prevent re-renders during map movement
  const containerMarkers = React.useMemo(() => {
    return visibleContainers.map((container) => ({
      id: container.id,
      coordinate: {
        latitude: container.latitude,
        longitude: container.longitude,
      },
      pinColor: getContainerPinColor(container, selectedStateFilter === 'uncollected'),
      container,
    }))
  }, [visibleContainers, selectedStateFilter])

  const handleStateFilterChange = useCallback((filter: ContainerFilter) => {
    // Force immediate state update without batching
    React.startTransition(() => {
      setSelectedStateFilter(filter)
    })
  }, [])

  const handleTypeFilterChange = useCallback((filter: WasteType | 'all') => {
    // Force immediate state update without batching
    React.startTransition(() => {
      setSelectedTypeFilter(filter)
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
          // Debounce cluster fetch on every viewport change
          if (clusterDebounceRef.current) clearTimeout(clusterDebounceRef.current)
          clusterDebounceRef.current = setTimeout(() => fetchClusters(region), 300)
        }}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
      >
        {/* Cluster markers — shown when zoomed out (zoom < INDIVIDUAL_ZOOM) */}
        {zoom < INDIVIDUAL_ZOOM &&
          clusters.map((cluster, i) => (
            <Marker
              key={`cluster-${i}-${cluster.lat}-${cluster.lng}`}
              coordinate={{latitude: cluster.lat, longitude: cluster.lng}}
              tracksViewChanges={false}
              onPress={() => {
                // Zoom into the cluster on tap
                if (mapRef.current) {
                  const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
                  mapRef.current.animateToRegion(
                    {
                      latitude: cluster.lat,
                      longitude: cluster.lng,
                      latitudeDelta: latitudeDelta / 3,
                      longitudeDelta: longitudeDelta / 3,
                    },
                    300
                  )
                }
              }}
            >
              <WasteContainerCluster
                count={cluster.count}
                dominantStatus={cluster.dominantStatus}
                activeSignalCount={cluster.activeSignalCount}
              />
            </Marker>
          ))}

        {/* Individual markers — shown when zoomed in (zoom >= INDIVIDUAL_ZOOM) */}
        {zoom >= INDIVIDUAL_ZOOM &&
          containerMarkers.map((marker) => (
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

      {/* Expandable filter row - overlay */}
      <View style={styles.filtersRow}>
        {/* State Filter */}
        <View style={{flex: 1}}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.filterHeader}
            onPress={() => {
              setShowStateFilters(!showStateFilters)
              setShowTypeFilters(false)
            }}
          >
            <Text style={styles.filterHeaderText}>{t('wasteContainers.filterByState')}</Text>
            {showStateFilters ? (
              <ChevronUp size={20} color={colors.textPrimary} />
            ) : (
              <ChevronDown size={20} color={colors.textPrimary} />
            )}
          </TouchableOpacity>
          {showStateFilters && (
            <View style={styles.filterColumn}>
              <ScrollView contentContainerStyle={styles.filterOptionsContent}>
                {stateFilters.map((filter) => {
                  const count = getStateFilterCount(filter.key)
                  const isActive = selectedStateFilter === filter.key
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => handleStateFilterChange(filter.key)}
                    >
                      <Text
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                      >
                        {filter.label} ({count})
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Type Filter */}
        <View style={{flex: 1}}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.filterHeader}
            onPress={() => {
              setShowTypeFilters(!showTypeFilters)
              setShowStateFilters(false)
            }}
          >
            <Text style={styles.filterHeaderText}>{t('wasteContainers.filterByType')}</Text>
            {showTypeFilters ? (
              <ChevronUp size={20} color={colors.textPrimary} />
            ) : (
              <ChevronDown size={20} color={colors.textPrimary} />
            )}
          </TouchableOpacity>
          {showTypeFilters && (
            <View style={styles.filterColumn}>
              <ScrollView contentContainerStyle={styles.filterOptionsContent}>
                {typeFilters.map((filter) => {
                  const count = getTypeFilterCount(filter.key)
                  const isActive = selectedTypeFilter === filter.key
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => handleTypeFilterChange(filter.key)}
                    >
                      <Text
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                      >
                        {filter.label} ({count})
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        {/* hidden for now - requires backend processes for managing arbitrary signals.
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            if (!isAuthenticated) {
              router.push('/auth/login' as any)
              return
            }
            router.push({
              pathname: '/(tabs)/new/new-signal' as any,
              params: {returnTo: '/(tabs)/maps'},
            })
          }}
        >
          <Plus size={28} />
        </TouchableOpacity> */}
        <TouchableOpacity
          style={[styles.actionButton, followMe && styles.actionButtonActive]}
          onPress={toggleFollowMe}
        >
          {followMe ? (
            <Navigation size={20} color={colors.surface} />
          ) : (
            <NavigationOff size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={zoomIn}>
          <ZoomIn size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={zoomOut}>
          <ZoomOut size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* AR View Button */}
      {onOpenAR && (
        <TouchableOpacity style={styles.arButton} onPress={onOpenAR}>
          <ScanSearch size={22} color={colors.primary} />
        </TouchableOpacity>
      )}

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
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {containersError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorOverlayText}>{containersError}</Text>
          <TouchableOpacity onPress={() => setContainersError(null)}>
            <Text style={styles.errorOverlayDismiss}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// Helper function to get pin color based on container status.
// Pass uncollectedMode=true to colour by time since last collection instead.
function getContainerPinColor(container: WasteContainer, uncollectedMode = false): string {
  if (uncollectedMode && container.publicNumber.startsWith('RTR-')) {
    if (!container.lastCleaned) return 'red'
    // PostgreSQL timestamps use a space separator and short tz offset: "2026-03-11 07:46:30+00"
    // Normalise to valid ISO 8601: space → T, and expand +HH / -HH offsets to +HH:00.
    const normalized = container.lastCleaned.replace(' ', 'T').concat(':00')
    const hoursSince = (Date.now() - new Date(normalized).getTime()) / (1000 * 60 * 60)
    if (hoursSince <= 24) return 'green'
    if (hoursSince <= 36) return 'orange'
    return 'red'
  }
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
    backgroundColor: colors.surface,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  permissionTitle: {
    fontSize: fontSizes.h3,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionMessage: {
    fontSize: fontSizes.body,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: colors.surface,
    fontSize: fontSizes.body,
    fontFamily: fonts.semiBold,
  },
  filtersRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  filterColumn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filterHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterHeaderText: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.semiBold,
    color: colors.textPrimary,
  },
  filterOptionsContent: {
    padding: 8,
    gap: 6,
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
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSizes.caption,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  map: {
    flex: 1,
  },
  callout: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  calloutTitle: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.bold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  calloutText: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorOverlay: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorOverlayText: {
    flex: 1,
    fontSize: fontSizes.label,
    color: '#B91C1C',
  },
  errorOverlayDismiss: {
    fontSize: fontSizes.caption,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    gap: 12,
  },
  actionButton: {
    color: colors.textSecondary,
    backgroundColor: colors.surface2,
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
    backgroundColor: colors.primary,
  },
  arButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    backgroundColor: colors.surface2,
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
})
