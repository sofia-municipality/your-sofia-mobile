import {StyleSheet, View, Dimensions} from 'react-native'
import MapView, {Marker} from 'react-native-maps'
import type {NewsItem} from '../types/news'

interface NewsMapProps {
  news: NewsItem[]
  onMarkerPress?: (item: NewsItem) => void
}

const {width} = Dimensions.get('window')

export function NewsMap({news, onMarkerPress}: NewsMapProps) {
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 42.6977, // Sofia's coordinates
          longitude: 23.3219,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {news.map((item) => (
          <Marker
            key={item.id}
            coordinate={{
              latitude: item.location?.latitude ?? 42.6977,
              longitude: item.location?.longitude ?? 23.3219,
            }}
            title={item.title}
            description={item.description}
            onPress={() => onMarkerPress?.(item)}
          />
        ))}
      </MapView>
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
