export type NewsTopicType = 'all' | string

export interface NewsItem {
  id: string
  title?: string
  snippet?: string
  description: string
  date: string
  topic: NewsTopicType
  image?: string
  location?: {
    latitude: number
    longitude: number
  }
  categories?: string[]
  sourceId?: string
  sourceName?: string
  sourceUrl?: string
  sourceLogoUrl?: string
  markdownText?: string
  plainText?: string
  rawText?: string
  timespanStart?: string
  timespanEnd?: string
  timespanStatus?: 'active' | 'upcoming' | 'ended'
  cityWide?: boolean
  responsibleEntity?: string
  addresses?: {
    originalText: string
    formattedAddress: string
    coordinates?: {lat: number; lng: number}
  }[]
  pins?: {
    address: string
    coordinates?: {lat: number; lng: number}
    timespans: {start: string; end: string}[]
  }[]
  streets?: {
    street: string
    from: string
    to: string
    timespans: {start: string; end: string}[]
  }[]
  busStops?: string[]
  allLocations?: {latitude: number; longitude: number}[]
  createdAt?: string
  finalizedAt?: string
}

export interface NewsFilterChip {
  id: string
  label: string
  icon?: React.ComponentType<{size?: number; color?: string}>
}
