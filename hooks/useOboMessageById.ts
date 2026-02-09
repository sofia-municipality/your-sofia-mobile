import {useQuery} from '@tanstack/react-query'
import {fetchOboMessageById} from '@/lib/oboapp'
import type {OboMessage} from '@/lib/oboapp'

export function useOboMessageById(id?: string) {
  const {
    data: message = null,
    isLoading,
    error,
    refetch,
  } = useQuery<OboMessage | null>({
    queryKey: ['obo-message', id],
    queryFn: () => (id ? fetchOboMessageById(id) : Promise.resolve(null)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })

  return {
    message,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refresh: refetch,
  }
}
