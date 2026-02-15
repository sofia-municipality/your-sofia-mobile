import {useMemo} from 'react'
import {useTranslation} from 'react-i18next'
import {useQuery} from '@tanstack/react-query'
import {fetchOboMessages, mapOboMessageToNewsItem} from '@/lib/oboapp'
import type {NewsItem, NewsTopicType} from '@/types/news'
import {useOboSources} from '@/hooks/useOboSources'

/**
 * Hook to fetch news from OboApp (recent list)
 */
export function useNews(topic?: NewsTopicType) {
  const {i18n} = useTranslation()
  const {sourcesMap} = useOboSources()

  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['obo-messages', {topic: topic ?? 'all', locale: i18n.language}],
    queryFn: () =>
      fetchOboMessages({
        categories: topic && topic !== 'all' ? [topic] : undefined,
      }),
    staleTime: 60 * 1000,
  })

  const news = useMemo<NewsItem[]>(
    () =>
      messages
        .map((message) => mapOboMessageToNewsItem(message, i18n.language, sourcesMap))
        .slice(0, 6),
    [messages, i18n.language, sourcesMap]
  )

  return {
    news,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  }
}
