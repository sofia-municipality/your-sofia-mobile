import {useCallback, useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {MapBounds} from '@/lib/mapBounds'
import {fetchOboMessages, mapOboMessageToNewsItem, type OboSource} from '@/lib/oboapp'
import type {NewsItem} from '@/types/news'

interface UseOboMessagesOptions {
  categories?: string[]
  bounds?: MapBounds | null
  zoom?: number
  limit?: number
  enabled?: boolean
  sourcesMap?: Record<string, OboSource>
}

export function useOboMessages(options: UseOboMessagesOptions = {}) {
  const {i18n} = useTranslation()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const categoriesKey = options.categories?.join('|') ?? ''
  const hasLoadedRef = useRef(false)

  const loadMessages = useCallback(async () => {
    if (options.enabled === false) {
      return
    }

    if (options.bounds === null) {
      return
    }

    try {
      // Only show full loading state on initial fetch, not subsequent refetches
      if (!hasLoadedRef.current) {
        setLoading(true)
      }
      setError(null)

      const messages = await fetchOboMessages({
        categories: categoriesKey ? categoriesKey.split('|') : undefined,
        bounds: options.bounds ?? undefined,
        zoom: options.zoom,
      })

      const transformed = messages
        .map((message) => mapOboMessageToNewsItem(message, i18n.language, options.sourcesMap))
        .slice(0, options.limit ?? messages.length)

      setNews(transformed)
      hasLoadedRef.current = true
    } catch (err) {
      console.error('Error loading OboApp messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [
    options.bounds,
    categoriesKey,
    options.enabled,
    options.limit,
    options.sourcesMap,
    options.zoom,
    i18n.language,
  ])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  return {
    news,
    loading,
    error,
    refresh: loadMessages,
  }
}
