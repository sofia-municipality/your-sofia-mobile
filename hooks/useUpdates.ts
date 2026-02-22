import {useCallback, useEffect, useRef, useState} from 'react'
import {useTranslation} from 'react-i18next'
import type {MapBounds} from '@/lib/mapBounds'
import {
  fetchUpdates,
  fetchUpdateSources,
  mapSourcesById,
  mapUpdateMessageToNewsItem,
} from '@/lib/updatesApi'
import type {NewsItem} from '@/types/news'

interface UseUpdatesOptions {
  categories?: string[]
  bounds?: MapBounds | null
  zoom?: number
  limit?: number
  enabled?: boolean
}

export function useUpdates(options: UseUpdatesOptions = {}) {
  const FAILURE_COOLDOWN_MS = 15000
  const {i18n} = useTranslation()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const categoriesKey = options.categories?.join('|') ?? ''
  const hasLoadedRef = useRef(false)
  const inFlightRef = useRef(false)
  const lastRequestKeyRef = useRef<string | null>(null)
  const lastFailureKeyRef = useRef<string | null>(null)
  const lastFailureAtRef = useRef<number>(0)

  const buildRequestKey = useCallback(() => {
    const boundsKey = options.bounds
      ? [
          options.bounds.north.toFixed(5),
          options.bounds.south.toFixed(5),
          options.bounds.east.toFixed(5),
          options.bounds.west.toFixed(5),
        ].join('|')
      : 'no-bounds'
    const zoomKey = typeof options.zoom === 'number' ? options.zoom.toFixed(2) : 'no-zoom'

    return `${categoriesKey}|${boundsKey}|${zoomKey}|${i18n.language}`
  }, [categoriesKey, i18n.language, options.bounds, options.zoom])

  const loadUpdates = useCallback(
    async (force: boolean = false) => {
      if (options.enabled === false) {
        setLoading(false)
        return
      }

      if (options.bounds === null) {
        setLoading(false)
        return
      }

      const requestKey = buildRequestKey()

      if (!force && inFlightRef.current && lastRequestKeyRef.current === requestKey) {
        return
      }

      if (
        !force &&
        hasLoadedRef.current &&
        !error &&
        lastRequestKeyRef.current === requestKey &&
        !options.bounds
      ) {
        return
      }

      if (
        !force &&
        lastFailureKeyRef.current === requestKey &&
        Date.now() - lastFailureAtRef.current < FAILURE_COOLDOWN_MS
      ) {
        return
      }

      try {
        inFlightRef.current = true
        lastRequestKeyRef.current = requestKey
        setLoading(true)

        setError(null)

        const [messages, sources] = await Promise.all([
          fetchUpdates({
            categories: categoriesKey ? categoriesKey.split('|') : undefined,
            bounds: options.bounds ?? undefined,
            zoom: options.zoom,
          }),
          fetchUpdateSources().catch((sourcesError) => {
            console.warn('Error loading update sources metadata:', sourcesError)
            return []
          }),
        ])

        const sourcesById = mapSourcesById(sources)

        const transformed = messages
          .map((message) => mapUpdateMessageToNewsItem(message, i18n.language, sourcesById))
          .slice(0, options.limit ?? messages.length)

        setNews(transformed)
        hasLoadedRef.current = true
        lastFailureKeyRef.current = null
        lastFailureAtRef.current = 0
      } catch (err) {
        console.error('Error loading updates:', err)
        lastFailureKeyRef.current = requestKey
        lastFailureAtRef.current = Date.now()
        setError(err instanceof Error ? err.message : 'Failed to load updates')
      } finally {
        inFlightRef.current = false
        setLoading(false)
      }
    },
    [
      options.enabled,
      options.bounds,
      options.zoom,
      options.limit,
      error,
      buildRequestKey,
      FAILURE_COOLDOWN_MS,
      categoriesKey,
      i18n.language,
    ]
  )

  useEffect(() => {
    loadUpdates()
  }, [loadUpdates])

  const refresh = useCallback(() => {
    return loadUpdates(true)
  }, [loadUpdates])

  return {
    news,
    loading,
    error,
    refresh,
  }
}
