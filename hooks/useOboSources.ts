import {useMemo} from 'react'
import {useQuery} from '@tanstack/react-query'
import {fetchOboSources, type OboSource} from '@/lib/oboapp'

export function useOboSources() {
  const {
    data: sources = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['obo-sources'],
    queryFn: fetchOboSources,
    staleTime: 30 * 60 * 1000,
  })

  const sourcesMap = useMemo(
    () =>
      sources.reduce<Record<string, OboSource>>((acc, source) => {
        acc[source.id] = source
        return acc
      }, {}),
    [sources]
  )

  return {
    sources,
    sourcesMap,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  }
}
