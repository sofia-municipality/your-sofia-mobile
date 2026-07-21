import React, {useState, useEffect, useMemo, useRef} from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
} from 'lucide-react-native'
import {DrinkingFountainMarker} from '../../../components/DrinkingFountainMarker'
import {DrinkingFountainCard, getFountainColor} from '../../../components/DrinkingFountainCard'
import {fetchDrinkingFountains, type DrinkingFountain} from '../../../lib/payload'
import {colors, fonts, fontSizes} from '@/styles/tokens'

const SOFIA_CENTER = {latitude: 42.6977, longitude: 23.3219}

export default function DrinkingFountains() {
  const {t} = useTranslation()
  const mapRef = useRef<MapView>(null)
  const isMountedRef = useRef(true)
  const watchRef = useRef<Location.LocationSubscription | null>(null)
  const deltaRef = useRef({latitudeDelta: 0.05, longitudeDelta: 0.05})

  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null)
  const [fountains, setFountains] = useState<DrinkingFountain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DrinkingFountain | null>(null)
  const [followMe, setFollowMe] = useState(false)
  const [conditionFilter, setConditionFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showConditionFilters, setShowConditionFilters] = useState(false)
  const [showSourceFilters, setShowSourceFilters] = useState(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      watchRef.current?.remove()
      watchRef.current = null
    }
  }, [])

  // Load all fountains once — the dataset is small and citywide.
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchDrinkingFountains()
        if (isMountedRef.current) setFountains(data)
      } catch (err) {
        console.error('[fetchDrinkingFountains] Error:', err)
        if (isMountedRef.current) setError(t('fountains.loadError'))
      } finally {
        if (isMountedRef.current) setLoading(false)
      }
    })()
  }, [t])

  // Request location permission + initial position.
  useEffect(() => {
    ;(async () => {
      const {status} = await Location.requestForegroundPermissionsAsync()
      setPermissionStatus(status)
      if (status !== 'granted') return
      try {
        const pos = await Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced})
        if (isMountedRef.current) setLocation(pos)
      } catch (err) {
        console.error('Error getting location:', err)
      }
    })()
  }, [])

  // Follow-me location watch.
  useEffect(() => {
    let mounted = true
    const start = async () => {
      if (watchRef.current) return
      watchRef.current = await Location.watchPositionAsync(
        {accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10},
        (pos) => {
          if (!mounted) return
          setLocation(pos)
          if (mapRef.current) {
            mapRef.current.animateToRegion({...pos.coords, ...deltaRef.current}, 500)
          }
        }
      )
    }
    if (followMe && permissionStatus === 'granted') {
      start()
    } else {
      watchRef.current?.remove()
      watchRef.current = null
    }
    return () => {
      mounted = false
      watchRef.current?.remove()
      watchRef.current = null
    }
  }, [followMe, permissionStatus])

  const zoomBy = (factor: number) => {
    if (!mapRef.current) return
    const center = location?.coords ?? SOFIA_CENTER
    const {latitudeDelta, longitudeDelta} = deltaRef.current
    mapRef.current.animateToRegion(
      {
        latitude: center.latitude,
        longitude: center.longitude,
        latitudeDelta: Math.min(latitudeDelta * factor, 90),
        longitudeDelta: Math.min(longitudeDelta * factor, 180),
      },
      300
    )
  }

  // Filter options are derived from the loaded data — condition (fountain status)
  // and water source are admin-managed lookup collections, not fixed enums.
  const conditionOptions = useMemo(() => {
    const names = new Set<string>()
    fountains.forEach((f) => {
      if (f.statusName) names.add(f.statusName)
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [fountains])

  const sourceOptions = useMemo(() => {
    const names = new Set<string>()
    fountains.forEach((f) => {
      if (f.sourceName) names.add(f.sourceName)
    })
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [fountains])

  const visibleFountains = useMemo(
    () =>
      fountains.filter(
        (f) =>
          (conditionFilter === 'all' || f.statusName === conditionFilter) &&
          (sourceFilter === 'all' || f.sourceName === sourceFilter)
      ),
    [fountains, conditionFilter, sourceFilter]
  )

  const region = {
    latitude: location?.coords.latitude ?? SOFIA_CENTER.latitude,
    longitude: location?.coords.longitude ?? SOFIA_CENTER.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={permissionStatus === 'granted'}
        onRegionChangeComplete={(r) => {
          deltaRef.current = {latitudeDelta: r.latitudeDelta, longitudeDelta: r.longitudeDelta}
        }}
      >
        {visibleFountains.map((fountain) => (
          <Marker
            key={`fountain-${fountain.id}`}
            coordinate={{latitude: fountain.latitude, longitude: fountain.longitude}}
            onPress={() => setSelected(fountain)}
            tracksViewChanges={false}
          >
            <DrinkingFountainMarker color={getFountainColor(fountain)} />
          </Marker>
        ))}
      </MapView>

      {/* Expandable filter row - overlay */}
      <View style={styles.filtersRow}>
        {/* Condition Filter */}
        <View style={{flex: 1}}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.filterHeader}
            onPress={() => {
              setShowConditionFilters(!showConditionFilters)
              setShowSourceFilters(false)
            }}
          >
            <Text style={styles.filterHeaderText}>{t('fountains.filterByCondition')}</Text>
            {showConditionFilters ? (
              <ChevronUp size={20} color={colors.textPrimary} />
            ) : (
              <ChevronDown size={20} color={colors.textPrimary} />
            )}
          </TouchableOpacity>
          {showConditionFilters && (
            <View style={styles.filterColumn}>
              <ScrollView contentContainerStyle={styles.filterOptionsContent}>
                {['all', ...conditionOptions].map((option) => {
                  const isActive = conditionFilter === option
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => {
                        setConditionFilter(option)
                        setShowConditionFilters(false)
                      }}
                    >
                      <Text
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                      >
                        {option === 'all' ? t('fountains.filterAll') : option}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Water Source Filter */}
        <View style={{flex: 1}}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.filterHeader}
            onPress={() => {
              setShowSourceFilters(!showSourceFilters)
              setShowConditionFilters(false)
            }}
          >
            <Text style={styles.filterHeaderText}>{t('fountains.filterBySource')}</Text>
            {showSourceFilters ? (
              <ChevronUp size={20} color={colors.textPrimary} />
            ) : (
              <ChevronDown size={20} color={colors.textPrimary} />
            )}
          </TouchableOpacity>
          {showSourceFilters && (
            <View style={styles.filterColumn}>
              <ScrollView contentContainerStyle={styles.filterOptionsContent}>
                {['all', ...sourceOptions].map((option) => {
                  const isActive = sourceFilter === option
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => {
                        setSourceFilter(option)
                        setShowSourceFilters(false)
                      }}
                    >
                      <Text
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                      >
                        {option === 'all' ? t('fountains.filterAll') : option}
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
        <TouchableOpacity
          style={[styles.actionButton, followMe && styles.actionButtonActive]}
          onPress={() => setFollowMe((v) => !v)}
          accessibilityRole="button"
        >
          {followMe ? (
            <Navigation size={20} color={colors.surface} />
          ) : (
            <NavigationOff size={20} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => zoomBy(0.5)}>
          <ZoomIn size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => zoomBy(2)}>
          <ZoomOut size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorOverlayText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorOverlayDismiss}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fountain Info Modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        >
          <View style={styles.modalContent}>
            {selected && (
              <DrinkingFountainCard fountain={selected} onClose={() => setSelected(null)} />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  map: {
    flex: 1,
  },
  filtersRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
    zIndex: 30,
  },
  filterColumn: {
    flex: 1,
    maxHeight: 360,
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
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    gap: 12,
  },
  actionButton: {
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
  loadingOverlay: {
    position: 'absolute',
    top: 60,
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
    top: 60,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'transparent',
    padding: 16,
  },
})
