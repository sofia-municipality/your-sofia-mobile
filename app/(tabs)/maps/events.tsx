import React, {useState, useEffect, useMemo, useRef} from 'react'
import {View, StyleSheet, ActivityIndicator, Text} from 'react-native'
import MapView, {Marker, type Region} from 'react-native-maps'
import * as Location from 'expo-location'
import {useTranslation} from 'react-i18next'
import {useOboMessages} from '../../../hooks/useOboMessages'
import {useOboSources} from '../../../hooks/useOboSources'
import {estimateZoom, getBoundsFromRegion, type MapBounds} from '../../../lib/mapBounds'
import {ImplementMeGithub} from '../../../components/ImplementMeGithub'
import {uiTokens} from '../../../styles/common'

export default function EventsMap() {
  const {t} = useTranslation()
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [locationError, setLocationError] = useState(false)
  const {sourcesMap} = useOboSources()
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined)
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {news: events, loading} = useOboMessages({
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
          setLocationError(true)
          return
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        setLocation(currentLocation)
      } catch (error) {
        console.error('Error getting location:', error)
        setLocationError(true)
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

  // Filter events that have location data
  const eventsWithLocation = events.filter((item) => item.location)

  if (loading && eventsWithLocation.length === 0) {
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
          if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current)
          regionDebounceRef.current = setTimeout(() => {
            setMapBounds(getBoundsFromRegion(nextRegion))
            setMapZoom(estimateZoom(nextRegion))
          }, 400)
        }}
      >
        {location && !locationError && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title={t('common.yourLocation')}
            pinColor={uiTokens.colors.primary}
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
      <Text style={styles.poweredByText}>{t('common.poweredByOboApp')}</Text>
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
    backgroundColor: uiTokens.colors.surface,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: uiTokens.colors.textMuted,
  },
  implementMeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  poweredByText: {
    position: 'absolute',
    top: 6,
    left: 10,
    fontSize: 10,
    color: uiTokens.colors.textMuted,
    opacity: 0.7,
  },
})
