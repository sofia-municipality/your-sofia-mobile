export type GeoJsonPosition = [number, number]

export type BulkyWasteZoneGeometry =
  | {
      type: 'Polygon'
      coordinates: GeoJsonPosition[][]
    }
  | {
      type: 'MultiPolygon'
      coordinates: GeoJsonPosition[][][]
    }

export interface BulkyWasteZone {
  id: string
  name: string
  info?: string | null
  collectionDaysOfWeek: string[]
  geometry: BulkyWasteZoneGeometry
}

interface BulkyWasteZoneFeature {
  type: 'Feature'
  properties: Omit<BulkyWasteZone, 'geometry'>
  geometry: BulkyWasteZoneGeometry
}

export interface BulkyWasteZonesFeatureCollection {
  type: 'FeatureCollection'
  features: BulkyWasteZoneFeature[]
}
