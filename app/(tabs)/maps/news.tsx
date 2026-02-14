import React, {useState, useEffect, useMemo} from 'react'
import {View, StyleSheet, ActivityIndicator, Text} from 'react-native'
import MapView, {Marker, type Region} from 'react-native-maps'
import * as Location from 'expo-location'
import {useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {useOboMessages} from '../../../hooks/useOboMessages'
import {useOboSources} from '../../../hooks/useOboSources'
import {useOboCategories} from '../../../hooks/useOboCategories'
import {estimateZoom, getBoundsFromRegion, type MapBounds} from '../../../lib/mapBounds'
import {getCategoryColor, getCategoryIcon} from '../../../lib/categories'
import {TopicFilter} from '../../../components/TopicFilter'
import type {NewsTopicType} from '../../../types/news'
import {uiTokens} from '../../../styles/common'

export default function NewsMap() {
  const {t} = useTranslation()
  const router = useRouter()
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<NewsTopicType>('all')
  const selectedCategories = useMemo(
    () => (selectedTopic !== 'all' ? [selectedTopic] : undefined),
    [selectedTopic]
  )
  const {sourcesMap} = useOboSources()
  const {filterChips} = useOboCategories()
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)
  const {news, loading} = useOboMessages({
    categories: selectedCategories,
    bounds: mapBounds,
    zoom: mapZoom,
    enabled: true,
    sourcesMap,
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

  // Filter news items that have location data
  const newsWithLocation = news.filter((item) => item.location)

  if (loading && newsWithLocation.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={uiTokens.colors.primary} />
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
          setMapBounds(getBoundsFromRegion(nextRegion))
          setMapZoom(estimateZoom(nextRegion))
        }}
      >
        {/* News markers with category colors */}
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

      {/* Category filter overlay */}
      <View style={styles.filterOverlay}>
        <TopicFilter
          selectedTopic={selectedTopic}
          onTopicChange={setSelectedTopic}
          topics={filterChips}
        />
      </View>

      <Text style={styles.poweredByText}>{t('common.poweredByOboApp')}</Text>
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
    backgroundColor: uiTokens.colors.surface,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: uiTokens.colors.textMuted,
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
    borderColor: uiTokens.colors.surface,
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
  poweredByText: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    fontSize: 10,
    color: uiTokens.colors.textMuted,
    opacity: 0.7,
  },
})
