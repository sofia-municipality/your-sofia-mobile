import type {MapBounds} from './mapBounds'
import type {NewsItem} from '@/types/news'
import {environmentManager} from './environment'
import {extractSnippet} from './stringUtils'
import {
  UpdateByIdResponseSchema,
  UpdatesSourcesResponseSchema,
  UpdatesResponseSchema,
  type UpdateMessage,
  type UpdateSource,
} from './updatesSchema'

const SOURCES_CACHE_TTL_MS = 5 * 60 * 1000
let cachedSources: UpdateSource[] | null = null
let cachedSourcesAt = 0
let sourcesInFlight: Promise<UpdateSource[]> | null = null

const getUpdatesBaseUrl = () => `${environmentManager.getApiUrl()}/api`

async function parseJsonResponse<T>(
  response: Response,
  schema: {parse: (value: unknown) => T},
  context: string
): Promise<T> {
  const payload = await response.json()
  try {
    return schema.parse(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error'
    throw new Error(`${context}: invalid response payload (${message})`)
  }
}

export async function fetchUpdates(options?: {
  categories?: string[]
  bounds?: MapBounds
  zoom?: number
}): Promise<UpdateMessage[]> {
  const baseUrl = getUpdatesBaseUrl()
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
  const url = `${baseUrl}/updates${query ? `?${query}` : ''}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch updates: ${response.status} ${response.statusText}`)
  }

  const data = await parseJsonResponse(response, UpdatesResponseSchema, 'Updates list')
  return data.messages
}

export async function fetchUpdateById(id: string): Promise<UpdateMessage> {
  const baseUrl = getUpdatesBaseUrl()
  const response = await fetch(`${baseUrl}/updates/by-id?id=${encodeURIComponent(id)}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch update: ${response.status} ${response.statusText}`)
  }

  const data = await parseJsonResponse(response, UpdateByIdResponseSchema, 'Update by id')
  return data.message
}

export async function fetchUpdateSources(options?: {force?: boolean}): Promise<UpdateSource[]> {
  const now = Date.now()

  if (!options?.force && cachedSources && now - cachedSourcesAt < SOURCES_CACHE_TTL_MS) {
    return cachedSources
  }

  if (!options?.force && sourcesInFlight) {
    return sourcesInFlight
  }

  const baseUrl = getUpdatesBaseUrl()
  sourcesInFlight = (async () => {
    try {
      const response = await fetch(`${baseUrl}/updates/sources`)

      if (!response.ok) {
        throw new Error(`Failed to fetch update sources: ${response.status} ${response.statusText}`)
      }

      const data = await parseJsonResponse(
        response,
        UpdatesSourcesResponseSchema,
        'Updates sources'
      )
      cachedSources = data.sources
      cachedSourcesAt = Date.now()
      return data.sources
    } finally {
      sourcesInFlight = null
    }
  })()

  return sourcesInFlight
}

function buildSourcesById(sources: UpdateSource[]): Record<string, UpdateSource> {
  return sources.reduce<Record<string, UpdateSource>>((acc, source) => {
    if (!source.id) {
      return acc
    }

    acc[source.id] = source
    return acc
  }, {})
}

export function mapUpdateMessageToNewsItem(
  message: UpdateMessage,
  locale: string,
  sourcesById?: Record<string, UpdateSource>
): NewsItem {
  const dateSource = message.finalizedAt ?? message.timespanEnd
  const date = dateSource ? new Date(dateSource) : new Date()

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

  const sourceMeta = message.source ? sourcesById?.[message.source] : undefined

  return {
    id: message.id ?? `${message.createdAt}`,
    title: undefined,
    snippet: extractSnippet(message.plainText || message.text, 100),
    description: message.locality ?? 'bg.sofia',
    date: date.toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    topic: message.categories?.[0] ?? 'uncategorized',
    location: getMessageLocation(message),
    categories: message.categories ?? [],
    sourceId: message.source,
    sourceName: sourceMeta?.name ?? message.source,
    sourceUrl: message.sourceUrl ?? sourceMeta?.url,
    sourceLogoUrl: sourceMeta?.logoUrl,
    markdownText: message.markdownText,
    plainText: message.plainText,
    rawText: message.text,
    timespanStart: toISOStringIfValid(message.timespanStart),
    timespanEnd: toISOStringIfValid(message.timespanEnd),
    timespanStatus,
    cityWide: message.cityWide,
    responsibleEntity: message.responsibleEntity,
    addresses: message.addresses?.map((address) => ({
      originalText: address.originalText ?? '',
      formattedAddress: address.formattedAddress ?? '',
      coordinates: address.coordinates,
    })),
    pins: message.pins,
    streets: message.streets?.map((street) => ({
      street: street.street,
      from: street.from,
      to: street.to,
      timespans: street.timespans,
    })),
    busStops: message.busStops,
    allLocations: getAllLocations(message),
    finalizedAt: message.finalizedAt ? new Date(message.finalizedAt).toISOString() : undefined,
  }
}

export function mapSourcesById(sources: UpdateSource[]): Record<string, UpdateSource> {
  return buildSourcesById(sources)
}

function toISOStringIfValid(value?: string): string | undefined {
  if (!value) {
    return undefined
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date.toISOString()
}

function getMessageLocation(message: UpdateMessage): NewsItem['location'] {
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

function getLocationFromGeoJson(geoJson?: UpdateMessage['geoJson']): NewsItem['location'] {
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

function getAllLocations(message: UpdateMessage): {latitude: number; longitude: number}[] {
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
    for (const address of message.addresses) {
      if (address.coordinates) {
        points.push({latitude: address.coordinates.lat, longitude: address.coordinates.lng})
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
