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
  useAuth()
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

  // Fetch server-side data for the current viewport — clusters when zoomed out, markers when zoomed in
  const fetchClusters = useCallback(
    async (region: {
      latitude: number
      longitude: number
      latitudeDelta: number
      longitudeDelta: number
    }) => {
      const z = latDeltaToZoom(region.latitudeDelta)
      setZoom(z)

      const bounds = {
        minLat: region.latitude - region.latitudeDelta / 2,
        maxLat: region.latitude + region.latitudeDelta / 2,
        minLng: region.longitude - region.longitudeDelta / 2,
        maxLng: region.longitude + region.longitudeDelta / 2,
      }

      if (z >= INDIVIDUAL_ZOOM) {
        // Individual marker mode — viewport-bounded server fetch
        setClusters([])
        setContainersLoading(true)
        setContainersError(null)
        try {
          const data = await fetchContainerClusters({zoom: z, ...bounds, districtId: 24})
          if (isMountedRef.current && data.type === 'markers') {
            setContainers(data.docs)
          }
        } catch (err) {
          console.error('[fetchClusters] Error:', err)
          if (isMountedRef.current) {
            setContainersError(t('wasteContainers.loadError'))
          }
        } finally {
          if (isMountedRef.current) setContainersLoading(false)
        }
        return
      }

      setContainers([])
      const statusFilter = selectedStateFilter === 'active' ? 'active' : undefined
      try {
        const data = await fetchContainerClusters({
          zoom: z,
          ...bounds,
          status: statusFilter,
          districtId: 24,
        })
        if (isMountedRef.current && data.type === 'clusters') {
          setClusters(data.docs)
        }
      } catch (err) {
        console.error('[fetchClusters] Error:', err)
      }
    },
    [selectedStateFilter, t]
  )

  // Initial cluster fetch using the default region (before the user pans)
  useEffect(() => {
    const center = mapCenter || {
      latitude: location?.coords.latitude ?? 42.683,
      longitude: location?.coords.longitude ?? 23.315,
    }
    const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
    fetchClusters({...center, latitudeDelta, longitudeDelta})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  useEffect(() => {
    const center = mapCenter || {
      latitude: location?.coords.latitude ?? 42.683,
      longitude: location?.coords.longitude ?? 23.315,
    }
    const {latitudeDelta, longitudeDelta} = regionDeltaRef.current
    fetchClusters({...center, latitudeDelta, longitudeDelta})
    // mapCenter and location are intentionally excluded: map-move fetches are already
    // handled by the debounced onRegionChangeComplete handler. Including them here
    // would fire a duplicate identical request on every pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStateFilter, fetchClusters])

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
      latitude: location?.coords.latitude ?? 42.683,
      longitude: location?.coords.longitude ?? 23.315,
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
      latitude: location?.coords.latitude ?? 42.683,
      longitude: location?.coords.longitude ?? 23.315,
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

  const handleStateFilterChange = useCallback(
    (filter: ContainerFilter) => {
      React.startTransition(() => {
        setSelectedStateFilter(filter)
      })
      setShowStateFilters(false)
      // Auto-zoom to individual marker mode when a specific state filter is selected
      // so the client-side filtering is actually visible on the map
      if (filter !== 'all' && filter !== 'active' && zoom < INDIVIDUAL_ZOOM && mapRef.current) {
        const center = mapCenter || {
          latitude: location?.coords.latitude ?? 42.683,
          longitude: location?.coords.longitude ?? 23.315,
        }
        const targetDelta = 360 / Math.pow(2, INDIVIDUAL_ZOOM)
        mapRef.current.animateToRegion(
          {...center, latitudeDelta: targetDelta, longitudeDelta: targetDelta},
          400
        )
      }
    },
    [zoom, mapCenter, location]
  )

  const handleTypeFilterChange = useCallback(
    (filter: WasteType | 'all') => {
      React.startTransition(() => {
        setSelectedTypeFilter(filter)
      })
      setShowTypeFilters(false)
      // Auto-zoom to individual marker mode when a specific type filter is selected
      if (filter !== 'all' && zoom < INDIVIDUAL_ZOOM && mapRef.current) {
        const center = mapCenter || {
          latitude: location?.coords.latitude ?? 42.683,
          longitude: location?.coords.longitude ?? 23.315,
        }
        const targetDelta = 360 / Math.pow(2, INDIVIDUAL_ZOOM)
        mapRef.current.animateToRegion(
          {...center, latitudeDelta: targetDelta, longitudeDelta: targetDelta},
          400
        )
      }
    },
    [zoom, mapCenter, location]
  )

  const handleContainerPress = (container: WasteContainer) => {
    setSelectedContainer(container)
    setShowContainerCard(true)
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
        // Fallback: re-fetch the current viewport
        const center = mapCenter || {latitude: 42.683, longitude: 23.315}
        fetchClusters({...center, ...regionDeltaRef.current})
      }
    },
    [selectedContainer, mapCenter, fetchClusters]
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
    latitude: location?.coords.latitude || 42.683,
    longitude: location?.coords.longitude || 23.315,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }

  return (
    <View style={styles.container}>
      <View style={styles.availabilityBanner}>
        <Text style={styles.availabilityBannerText}>
          {t('wasteContainers.triaditsaOnlyAvailability')}
        </Text>
      </View>

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
                        {filter.label}
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
                        {filter.label}
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
    borderColor: colors.border,
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
    color: colors.error,
  },
  errorOverlayDismiss: {
    fontSize: fontSizes.caption,
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  availabilityBanner: {
    top: 48,
    zIndex: 20,
    backgroundColor: colors.accentGoldLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.accentGold,
    marginHorizontal: 12,
    paddingHorizontal: 2,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availabilityBannerText: {
    fontSize: fontSizes.bodySm,
    fontFamily: fonts.regular,
    color: colors.warning,
    lineHeight: 18,
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
