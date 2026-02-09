import {StyleSheet, View, Dimensions} from 'react-native'
import MapView, {Marker, type Region} from 'react-native-maps'
import type {NewsItem} from '../types/news'
import type {MapBounds} from '@/lib/mapBounds'
import {estimateZoom, getBoundsFromRegion} from '@/lib/mapBounds'
import {getCategoryColor, getCategoryIcon} from '@/lib/categories'

interface NewsMapProps {
  news: NewsItem[]
  onMarkerPress?: (item: NewsItem) => void
  onBoundsChange?: (bounds: MapBounds, zoom: number) => void
}

const {width} = Dimensions.get('window')

export function NewsMap({news, onMarkerPress, onBoundsChange}: NewsMapProps) {
  const handleRegionChangeComplete = (region: Region) => {
    if (!onBoundsChange) {
      return
    }

    const bounds = getBoundsFromRegion(region)
    const zoom = estimateZoom(region)
    onBoundsChange(bounds, zoom)
  }

  const newsWithLocation = news.filter((item) => item.location)

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 42.6977,
          longitude: 23.3219,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
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
              onPress={() => onMarkerPress?.(item)}
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: width - 40,
    height: 300,
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
