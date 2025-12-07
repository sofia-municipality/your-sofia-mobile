import React, {useState, useEffect, useCallback} from 'react'
import {useFocusEffect} from '@react-navigation/native'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native'
import * as Location from 'expo-location'

// Conditional imports for native vs web
let MapView: any
let Marker: any
let PROVIDER_DEFAULT: any
let WebMapView: any
let WebMarker: any

if (Platform.OS === 'web') {
  const WebComponents = require('../../../components/WebMapView')
  WebMapView = WebComponents.WebMapView
  WebMarker = WebComponents.WebMarker
} else {
  const RNMaps = require('react-native-maps')
  MapView = RNMaps.default
  Marker = RNMaps.Marker
  PROVIDER_DEFAULT = RNMaps.PROVIDER_DEFAULT
}
import {useTranslation} from 'react-i18next'
import {useWasteContainers} from '../../../hooks/useWasteContainers'
import {WasteContainerCard} from '../../../components/WasteContainerCard'
import {WasteContainerMarker} from '../../../components/WasteContainerMarker'
import {fetchWasteContainerById} from '../../../lib/payload'
import type {WasteContainer} from '../../../types/wasteContainer'

type ContainerFilter = 'all' | 'full' | 'dirty' | 'broken' | 'active' | 'for-collection'

export default function WasteContainers() {
  const {t} = useTranslation()
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<ContainerFilter>('all')
  const [selectedContainer, setSelectedContainer] = useState<WasteContainer | null>(null)
  const [showContainerCard, setShowContainerCard] = useState(false)
  const [isFirstFocus, setIsFirstFocus] = useState(true)

  // Fetch waste containers
  const {
    containers,
    setContainers,
    loading: containersLoading,
    refresh: refreshContainers,
  } = useWasteContainers()

  // Refresh containers when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus) {
        setIsFirstFocus(false)
        return
      }
      refreshContainers()
    }, [isFirstFocus, refreshContainers])
  )

  useEffect(() => {
    ;(async () => {
      // Skip geolocation on web (requires HTTPS)
      if (Platform.OS === 'web') {
        setLoading(false)
        return
      }

      // Request location permissions
      const {status} = await Location.requestForegroundPermissionsAsync()
      setPermissionStatus(status)

      if (status !== 'granted') {
        setLoading(false)
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
      } finally {
        setLoading(false)
      }
    })()
  }, [t])

  const requestPermission = async () => {
    const {status} = await Location.requestForegroundPermissionsAsync()
    setPermissionStatus(status)
    if (status === 'granted') {
      setLoading(true)
      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        setLocation(currentLocation)
      } catch (error) {
        console.error('Error getting location:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  // Calculate counts for each filter
  const getFilterCount = useCallback(
    (filterKey: ContainerFilter): number => {
      if (filterKey === 'all') return containers.length
      return containers.filter((container) => container.status === filterKey).length
    },
    [containers]
  )

  const filters: {key: ContainerFilter; label: string}[] = [
    {key: 'all', label: t('wasteContainers.filters.all')},
    {key: 'full', label: t('wasteContainers.filters.full')},
    {key: 'dirty', label: t('wasteContainers.filters.dirty')},
    {key: 'broken', label: t('wasteContainers.filters.broken')},
    {key: 'active', label: t('wasteContainers.filters.empty')},
    {key: 'for-collection', label: t('wasteContainers.filters.forCollection')},
  ]

  // Filter containers based on selected filter - use useMemo to avoid recalculating on every render
  const visibleContainers = React.useMemo(() => {
    if (selectedFilter === 'all') return containers
    return containers.filter((container) => container.status === selectedFilter)
  }, [containers, selectedFilter])

  const handleFilterChange = useCallback((filter: ContainerFilter) => {
    // Force immediate state update without batching
    React.startTransition(() => {
      setSelectedFilter(filter)
    })
  }, [])

  const handleContainerPress = (container: WasteContainer) => {
    setSelectedContainer(container)
    setShowContainerCard(true)
  }

  const handleCloseCard = () => {
    setShowContainerCard(false)
    setSelectedContainer(null)
  }

  const handleContainerCleaned = async () => {
    if (!selectedContainer) return

    try {
      // Fetch the updated container from the API
      const updatedContainer = await fetchWasteContainerById(selectedContainer.id)

      // Update the container in the containers array
      setContainers((prevContainers) =>
        prevContainers.map((c) => (c.id === updatedContainer.id ? updatedContainer : c))
      )

      // Update the selected container to reflect the new status in the card
      setSelectedContainer(updatedContainer)
    } catch (error) {
      console.error('Error refreshing container:', error)
      // Fallback to full refresh if single container fetch fails
      refreshContainers()
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>{t('map.loading')}</Text>
      </View>
    )
  }

  // On web, skip permission check and use default Sofia location
  if (Platform.OS !== 'web') {
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

    if (!location) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>{t('map.loading')}</Text>
        </View>
      )
    }
  }

  // Default to Sofia center if location is not available
  const region = {
    latitude: location?.coords.latitude || 42.6977,
    longitude: location?.coords.longitude || 23.3219,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }

  // Render web map or native map based on platform
  const MapComponent = Platform.OS === 'web' ? WebMapView : MapView
  const MarkerComponent = Platform.OS === 'web' ? WebMarker : Marker

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapComponent
        {...(Platform.OS !== 'web' && {provider: PROVIDER_DEFAULT})}
        style={styles.map}
        initialRegion={region}
        {...(Platform.OS !== 'web' && {
          showsUserLocation: true,
          showsMyLocationButton: true,
          showsCompass: true,
        })}
      >
        {/* Current location marker */}
        {location && (
          <MarkerComponent
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            {...(Platform.OS !== 'web' && {
              title: t('common.yourLocation') || 'Your Location',
              pinColor: '#1E40AF',
            })}
          >
            {Platform.OS === 'web' && (
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: '#1E40AF',
                  border: '3px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
            )}
          </MarkerComponent>
        )}

        {/* Waste container markers */}
        {visibleContainers.map((container) => (
          <MarkerComponent
            key={container.id}
            coordinate={{
              latitude: container.location.latitude,
              longitude: container.location.longitude,
            }}
            onPress={() => handleContainerPress(container)}
            {...(Platform.OS !== 'web' && {tracksViewChanges: false})}
          >
            <WasteContainerMarker color={getContainerPinColor(container)} />
          </MarkerComponent>
        ))}
      </MapComponent>

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
                onContainerCleaned={handleContainerCleaned}
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
  const colorMap: Record<string, string> = {
    active: '#10B981', // Green
    full: '#EF4444', // Red
    maintenance: '#F59E0B', // Orange
    inactive: '#6B7280', // Gray
  }
  return colorMap[container.status] || '#10B981'
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
    left: 260,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
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
})
