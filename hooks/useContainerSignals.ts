import {useState, useEffect, useCallback} from 'react'
import {fetchSignals} from '../lib/payload'

/**
 * Hook to fetch signal counts for a container reference id (publicNumber).
 * If `initialTotal` and `initialActive` are provided (e.g. from the map viewport
 * fetch which already includes these counts), the fetch is skipped entirely.
 */
export function useContainerSignals(
  containerReferenceId?: string,
  initialCounts?: {initialTotal?: number; initialActive?: number}
) {
  const hasInitialCounts =
    initialCounts?.initialTotal !== undefined && initialCounts?.initialActive !== undefined
  const [total, setTotal] = useState<number | null>(initialCounts?.initialTotal ?? null)
  const [active, setActive] = useState<number>(initialCounts?.initialActive ?? 0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!containerReferenceId) {
      setTotal(0)
      setActive(0)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetchSignals({
        containerReferenceId,
        limit: 1000,
      })

      setTotal(response.totalDocs ?? (response.docs ? response.docs.length : 0))
      const activeCount = (response.docs || []).filter(
        (s) => s.status !== 'resolved' && s.status !== 'rejected'
      ).length
      setActive(activeCount)
    } catch (err) {
      console.error('Error loading container signals:', err)
      setError(err instanceof Error ? err.message : 'Failed to load signals')
      setTotal(0)
      setActive(0)
    } finally {
      setLoading(false)
    }
  }, [containerReferenceId])

  useEffect(() => {
    if (hasInitialCounts) return
    load()
  }, [load, hasInitialCounts])

  return {
    total,
    active,
    loading,
    error,
    refresh: load,
  }
}
