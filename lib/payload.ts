/**
 * Payload CMS API Client
 * 
 * Client for fetching content from Payload CMS
 */

import type { WasteContainer } from '../types/wasteContainer';
import type { Signal, CreateSignalInput } from '../types/signal';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface PayloadNewsItem {
  id: string;
  title: string;
  description: string;
  content?: any; // Lexical rich text
  topic: 'festivals' | 'street-closure' | 'city-events' | 'alerts';
  image?: {
    id: string;
    url: string;
    alt?: string;
    filename?: string;
    mimeType?: string;
    filesize?: number;
    width?: number;
    height?: number;
  } | string; // Can be populated object or just ID string
  location?: {
    latitude: number;
    longitude: number;
  };
  status: 'draft' | 'published';
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayloadResponse<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

/**
 * Fetch news from Payload CMS
 */
export async function fetchNews(options?: {
  locale?: 'bg' | 'en';
  topic?: string;
  limit?: number;
  page?: number;
}): Promise<PayloadResponse<PayloadNewsItem>> {
  const { locale = 'bg', topic, limit = 10, page = 1 } = options || {};

  // Build query parameters
  const params = new URLSearchParams({
    locale,
    limit: limit.toString(),
    page: page.toString(),
    depth: '1', // Populate image relationship
    sort: '-publishedAt',
  });

  // Add status filter
  params.append('where[status][equals]', 'published');

  // Add topic filter if specified
  if (topic && topic !== 'all') {
    params.append('where[topic][equals]', topic);
  }

  const url = `${API_URL}/api/news?${params}`;
  console.log('[fetchNews] Request URL:', url);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a single news item by ID
 */
export async function fetchNewsById(
  id: string,
  locale: 'bg' | 'en' = 'bg',
): Promise<PayloadNewsItem> {
  const response = await fetch(`${API_URL}/api/news/${id}?locale=${locale}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch news item: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch media URL
 */
export function getMediaUrl(media: any): string | undefined {
  if (!media) return undefined;
  if (typeof media === 'string') return `${API_URL}${media}`;
  if (media.url) return `${API_URL}${media.url}`;
  return undefined;
}

/**
 * Fetch waste containers from Payload CMS
 */
export async function fetchWasteContainers(options?: {
  status?: 'active' | 'full' | 'maintenance' | 'inactive';
  wasteType?: string;
  limit?: number;
  page?: number;
}): Promise<PayloadResponse<WasteContainer>> {
  const { status, wasteType, limit = 100, page = 1 } = options || {};

  // Build query parameters
  const params = new URLSearchParams({
    limit: limit.toString(),
    page: page.toString(),
    depth: '1', // Populate image relationship
  });

  // Add status filter - default to active containers
  if (status) {
    params.append('where[status][equals]', status);
  }

  // Add waste type filter if specified
  if (wasteType) {
    params.append('where[wasteType][equals]', wasteType);
  }

  const url = `${API_URL}/api/waste-containers?${params}`;
  console.log('[fetchWasteContainers] Request URL:', url);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch waste containers: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Transform image URLs
  if (data.docs) {
    data.docs = data.docs.map((container: any) => ({
      ...container,
      image: container.image ? {
        ...container.image,
        url: getMediaUrl(container.image),
      } : undefined,
    }));
  }

  return data;
}

/**
 * Fetch a single waste container by ID
 */
export async function fetchWasteContainerById(id: string): Promise<WasteContainer> {
  const response = await fetch(`${API_URL}/api/waste-containers/${id}?depth=1`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch waste container: ${response.statusText}`);
  }

  const container = await response.json();
  
  // Transform image URL
  if (container.image) {
    container.image = {
      ...container.image,
      url: getMediaUrl(container.image),
    };
  }

  return container;
}

/**
 * Fetch signals from Payload CMS
 */
export async function fetchSignals(options?: {
  locale?: 'bg' | 'en';
  status?: string;
  category?: string;
  limit?: number;
  page?: number;
  reporterUniqueId?: string;
  containerReferenceId?: string;
}): Promise<PayloadResponse<Signal>> {
  const { locale = 'bg', status, category, limit = 20, page = 1, reporterUniqueId, containerReferenceId } = options || {};

  // Build query parameters
  const params = new URLSearchParams({
    locale,
    limit: limit.toString(),
    page: page.toString(),
    depth: '1', // Populate image relationship
    sort: '-createdAt',
  });

  // Add status filter if specified
  if (status) {
    params.append('where[status][equals]', status);
  }

  // Add category filter if specified
  if (category) {
    params.append('where[category][equals]', category);
  }

  // Add reporterUniqueId filter if specified
  if (reporterUniqueId) {
    params.append('where[reporterUniqueId][equals]', reporterUniqueId);
  }

  // Add container reference ID filter if specified
  if (containerReferenceId) {
    params.append('where[cityObject.referenceId][equals]', containerReferenceId);
  }

  const url = `${API_URL}/api/signals?${params}`;
  console.log('[fetchSignals] Request URL:', url);

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch signals: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Transform image URLs
  if (data.docs) {
    data.docs = data.docs.map((signal: any) => ({
      ...signal,
      images: signal.images?.map((img: any) => ({
        ...img,
        url: getMediaUrl(img),
      })),
    }));
  }

  return data;
}

/**
 * Fetch a single signal by ID
 */
export async function fetchSignalById(
  id: string,
  locale: 'bg' | 'en' = 'bg',
): Promise<Signal> {
  const response = await fetch(`${API_URL}/api/signals/${id}?locale=${locale}&depth=1`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch signal: ${response.statusText}`);
  }

  const signal = await response.json();
  
  // Transform image URLs
  if (signal.images) {
    signal.images = signal.images.map((img: any) => ({
      ...img,
      url: getMediaUrl(img),
    }));
  }

  return signal;
}

/**
 * Create a new signal
 */
export async function createSignal(
  signalData: CreateSignalInput,
  locale: 'bg' | 'en' = 'bg',
): Promise<Signal> {
  const response = await fetch(`${API_URL}/api/signals?locale=${locale}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(signalData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create signal: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check if reporter already has an active signal for the same container
 */
export async function checkExistingSignal(
  reporterUniqueId: string,
  containerReferenceId: string,
  locale: 'bg' | 'en' = 'bg',
): Promise<{ exists: boolean; signal?: Signal }> {
  try {
    const response = await fetchSignals({
      locale,
      reporterUniqueId,
      containerReferenceId,
      category: 'waste-container',
      limit: 1,
    });

    // Check if there are any non-resolved signals
    const activeSignal = response.docs.find(
      signal => signal.status !== 'resolved' && signal.status !== 'rejected'
    );

    return {
      exists: !!activeSignal,
      signal: activeSignal,
    };
  } catch (error) {
    console.error('Error checking existing signal:', error);
    return { exists: false };
  }
}

/**
 * Update an existing signal
 */
export async function updateSignal(
  id: string,
  signalData: Partial<CreateSignalInput>,
  locale: 'bg' | 'en' = 'bg',
): Promise<Signal> {
  const response = await fetch(`${API_URL}/api/signals/${id}?locale=${locale}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(signalData),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to update signal: ${response.statusText}`);
  }

  return response.json();
}
