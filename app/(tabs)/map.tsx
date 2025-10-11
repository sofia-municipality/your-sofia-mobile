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
} from 'react-native'
import MapView, {Marker, PROVIDER_DEFAULT} from 'react-native-maps'
import * as Location from 'expo-location'
import {useTranslation} from 'react-i18next'
import {useWasteContainers} from '../../hooks/useWasteContainers'
import {WasteContainerCard} from '../../components/WasteContainerCard'
import {WasteContainerMarker} from '../../components/WasteContainerMarker'
import type {WasteContainer} from '../../types/wasteContainer'

type MapFilter = 'all' | 'wasteContainers' | 'news' | 'events'

export default function MapScreen() {
  const {t} = useTranslation()
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<MapFilter>('all')
  const [selectedContainer, setSelectedContainer] = useState<WasteContainer | null>(null)
  const [showContainerCard, setShowContainerCard] = useState(false)
  const [isFirstFocus, setIsFirstFocus] = useState(true)

  // Fetch waste containers
  const {containers, loading: containersLoading, refresh: refreshContainers} = useWasteContainers()

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

  const filters: {key: MapFilter; label: string}[] = [
    {key: 'all', label: t('map.filters.all')},
    {key: 'wasteContainers', label: t('map.filters.wasteContainers')},
    {key: 'news', label: t('map.filters.news')},
    {key: 'events', label: t('map.filters.events')},
  ]

  // Filter containers based on selected filter
  const shouldShowContainers = selectedFilter === 'all' || selectedFilter === 'wasteContainers'
  const visibleContainers = shouldShowContainers ? containers : []

  const handleContainerPress = (container: WasteContainer) => {
    setSelectedContainer(container)
    setShowContainerCard(true)
  }

  const handleCloseCard = () => {
    setShowContainerCard(false)
    setSelectedContainer(null)
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <Text style={styles.loadingText}>{t('map.loading')}</Text>
      </View>
    )
  }

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

  // Default to Sofia center if location is not available
  const region = {
    latitude: location?.coords.latitude || 42.6977,
    longitude: location?.coords.longitude || 23.3219,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, selectedFilter === filter.key && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === filter.key && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
      >
        {/* Current location marker */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title={t('common.yourLocation') || 'Your Location'}
            pinColor="#1E40AF"
          />
        )}

        {/* Waste container markers */}
        {visibleContainers.map((container) => (
          <Marker
            key={container.id}
            coordinate={{
              latitude: container.location.latitude,
              longitude: container.location.longitude,
            }}
            onPress={() => handleContainerPress(container)}
            tracksViewChanges={false}
          >
            <WasteContainerMarker color={getContainerPinColor(container)} />
          </Marker>
        ))}
      </MapView>

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
              <WasteContainerCard container={selectedContainer} onClose={handleCloseCard} />
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  filterChipText: {
    fontSize: 14,
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
