import React, {useRef, useEffect} from 'react'
import {View, StyleSheet} from 'react-native'

// Dynamic import for web-only libraries
let Map: any
let Marker: any

if (typeof window !== 'undefined') {
  const ReactMapGL = require('react-map-gl/maplibre')
  Map = ReactMapGL.Map
  Marker = ReactMapGL.Marker
}

interface WebMapViewProps {
  initialRegion: {
    latitude: number
    longitude: number
    latitudeDelta: number
    longitudeDelta: number
  }
  style?: any
  children?: React.ReactNode
}

interface MarkerData {
  coordinate: {
    latitude: number
    longitude: number
  }
  key: string
  children?: React.ReactNode
  onPress?: () => void
}

export function WebMapView({initialRegion, style, children}: WebMapViewProps) {
  const mapRef = useRef<any>(null)

  // Calculate zoom level from latitudeDelta
  const zoom = Math.log2(360 / initialRegion.latitudeDelta) - 1

  const [viewState, setViewState] = React.useState({
    longitude: initialRegion.longitude,
    latitude: initialRegion.latitude,
    zoom: zoom,
  })

  if (typeof window === 'undefined' || !Map) {
    return <View style={[styles.container, style]} />
  }

  return (
    <View style={[styles.container, style]}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        style={{width: '100%', height: '100%'}}
        mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
      >
        {children}
      </Map>
    </View>
  )
}

interface WebMarkerProps {
  coordinate: {
    latitude: number
    longitude: number
  }
  onPress?: () => void
  children?: React.ReactNode
  tracksViewChanges?: boolean
}

export function WebMarker({coordinate, onPress, children}: WebMarkerProps) {
  if (typeof window === 'undefined' || !Marker) {
    return null
  }

  return (
    <Marker longitude={coordinate.longitude} latitude={coordinate.latitude} anchor="bottom">
      <div onClick={onPress} style={{cursor: 'pointer'}}>
        {children || (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              backgroundColor: '#1E40AF',
              border: '3px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        )}
      </div>
    </Marker>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
})
