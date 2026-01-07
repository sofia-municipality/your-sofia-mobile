/**
 * Payload CMS API Client
 *
 * Client for fetching content from Payload CMS
 */

import type {WasteContainer} from '../types/wasteContainer'
import type {Signal, CreateSignalInput} from '../types/signal'
import {environmentManager} from './environment'

const getApiUrl = () => environmentManager.getApiUrl()

// Global auth error handler - will be set by AuthContext
let globalAuthErrorHandler: (() => void) | null = null

export function setAuthErrorHandler(handler: () => void) {
  globalAuthErrorHandler = handler
}

/**
 * Handle API response errors and check for authentication issues
 */
function handleAuthError(response: Response) {
  if (response.status === 401 && globalAuthErrorHandler) {
    console.log('[API] Authentication error detected, triggering logout')
    globalAuthErrorHandler()
  }
}

export interface PayloadNewsItem {
  id: string
  title: string
  description: string
  content?: any // Lexical rich text
  topic: 'festivals' | 'street-closure' | 'city-events' | 'alerts'
  image?:
    | {
        id: string
        url: string
        alt?: string
        filename?: string
        mimeType?: string
        filesize?: number
        width?: number
        height?: number
      }
    | string // Can be populated object or just ID string
  location?: {
    latitude: number
    longitude: number
  }
  status: 'draft' | 'published'
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export interface PayloadResponse<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

/**
 * Fetch news from Payload CMS
 */
export async function fetchNews(options?: {
  locale?: 'bg' | 'en'
  topic?: string
  limit?: number
  page?: number
}): Promise<PayloadResponse<PayloadNewsItem>> {
  const {locale = 'bg', topic, limit = 10, page = 1} = options || {}

  // Build query parameters
  const params = new URLSearchParams({
    locale,
    limit: limit.toString(),
    page: page.toString(),
    depth: '1', // Populate image relationship
    sort: '-publishedAt',
  })

  // Add status filter
  params.append('where[status][equals]', 'published')

  // Add topic filter if specified
  if (topic && topic !== 'all') {
    params.append('where[topic][equals]', topic)
  }

  const url = `${getApiUrl()}/api/news?${params}`
  console.log('[fetchNews] Request URL:', url)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch a single news item by ID
 */
export async function fetchNewsById(
  id: string,
  locale: 'bg' | 'en' = 'bg'
): Promise<PayloadNewsItem> {
  const response = await fetch(`${getApiUrl()}/api/news/${id}?locale=${locale}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch news item: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch media URL
 */
export function getMediaUrl(media: any): string | undefined {
  if (!media) return undefined
  if (typeof media === 'string') return `${getApiUrl()}${media}`
  if (media.url) return `${getApiUrl()}${media.url}`
  return undefined
}

/**
 * Fetch waste containers from Payload CMS
 */
export async function fetchWasteContainers(options?: {
  status?: 'active' | 'full' | 'maintenance' | 'inactive'
  wasteType?: string
  limit?: number
  page?: number
}): Promise<PayloadResponse<WasteContainer>> {
  const {status, wasteType, limit = 3000, page = 1} = options || {}

  // Build query parameters
  const params = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
    depth: '2', // Populate image and observations relationships
  })

  // Add status filter - default to active containers
  if (status) {
    params.append('where[status][equals]', status)
  }

  // Add waste type filter if specified
  if (wasteType) {
    params.append('where[wasteType][equals]', wasteType)
  }

  const url = `${getApiUrl()}/api/waste-containers?${params}`
  console.log('[fetchWasteContainers] Request URL:', url)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch waste containers: ${response.statusText}`)
  }

  const data = await response.json()

  // Transform image URLs only (observations loaded lazily)
  if (data.docs) {
    data.docs = data.docs.map((container: any) => ({
      ...container,
      image: container.image
        ? {
            ...container.image,
            url: getMediaUrl(container.image),
          }
        : undefined,
    }))
  }

  return data
}

/**
 * Fetch a single waste container by ID with latest observation
 */
export async function fetchWasteContainerById(id: string): Promise<WasteContainer> {
  const response = await fetch(`${getApiUrl()}/api/waste-containers/${id}?depth=1`)

  if (!response.ok) {
    throw new Error(`Failed to fetch waste container: ${response.statusText}`)
  }

  const container = await response.json()

  // Transform image URL
  if (container.image) {
    container.image = {
      ...container.image,
      url: getMediaUrl(container.image),
    }
  }

  // Fetch latest observation with photo for this container
  try {
    const obsResponse = await fetch(
      `${getApiUrl()}/api/waste-container-observations?where[container][equals]=${container.id}&sort=-cleanedAt&limit=1&depth=1`
    )
    if (obsResponse.ok) {
      const obsData = await obsResponse.json()
      if (obsData.docs && obsData.docs.length > 0 && obsData.docs[0].photo) {
        container.lastCleanedPhoto = {
          url: getMediaUrl(obsData.docs[0].photo),
          alt: obsData.docs[0].photo.alt,
        }
      }
    }
  } catch (error) {
    console.error('Error fetching observation photo:', error)
  }

  return container
}

/**
 * Clean a waste container (mark signals as resolved and set status to active)
 * Requires authentication token
 */
export async function cleanContainer(
  containerId: string | number,
  authToken: string,
  photo?: {uri: string; type: string; name: string},
  notes?: string
): Promise<{
  success: boolean
  container: WasteContainer
  resolvedSignals: number
  observationId?: string
}> {
  const formData = new FormData()

  if (photo) {
    // Append photo as a proper file object for React Native
    formData.append('photo', {
      uri: photo.uri,
      type: photo.type,
      name: photo.name,
    } as any)
  } else {
    // Add an empty placeholder to ensure FormData has content
    formData.append('_empty', '')
  }

  if (notes) {
    formData.append('notes', notes)
  }

  const response = await fetch(`${getApiUrl()}/api/waste-containers/${containerId}/clean`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      // Don't set Content-Type - let fetch set it automatically with boundary
    },
    body: formData,
  })

  if (!response.ok) {
    handleAuthError(response)
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to clean container: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Fetch signals from Payload CMS
 */
export async function fetchSignals(options?: {
  locale?: 'bg' | 'en'
  status?: string
  category?: string
  limit?: number
  page?: number
  reporterUniqueId?: string
  containerReferenceId?: string
}): Promise<PayloadResponse<Signal>> {
  const {
    locale = 'bg',
    status,
    category,
    limit = 20,
    page = 1,
    reporterUniqueId,
    containerReferenceId,
  } = options || {}

  // Build query parameters
  const params = new URLSearchParams({
    locale,
    limit: limit.toString(),
    page: page.toString(),
    depth: '1', // Populate image relationship
    sort: '-createdAt',
  })

  // Add status filter if specified
  if (status) {
    params.append('where[status][equals]', status)
  }

  // Add category filter if specified
  if (category) {
    params.append('where[category][equals]', category)
  }

  // Add reporterUniqueId filter if specified
  if (reporterUniqueId) {
    params.append('where[reporterUniqueId][equals]', reporterUniqueId)
  }

  // Add container reference ID filter if specified
  if (containerReferenceId) {
    params.append('where[cityObject.referenceId][equals]', containerReferenceId)
  }

  const url = `${getApiUrl()}/api/signals?${params}`
  console.log('[fetchSignals] Request URL:', url)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch signals: ${response.statusText}`)
  }

  const data = await response.json()

  // Transform image URLs
  if (data.docs) {
    data.docs = data.docs.map((signal: any) => ({
      ...signal,
      images: signal.images?.map((img: any) => ({
        ...img,
        url: getMediaUrl(img),
      })),
    }))
  }

  return data
}

/**
 * Fetch a single signal by ID
 */
export async function fetchSignalById(id: string, locale: 'bg' | 'en' = 'bg'): Promise<Signal> {
  const response = await fetch(`${getApiUrl()}/api/signals/${id}?locale=${locale}&depth=1`)

  if (!response.ok) {
    throw new Error(`Failed to fetch signal: ${response.statusText}`)
  }

  const signal = await response.json()

  // Transform image URLs
  if (signal.images) {
    signal.images = signal.images.map((img: any) => ({
      ...img,
      url: getMediaUrl(img),
    }))
  }

  return signal
}

/**
 * Create a new signal with optional photos
 */
export async function createSignal(
  signalData: CreateSignalInput,
  locale: 'bg' | 'en' = 'bg',
  photos?: {uri: string; type: string; name: string}[],
  reporterUniqueId?: string
): Promise<Signal> {
  let response: Response

  if (photos && photos.length > 0) {
    // Upload photos first, then create signal with image references
    const imageIds: string[] = []

    for (const photo of photos) {
      const formData = new FormData()
      formData.append('file', {
        uri: photo.uri,
        type: photo.type,
        name: photo.name,
      } as any)

      formData.append(
        '_payload',
        JSON.stringify({
          reporterUniqueId: reporterUniqueId || null,
        })
      )

      const uploadResponse = await fetch(`${getApiUrl()}/api/media`, {
        method: 'POST',
        body: formData,
      })

      if (uploadResponse.ok) {
        const uploadedImage = await uploadResponse.json()
        imageIds.push(uploadedImage.doc.id)
      } else {
        const errorData = await uploadResponse.json().catch(() => ({}))
        const errorMessage = errorData.message || `Failed to upload photo: ${photo.name}`
        console.error('Photo upload failed:', errorMessage)
        throw new Error(errorMessage)
      }
    }

    // Create signal with uploaded image IDs
    response = await fetch(`${getApiUrl()}/api/signals?locale=${locale}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...signalData,
        images: imageIds,
      }),
    })
  } else {
    // Create signal without photos
    response = await fetch(`${getApiUrl()}/api/signals?locale=${locale}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signalData),
    })
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.log('[createSignal] Error response:', JSON.stringify(errorData, null, 2))
    // Payload CMS error structure can be: { message, errors } or { data: [{ message }] }
    const errorMessage =
      errorData.message ||
      errorData.errors?.[0]?.message ||
      errorData.data?.[0]?.message ||
      `Failed to create signal: ${response.statusText}`
    throw new Error(errorMessage)
  }

  return response.json()
}

/**
 * Check if reporter already has an active signal for the same container
 */
export async function checkExistingSignal(
  reporterUniqueId: string,
  containerReferenceId: string,
  locale: 'bg' | 'en' = 'bg'
): Promise<{exists: boolean; signal?: Signal}> {
  try {
    const response = await fetchSignals({
      locale,
      reporterUniqueId,
      containerReferenceId,
      category: 'waste-container',
      limit: 1,
    })

    // Check if there are any non-resolved signals
    const activeSignal = response.docs.find(
      (signal) => signal.status !== 'resolved' && signal.status !== 'rejected'
    )

    return {
      exists: !!activeSignal,
      signal: activeSignal,
    }
  } catch (error) {
    console.error('Error checking existing signal:', error)
    return {exists: false}
  }
}

/**
 * Fetch signal statistics for a reporter
 */
export async function fetchSignalStats(
  reporterUniqueId: string,
  locale: 'bg' | 'en' = 'bg'
): Promise<{total: number; active: number}> {
  try {
    // Fetch all signals for this reporter
    const response = await fetchSignals({
      locale,
      reporterUniqueId,
      limit: 1000, // High limit to get all signals
    })

    const total = response.totalDocs

    // Count active signals (not resolved or rejected)
    const active = response.docs.filter(
      (signal) => signal.status !== 'resolved' && signal.status !== 'rejected'
    ).length

    return {total, active}
  } catch (error) {
    console.error('Error fetching signal stats:', error)
    return {total: 0, active: 0}
  }
}

/**
 * Update an existing signal
 */
export async function updateSignal(
  id: string,
  signalData: Partial<CreateSignalInput>,
  locale: 'bg' | 'en' = 'bg'
): Promise<Signal> {
  const response = await fetch(`${getApiUrl()}/api/signals/${id}?locale=${locale}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(signalData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `Failed to update signal: ${response.statusText}`)
  }

  return response.json()
}
