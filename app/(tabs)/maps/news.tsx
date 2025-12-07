import React, {useState, useEffect} from 'react'
import {View, StyleSheet, ActivityIndicator, Text, Platform} from 'react-native'
import * as Location from 'expo-location'

// Conditional imports for native vs web
let MapView: any
let Marker: any
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
}
import {useTranslation} from 'react-i18next'
import {useNews} from '../../../hooks/useNews'
import {ImplementMeGithub} from '../../../components/ImplementMeGithub'

export default function NewsMap() {
  const {t} = useTranslation()
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [locationError, setLocationError] = useState(false)
  const {news, loading} = useNews('all')

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
  const region = {
    latitude: location?.coords.latitude || 42.6977,
    longitude: location?.coords.longitude || 23.3219,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }

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

  // Render web map or native map based on platform
  const MapComponent = Platform.OS === 'web' ? WebMapView : MapView
  const MarkerComponent = Platform.OS === 'web' ? WebMarker : Marker

  return (
    <View style={styles.container}>
      <MapComponent
        style={styles.map}
        initialRegion={region}
        {...(Platform.OS !== 'web' && {
          showsUserLocation: true,
          showsMyLocationButton: true,
          showsCompass: true,
        })}
      >
        {/* User location marker - only show if location permission was denied */}
        {location && !locationError && (
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

        {/* News markers */}
        {newsWithLocation.map((item) => (
          <MarkerComponent
            key={item.id}
            coordinate={{
              latitude: item.location?.latitude ?? 42.6977,
              longitude: item.location?.longitude ?? 23.3219,
            }}
            {...(Platform.OS !== 'web' && {
              title: item.title,
              description: item.description,
            })}
          />
        ))}
      </MapComponent>
      <View style={styles.implementMeContainer}>
        <ImplementMeGithub
          extendedText={t('common.implementMeMessage')}
          issueUrl="https://github.com/sofia-municipality/your-sofia-mobile/issues/3"
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
    top: 2,
    left: 2,
    right: 2,
    borderRadius: 8,
  },
})
