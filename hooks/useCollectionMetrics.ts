import {useCallback, useEffect, useState} from 'react'
import {fetchCollectionMetrics, CollectionMetrics} from '../lib/payload'

export type MetricsRange = 'day' | 'week' | 'month'

function buildDates(range: MetricsRange): {from: string; to: string} {
  const now = new Date()
  const from = new Date(now)
  if (range === 'day') from.setDate(from.getDate() - 1)
  else if (range === 'week') from.setDate(from.getDate() - 7)
  else from.setDate(from.getDate() - 30)
  return {from: from.toISOString(), to: now.toISOString()}
}

interface UseCollectionMetricsResult {
  data: CollectionMetrics | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCollectionMetrics(range: MetricsRange): UseCollectionMetricsResult {
  const [data, setData] = useState<CollectionMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const {from, to} = buildDates(range)
      const result = await fetchCollectionMetrics(from, to)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    load()
  }, [load])

  return {data, loading, error, refresh: load}
}
