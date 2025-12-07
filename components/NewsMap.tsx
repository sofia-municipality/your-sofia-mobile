import {StyleSheet, View, Dimensions, Platform} from 'react-native'
import type {NewsItem} from '../types/news'

// Conditional imports for native vs web
let MapView: any
let Marker: any
let WebMapView: any
let WebMarker: any

if (Platform.OS === 'web') {
  const WebComponents = require('./WebMapView')
  WebMapView = WebComponents.WebMapView
  WebMarker = WebComponents.WebMarker
} else {
  const RNMaps = require('react-native-maps')
  MapView = RNMaps.default
  Marker = RNMaps.Marker
}

interface NewsMapProps {
  news: NewsItem[]
  onMarkerPress?: (item: NewsItem) => void
}

const {width} = Dimensions.get('window')

export function NewsMap({news, onMarkerPress}: NewsMapProps) {
  const MapComponent = Platform.OS === 'web' ? WebMapView : MapView
  const MarkerComponent = Platform.OS === 'web' ? WebMarker : Marker

  return (
    <View style={styles.container}>
      <MapComponent
        style={styles.map}
        initialRegion={{
          latitude: 42.6977, // Sofia's coordinates
          longitude: 23.3219,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {news.map((item) => (
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
            onPress={() => onMarkerPress?.(item)}
          />
        ))}
      </MapComponent>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: width - 40,
    height: 300,
  },
})
