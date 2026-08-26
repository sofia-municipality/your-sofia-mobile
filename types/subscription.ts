export type LocationFilterType = 'all' | 'district' | 'point' | 'area'

export interface LocationFilterAll {
  id?: string
  filterType: 'all'
}

export interface LocationFilterDistrict {
  id?: string
  filterType: 'district'
  district: {id: number | string; name: string; districtId?: number} | number | string
}

export interface LocationFilterPoint {
  id?: string
  filterType: 'point'
  latitude: number
  longitude: number
  /** Radius in metres */
  radius: number
}

export interface LocationFilterArea {
  id?: string
  filterType: 'area'
  /** GeoJSON Polygon geometry */
  polygon: {
    type: 'Polygon'
    coordinates: [number, number][][]
  }
}

export type LocationFilter =
  LocationFilterAll | LocationFilterDistrict | LocationFilterPoint | LocationFilterArea

export interface SubscriptionCategory {
  id: number | string
  title: string
  slug: string
}

export interface CityDistrict {
  id: number | string
  districtId: number
  name: string
  code: string
}

export interface Subscription {
  id: number | string
  enabled: boolean
  pushToken: number | string | {id: number | string; token: string}
  user?: number | string | null
  categories: SubscriptionCategory[]
  locationFilters: LocationFilter[]
  updatedAt: string
  createdAt: string
}

export interface CreateSubscriptionInput {
  pushToken: number | string
  user?: number | string | null
  categories?: (number | string)[]
  locationFilters?: Omit<LocationFilter, 'id'>[]
}

export interface UpdateSubscriptionInput {
  user?: number | string | null
  enabled?: boolean
  categories?: (number | string)[]
  locationFilters?: Omit<LocationFilter, 'id'>[]
}
