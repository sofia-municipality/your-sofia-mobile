import React, {useState, useEffect, useMemo, useRef} from 'react'
import {View, StyleSheet, ActivityIndicator, Text} from 'react-native'
import MapView, {Marker, type Region} from '@/lib/Map'
import * as Location from 'expo-location'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {useUpdates} from '../../../hooks/useUpdates'
import {useUpdateCategories} from '../../../hooks/useUpdateCategories'
import {estimateZoom, getBoundsFromRegion, type MapBounds} from '../../../lib/mapBounds'
import {getCategoryColor, getCategoryIcon} from '../../../lib/categories'
import {TopicFilter} from '../../../components/TopicFilter'
import {colors, fontSizes} from '@/styles/tokens'

export default function NewsMap() {
  const {t} = useTranslation()
  const router = useRouter()
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(['all']))
  const selectedCategories = useMemo(
    () => (selectedTopics.has('all') ? undefined : Array.from(selectedTopics)),
    [selectedTopics]
  )
  const {filterChips} = useUpdateCategories()
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timespanEndGte = useMemo(() => {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    return date.toISOString()
  }, [])
  const {news, loading} = useUpdates({
    categories: selectedCategories,
    bounds: mapBounds,
    zoom: mapZoom,
    timespanEndGte,
    enabled: true,
  })

  useEffect(() => {
    ;(async () => {
      try {
        const {status} = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          console.warn('Location permission not granted')
          return
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        setLocation(currentLocation)
      } catch (error) {
        console.error('Error getting location:', error)
      }
    })()
  }, [])

  const region = useMemo(
    () => ({
      latitude: location?.coords.latitude || 42.6977,
      longitude: location?.coords.longitude || 23.3219,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }),
    [location?.coords.latitude, location?.coords.longitude]
  )

  useEffect(() => {
    setMapBounds(getBoundsFromRegion(region))
    setMapZoom(estimateZoom(region))
  }, [region])

  useEffect(() => {
    return () => {
      if (regionDebounceRef.current) {
        clearTimeout(regionDebounceRef.current)
      }
    }
  }, [])

  const newsWithLocation = news.filter((item) => item.location)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('map.loading')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        onRegionChangeComplete={(nextRegion: Region) => {
          if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current)
          regionDebounceRef.current = setTimeout(() => {
            setMapBounds(getBoundsFromRegion(nextRegion))
            setMapZoom(estimateZoom(nextRegion))
          }, 400)
        }}
      >
        {newsWithLocation.map((item) => {
          const category = item.categories?.[0] ?? item.topic
          const color = getCategoryColor(category)
          const Icon = getCategoryIcon(category)

          return (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.location!.latitude,
                longitude: item.location!.longitude,
              }}
              onPress={() => router.push(`/(tabs)/home/${item.id}`)}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.markerIcon, {backgroundColor: color}]}>
                  <Icon size={14} color={colors.surface} />
                </View>
                <View style={[styles.markerPointer, {borderTopColor: color}]} />
              </View>
            </Marker>
          )
        })}
      </MapView>

      <View style={styles.filterOverlay}>
        <TopicFilter
          selectedTopics={selectedTopics}
          onTopicsChange={setSelectedTopics}
          topics={filterChips}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 12,
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  filterOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  markerPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    marginTop: -2,
  },
})
