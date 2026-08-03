import {useState, useCallback, useEffect} from 'react'
import {
  fetchMissionsFeed,
  fetchMissionById,
  claimMission as apiClaimMission,
  submitMissionTask as apiSubmitMissionTask,
  submitMissionOverallPhotos as apiSubmitMissionOverallPhotos,
  submitMissionForReview as apiSubmitMissionForReview,
  submitMissionVerification as apiSubmitMissionVerification,
} from '@/lib/payload'
import type {Mission} from '@/types/mission'
import {useAuth} from '@/contexts/AuthContext'

/**
 * Hook for the citizen-facing Missions quest board: loads the feed and wraps
 * all mutating actions (claim / submit-task / submit-photos / submit-for-review).
 */
export function useMissions() {
  const {token, refreshUser} = useAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [completedMissionsCount, setCompletedMissionsCount] = useState(0)
  const [contributorLevel, setContributorLevel] = useState<'beginner' | 'contributor' | 'guardian'>(
    'beginner'
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token) {
      setMissions([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const feed = await fetchMissionsFeed(token)
      setMissions(feed.missions)
      setCompletedMissionsCount(feed.completedMissionsCount)
      setContributorLevel(feed.contributorLevel)
    } catch (err) {
      console.error('[useMissions] Failed to load feed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load missions')
    } finally {
      setLoading(false)
    }
  }, [token])

  const claim = useCallback(
    async (missionId: string) => {
      if (!token) throw new Error('Not authenticated')
      const updated = await apiClaimMission(missionId, token)
      await refresh()
      return updated
    },
    [token, refresh]
  )

  const submitTask = useCallback(
    async (
      missionId: string,
      taskId: string,
      photos: {
        before?: {uri: string; type: string; name: string}
        after?: {uri: string; type: string; name: string}
      }
    ) => {
      if (!token) throw new Error('Not authenticated')
      return apiSubmitMissionTask(missionId, taskId, photos, token)
    },
    [token]
  )

  const submitOverallPhotos = useCallback(
    async (
      missionId: string,
      photos: {
        before?: {uri: string; type: string; name: string}[]
        after?: {uri: string; type: string; name: string}[]
      }
    ) => {
      if (!token) throw new Error('Not authenticated')
      return apiSubmitMissionOverallPhotos(missionId, photos, token)
    },
    [token]
  )

  const submitForReview = useCallback(
    async (missionId: string) => {
      if (!token) throw new Error('Not authenticated')
      const updated = await apiSubmitMissionForReview(missionId, token)
      await refresh()
      return updated
    },
    [token, refresh]
  )

  const submitVerification = useCallback(
    async (missionId: string, decision: 'approve' | 'reject', comment?: string) => {
      if (!token) throw new Error('Not authenticated')
      await apiSubmitMissionVerification(missionId, decision, comment, token)
      await refresh()
    },
    [token, refresh]
  )

  return {
    missions,
    completedMissionsCount,
    contributorLevel,
    loading,
    error,
    refresh,
    claim,
    submitTask,
    submitOverallPhotos,
    submitForReview,
    submitVerification,
    refreshDarPoints: refreshUser,
  }
}

/**
 * Hook to load a single mission by id (mission detail/execution screen).
 */
export function useMission(id: string | undefined) {
  const {token} = useAuth()
  const [mission, setMission] = useState<Mission | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!id) {
      setMission(null)
      setError('Missing mission id')
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const doc = await fetchMissionById(id, token ?? undefined)
      setMission(doc)
    } catch (err) {
      console.error('[useMission] Failed to load mission:', err)
      setError(err instanceof Error ? err.message : 'Failed to load mission')
    } finally {
      setLoading(false)
    }
  }, [id, token])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {mission, loading, error, refresh}
}
