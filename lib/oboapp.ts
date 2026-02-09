import type {MapBounds} from './mapBounds'
import type {NewsItem} from '@/types/news'

const getOboAppBaseUrl = () => {
  const baseUrl = process.env.EXPO_PUBLIC_OBOAPP_API_URL
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_OBOAPP_API_URL is not configured')
  }

  return baseUrl.replace(/\/$/, '')
}

function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, {signal: controller.signal}).finally(() => clearTimeout(timeoutId))
}

export interface OboMessage {
  id?: string
  text: string
  plainText?: string
  markdownText?: string
  addresses?: {
    originalText: string
    formattedAddress: string
    coordinates: {
      lat: number
      lng: number
    }
    geoJson?: {
      type: 'Point'
      coordinates: [number, number]
    }
  }[]
  geoJson?: {
    type: 'FeatureCollection'
    features: {
      type: 'Feature'
      geometry: {
        type: 'Point' | 'LineString' | 'Polygon'
        coordinates: any
      }
      properties?: Record<string, unknown>
    }[]
  }
  createdAt: string | Date
  crawledAt?: string | Date
  finalizedAt?: string | Date
  source?: string
  sourceUrl?: string
  categories?: string[]
  timespanStart?: string | Date
  timespanEnd?: string | Date
  cityWide?: boolean
  responsibleEntity?: string
  pins?: {
    address: string
    coordinates?: {lat: number; lng: number}
    timespans: {start: string; end: string}[]
  }[]
  streets?: {
    street: string
    from: string
    fromCoordinates?: {lat: number; lng: number}
    to: string
    toCoordinates?: {lat: number; lng: number}
    timespans: {start: string; end: string}[]
  }[]
  cadastralProperties?: {
    identifier: string
    timespans: {start: string; end: string}[]
  }[]
  busStops?: string[]
}

export interface OboSource {
  id: string
  name: string
  url: string
  logoUrl: string
}

interface OboMessagesResponse {
  messages: OboMessage[]
}

interface OboSourcesResponse {
  sources: OboSource[]
}

export async function fetchOboMessages(options?: {
  categories?: string[]
  bounds?: MapBounds
  zoom?: number
}): Promise<OboMessage[]> {
  const baseUrl = getOboAppBaseUrl()
  const params = new URLSearchParams()

  if (options?.bounds) {
    params.set('north', options.bounds.north.toString())
    params.set('south', options.bounds.south.toString())
    params.set('east', options.bounds.east.toString())
    params.set('west', options.bounds.west.toString())
  }

  if (typeof options?.zoom === 'number' && Number.isFinite(options.zoom)) {
    params.set('zoom', options.zoom.toString())
  }

  if (options?.categories && options.categories.length > 0) {
    params.set('categories', options.categories.join(','))
  }

  const query = params.toString()
  const url = `${baseUrl}/messages${query ? `?${query}` : ''}`

  const response = await fetchWithTimeout(url, 30000)
  if (!response.ok) {
    throw new Error(`Failed to fetch OboApp messages: ${response.statusText}`)
  }

  const data = (await response.json()) as OboMessagesResponse
  return data.messages ?? []
}

export async function fetchOboSources(): Promise<OboSource[]> {
  const baseUrl = getOboAppBaseUrl()
  const response = await fetchWithTimeout(`${baseUrl}/sources`)

  if (!response.ok) {
    throw new Error(`Failed to fetch OboApp sources: ${response.statusText}`)
  }

  const data = (await response.json()) as OboSourcesResponse
  return data.sources ?? []
}

export function mapOboMessageToNewsItem(
  message: OboMessage,
  locale: string,
  sourcesMap?: Record<string, OboSource>
): NewsItem {
  const dateSource = message.finalizedAt ?? message.createdAt
  const date = dateSource ? new Date(dateSource) : new Date()
  const sourceId = message.source
  const sourceInfo = sourceId ? sourcesMap?.[sourceId] : undefined

  // Compute timespan status
  let timespanStatus: 'active' | 'upcoming' | 'ended' | undefined
  if (message.timespanStart || message.timespanEnd) {
    const now = new Date()
    const start = message.timespanStart ? new Date(message.timespanStart) : null
    const end = message.timespanEnd ? new Date(message.timespanEnd) : null
    if (end && end < now) {
      timespanStatus = 'ended'
    } else if (start && start > now) {
      timespanStatus = 'upcoming'
    } else {
      timespanStatus = 'active'
    }
  }

  // Generate a smart title from plainText or text (truncated)
  const titleSource = message.plainText || message.text
  const title =
    titleSource.length > 120 ? titleSource.substring(0, 120).trim() + '...' : titleSource

  // Collect all locations
  const allLocations = getAllLocations(message)

  return {
    id: message.id ?? `${message.createdAt}`,
    title,
    description: sourceInfo?.name ?? sourceId ?? '',
    date: date.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    topic: message.categories?.[0] ?? 'uncategorized',
    location: getMessageLocation(message),
    categories: message.categories ?? [],
    sourceId,
    sourceName: sourceInfo?.name,
    sourceUrl: sourceInfo?.url ?? message.sourceUrl,
    sourceLogoUrl: sourceInfo?.logoUrl,
    markdownText: message.markdownText,
    plainText: message.plainText,
    rawText: message.text,
    timespanStart: message.timespanStart
      ? new Date(message.timespanStart).toISOString()
      : undefined,
    timespanEnd: message.timespanEnd ? new Date(message.timespanEnd).toISOString() : undefined,
    timespanStatus,
    cityWide: message.cityWide,
    responsibleEntity: message.responsibleEntity,
    addresses: message.addresses?.map((a) => ({
      originalText: a.originalText,
      formattedAddress: a.formattedAddress,
      coordinates: a.coordinates,
    })),
    pins: message.pins,
    streets: message.streets?.map((s) => ({
      street: s.street,
      from: s.from,
      to: s.to,
      timespans: s.timespans,
    })),
    busStops: message.busStops,
    allLocations,
    createdAt: message.createdAt ? new Date(message.createdAt).toISOString() : undefined,
    finalizedAt: message.finalizedAt ? new Date(message.finalizedAt).toISOString() : undefined,
  }
}

export async function fetchOboMessageById(id: string): Promise<OboMessage | null> {
  const baseUrl = getOboAppBaseUrl()
  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/messages/by-id?id=${encodeURIComponent(id)}`
    )
    if (response.ok) {
      const data = (await response.json()) as {message: OboMessage}
      return data.message ?? null
    }
    if (response.status === 404) return null
  } catch {
    // Fall through to fallback
  }
  // Fallback: fetch all and filter
  const messages = await fetchOboMessages()
  return messages.find((message) => message.id === id) ?? null
}

function getMessageLocation(message: OboMessage): NewsItem['location'] {
  const geoLocation = getLocationFromGeoJson(message.geoJson)
  if (geoLocation) {
    return geoLocation
  }

  const address = message.addresses?.[0]
  if (address?.coordinates) {
    return {
      latitude: address.coordinates.lat,
      longitude: address.coordinates.lng,
    }
  }

  return undefined
}

function getLocationFromGeoJson(geoJson?: OboMessage['geoJson']): NewsItem['location'] {
  if (!geoJson?.features?.length) {
    return undefined
  }

  const geometry = geoJson.features[0]?.geometry
  if (!geometry) {
    return undefined
  }

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates as [number, number]
    return {latitude: lat, longitude: lng}
  }

  if (geometry.type === 'LineString') {
    const coords = geometry.coordinates as [number, number][]
    if (coords?.length) {
      const [lng, lat] = coords[0]
      return {latitude: lat, longitude: lng}
    }
  }

  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates as [number, number][][]
    const firstPoint = rings?.[0]?.[0]
    if (firstPoint) {
      const [lng, lat] = firstPoint
      return {latitude: lat, longitude: lng}
    }
  }

  return undefined
}

function getAllLocations(message: OboMessage): {latitude: number; longitude: number}[] {
  const points: {latitude: number; longitude: number}[] = []

  if (message.geoJson?.features) {
    for (const feature of message.geoJson.features) {
      if (feature.geometry.type === 'Point') {
        const [lng, lat] = feature.geometry.coordinates as [number, number]
        points.push({latitude: lat, longitude: lng})
      }
      if (feature.geometry.type === 'LineString') {
        for (const coord of feature.geometry.coordinates as [number, number][]) {
          points.push({latitude: coord[1], longitude: coord[0]})
        }
      }
    }
  }

  if (message.addresses) {
    for (const addr of message.addresses) {
      if (addr.coordinates) {
        points.push({latitude: addr.coordinates.lat, longitude: addr.coordinates.lng})
      }
    }
  }

  if (message.pins) {
    for (const pin of message.pins) {
      if (pin.coordinates) {
        points.push({latitude: pin.coordinates.lat, longitude: pin.coordinates.lng})
      }
    }
  }

  return points
}
