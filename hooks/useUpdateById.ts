import {useCallback, useEffect, useState} from 'react'
import {useTranslation} from 'react-i18next'
import {
  fetchUpdateById,
  fetchUpdateSources,
  mapSourcesById,
  mapUpdateMessageToNewsItem,
} from '@/lib/updatesApi'
import type {NewsItem} from '@/types/news'

export function useUpdateById(id?: string) {
  const {i18n} = useTranslation()
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadUpdate = useCallback(async () => {
    if (!id) {
      setNewsItem(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const [message, sources] = await Promise.all([
        fetchUpdateById(id),
        fetchUpdateSources().catch((sourcesError) => {
          console.warn('Error loading update sources metadata:', sourcesError)
          return []
        }),
      ])
      const sourcesById = mapSourcesById(sources)
      setNewsItem(mapUpdateMessageToNewsItem(message, i18n.language, sourcesById))
    } catch (err) {
      console.error('Error loading update by id:', err)
      setError(err instanceof Error ? err.message : 'Failed to load update')
      setNewsItem(null)
    } finally {
      setLoading(false)
    }
  }, [id, i18n.language])

  useEffect(() => {
    loadUpdate()
  }, [loadUpdate])

  return {
    newsItem,
    loading,
    error,
    refresh: loadUpdate,
  }
}
