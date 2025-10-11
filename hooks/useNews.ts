import {useState, useEffect, useCallback} from 'react'
import {useTranslation} from 'react-i18next'
import {fetchNews, type PayloadNewsItem} from '@/lib/payload'
import type {NewsItem, NewsTopicType} from '@/types/news'

/**
 * Hook to fetch news from Payload CMS
 */
export function useNews(topic?: NewsTopicType) {
  const {i18n} = useTranslation()
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNews = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[useNews] Loading news with topic:', topic, 'locale:', i18n.language)

      const response = await fetchNews({
        locale: i18n.language as 'bg' | 'en',
        topic: topic === 'all' ? undefined : topic,
        limit: 20,
      })

      console.log('[useNews] Received', response.docs.length, 'news items')

      if (response.docs.length > 0) {
        console.log('[useNews] Topics in response:', response.docs.map((d) => d.topic).join(', '))
      }

      // Transform Payload response to app NewsItem format
      const transformedNews: NewsItem[] = response.docs.map((item: PayloadNewsItem) => {
        // Handle image - it can be a populated object or just an ID string
        let imageUrl: string | undefined
        if (item.image) {
          if (typeof item.image === 'string') {
            // Just an ID, skip it
            imageUrl = undefined
          } else if (item.image.url) {
            // Populated object with URL
            imageUrl = `${process.env.EXPO_PUBLIC_API_URL}${item.image.url}`
          }
        }

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          date: new Date(item.publishedAt).toLocaleDateString(
            i18n.language === 'bg' ? 'bg-BG' : 'en-US',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }
          ),
          topic: item.topic,
          image: imageUrl,
          location: item.location,
        }
      })

      setNews(transformedNews)
    } catch (err) {
      console.error('Error loading news:', err)
      setError(err instanceof Error ? err.message : 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }, [topic, i18n.language])

  useEffect(() => {
    loadNews()
  }, [loadNews])

  return {
    news,
    loading,
    error,
    refresh: loadNews,
  }
}
