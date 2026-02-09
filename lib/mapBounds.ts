import type {Region} from 'react-native-maps'

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export function getBoundsFromRegion(region: Region): MapBounds {
  const halfLat = region.latitudeDelta / 2
  const halfLng = region.longitudeDelta / 2

  return {
    north: region.latitude + halfLat,
    south: region.latitude - halfLat,
    east: region.longitude + halfLng,
    west: region.longitude - halfLng,
  }
}

export function estimateZoom(region: Region): number {
  const safeDelta = Math.max(region.longitudeDelta, 0.000001)
  return Math.log2(360 / safeDelta)
}
