import React, {useMemo, useRef, useState, useEffect} from 'react'
import {View, StyleSheet, ActivityIndicator, Text} from 'react-native'
import MapView, {Marker, type Region} from 'react-native-maps'
import * as Location from 'expo-location'
import {useTranslation} from 'react-i18next'
import {useUpdates} from '../../../hooks/useUpdates'
import {ImplementMeGithub} from '../../../components/ImplementMeGithub'
import {estimateZoom, getBoundsFromRegion, type MapBounds} from '../../../lib/mapBounds'

export default function EventsMap() {
  const {t} = useTranslation()
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {news: events, loading} = useUpdates({
    categories: ['culture', 'art', 'sports'],
    limit: 100,
    bounds: mapBounds,
    zoom: mapZoom,
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

  // Filter events that have location data
  const eventsWithLocation = events.filter((item) => item.location)

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

        {eventsWithLocation &&
          eventsWithLocation.map((item) => (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.location?.latitude ?? 42.6977,
                longitude: item.location?.longitude ?? 23.3219,
              }}
              title={item.title}
              description={item.description}
            />
          ))}
      </MapView>
      <View style={styles.implementMeContainer}>
        <ImplementMeGithub
          extendedText={t('common.implementMeMessage')}
          issueUrl="https://github.com/sofia-municipality/your-sofia-mobile/issues/4"
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
  implementMeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
})
