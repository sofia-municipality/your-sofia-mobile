/**
 * Payload CMS API Client
 * 
 * Client for fetching content from Payload CMS
 */

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

  const params = new URLSearchParams({
    locale,
    limit: limit.toString(),
    page: page.toString(),
    depth: '1', // Populate image relationship
    where: JSON.stringify({
      status: { equals: 'published' },
      ...(topic && topic !== 'all' ? { topic: { equals: topic } } : {}),
    }),
    sort: '-publishedAt',
  });

  const response = await fetch(`${API_URL}/api/news?${params}`);
  
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
