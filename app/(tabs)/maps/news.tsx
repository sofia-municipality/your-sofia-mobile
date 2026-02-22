import React, {useState, useEffect, useMemo, useRef} from 'react'
import {View, StyleSheet, ActivityIndicator, Text} from 'react-native'
import MapView, {Marker, type Region} from 'react-native-maps'
import * as Location from 'expo-location'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {useUpdates} from '../../../hooks/useUpdates'
import {useUpdateCategories} from '../../../hooks/useUpdateCategories'
import {estimateZoom, getBoundsFromRegion, type MapBounds} from '../../../lib/mapBounds'
import {getCategoryColor, getCategoryIcon} from '../../../lib/categories'
import {TopicFilter} from '../../../components/TopicFilter'
import type {NewsTopicType} from '../../../types/news'

export default function NewsMap() {
  const {t} = useTranslation()
  const router = useRouter()
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<NewsTopicType>('all')
  const selectedCategories = useMemo(
    () => (selectedTopic !== 'all' ? [selectedTopic] : undefined),
    [selectedTopic]
  )
  const {filterChips} = useUpdateCategories()
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {news, loading} = useUpdates({
    categories: selectedCategories,
    bounds: mapBounds,
    zoom: mapZoom,
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

  // Default to Sofia center if location is not available
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

  // Filter news items that have location data
  const newsWithLocation = news.filter((item) => item.location)

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E40AF" />
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
                  <Icon size={14} color="#ffffff" />
                </View>
                <View style={[styles.markerPointer, {borderTopColor: color}]} />
              </View>
            </Marker>
          )
        })}
      </MapView>

      <View style={styles.filterOverlay}>
        <TopicFilter
          selectedTopic={selectedTopic}
          onTopicChange={setSelectedTopic}
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
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
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
    borderColor: '#FFFFFF',
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
    borderTopColor: '#1E40AF',
    marginTop: -2,
  },
})
