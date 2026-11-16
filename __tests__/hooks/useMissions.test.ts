import {act, renderHook, waitFor} from '@testing-library/react-native'
import {useMission, useMissions} from '../../hooks/useMissions'
import * as payload from '../../lib/payload'
import type {Mission} from '../../types/mission'

jest.mock('../../lib/payload', () => ({
  fetchMissionsFeed: jest.fn(),
  fetchMissionById: jest.fn(),
  claimMission: jest.fn(),
  submitMissionTask: jest.fn(),
  submitMissionOverallPhotos: jest.fn(),
  submitMissionForReview: jest.fn(),
  submitMissionVerification: jest.fn(),
}))

const mockRefreshUser = jest.fn()
let mockToken: string | null = 'jwt-1'

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({token: mockToken, refreshUser: mockRefreshUser}),
}))

const api = payload as jest.Mocked<typeof payload>

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return {promise, resolve}
}

const makeMission = (id: string, overrides: Partial<Mission> = {}) =>
  ({id, title: `Mission ${id}`, status: 'open', ...overrides}) as Mission

const feed = {
  missions: [makeMission('m-1'), makeMission('m-2')],
  completedMissionsCount: 4,
  contributorLevel: 'contributor' as const,
}

const photo = {uri: 'file:///p.jpg', type: 'image/jpeg', name: 'p.jpg'}

describe('useMissions', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockToken = 'jwt-1'
    api.fetchMissionsFeed.mockResolvedValue(feed)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  describe('refresh', () => {
    it('waits for an explicit refresh before loading the feed', async () => {
      const {result} = await renderHook(() => useMissions())

      expect(api.fetchMissionsFeed).not.toHaveBeenCalled()
      expect(result.current).toMatchObject({
        missions: [],
        completedMissionsCount: 0,
        contributorLevel: 'beginner',
        loading: true,
      })
    })

    it('loads the feed with the session token', async () => {
      const {result} = await renderHook(() => useMissions())

      await act(() => result.current.refresh())

      expect(api.fetchMissionsFeed).toHaveBeenCalledWith('jwt-1')
      expect(result.current).toMatchObject({
        missions: feed.missions,
        completedMissionsCount: 4,
        contributorLevel: 'contributor',
        loading: false,
        error: null,
      })
    })

    it('shows no missions and stops loading when signed out', async () => {
      mockToken = null
      const {result} = await renderHook(() => useMissions())

      await act(() => result.current.refresh())

      expect(api.fetchMissionsFeed).not.toHaveBeenCalled()
      expect(result.current.missions).toEqual([])
      expect(result.current.loading).toBe(false)
    })

    it('exposes the error message when the feed fails to load', async () => {
      api.fetchMissionsFeed.mockRejectedValueOnce(new Error('Forbidden'))
      const {result} = await renderHook(() => useMissions())

      await act(() => result.current.refresh())

      expect(result.current.error).toBe('Forbidden')
      expect(result.current.loading).toBe(false)
    })

    it('uses a generic message for non-Error failures and clears it on success', async () => {
      api.fetchMissionsFeed.mockRejectedValueOnce('boom')
      const {result} = await renderHook(() => useMissions())

      await act(() => result.current.refresh())
      expect(result.current.error).toBe('Failed to load missions')

      await act(() => result.current.refresh())
      expect(result.current.error).toBeNull()
    })
  })

  describe('actions', () => {
    it('claims a mission, reloads the feed and returns the updated mission', async () => {
      const claimed = makeMission('m-1', {status: 'in_progress'})
      api.claimMission.mockResolvedValueOnce(claimed)
      const {result} = await renderHook(() => useMissions())

      let returned: Mission | undefined
      await act(async () => {
        returned = await result.current.claim('m-1')
      })

      expect(api.claimMission).toHaveBeenCalledWith('m-1', 'jwt-1')
      expect(api.fetchMissionsFeed).toHaveBeenCalledTimes(1)
      expect(returned).toBe(claimed)
    })

    it('submits task photos without reloading the feed', async () => {
      api.submitMissionTask.mockResolvedValueOnce({ok: true} as never)
      const {result} = await renderHook(() => useMissions())

      await act(async () => {
        await result.current.submitTask('m-1', 't-1', {before: photo, after: photo})
      })

      expect(api.submitMissionTask).toHaveBeenCalledWith(
        'm-1',
        't-1',
        {before: photo, after: photo},
        'jwt-1'
      )
      expect(api.fetchMissionsFeed).not.toHaveBeenCalled()
    })

    it('submits overall mission photos', async () => {
      const {result} = await renderHook(() => useMissions())

      await act(async () => {
        await result.current.submitOverallPhotos('m-1', {before: [photo]})
      })

      expect(api.submitMissionOverallPhotos).toHaveBeenCalledWith('m-1', {before: [photo]}, 'jwt-1')
    })

    it('submits a mission for review and reloads the feed', async () => {
      const submitted = makeMission('m-1', {status: 'ready_for_review'})
      api.submitMissionForReview.mockResolvedValueOnce(submitted)
      const {result} = await renderHook(() => useMissions())

      let returned: Mission | undefined
      await act(async () => {
        returned = await result.current.submitForReview('m-1')
      })

      expect(api.submitMissionForReview).toHaveBeenCalledWith('m-1', 'jwt-1')
      expect(api.fetchMissionsFeed).toHaveBeenCalledTimes(1)
      expect(returned).toBe(submitted)
    })

    it('submits a peer verification and reloads the feed', async () => {
      const {result} = await renderHook(() => useMissions())

      await act(() => result.current.submitVerification('m-1', 'reject', 'Photo is blurry'))

      expect(api.submitMissionVerification).toHaveBeenCalledWith(
        'm-1',
        'reject',
        'Photo is blurry',
        'jwt-1'
      )
      expect(api.fetchMissionsFeed).toHaveBeenCalledTimes(1)
    })

    it('does not reload the feed when claiming fails', async () => {
      api.claimMission.mockRejectedValueOnce(new Error('Already claimed'))
      const {result} = await renderHook(() => useMissions())

      await expect(act(() => result.current.claim('m-1'))).rejects.toThrow('Already claimed')
      expect(api.fetchMissionsFeed).not.toHaveBeenCalled()
    })

    it.each([
      ['claim', (m: ReturnType<typeof useMissions>) => m.claim('m-1'), 'claimMission'],
      [
        'submitTask',
        (m: ReturnType<typeof useMissions>) => m.submitTask('m-1', 't-1', {}),
        'submitMissionTask',
      ],
      [
        'submitOverallPhotos',
        (m: ReturnType<typeof useMissions>) => m.submitOverallPhotos('m-1', {}),
        'submitMissionOverallPhotos',
      ],
      [
        'submitForReview',
        (m: ReturnType<typeof useMissions>) => m.submitForReview('m-1'),
        'submitMissionForReview',
      ],
      [
        'submitVerification',
        (m: ReturnType<typeof useMissions>) => m.submitVerification('m-1', 'approve'),
        'submitMissionVerification',
      ],
    ] as const)('%s rejects when signed out', async (_name, action, apiName) => {
      mockToken = null
      const {result} = await renderHook(() => useMissions())

      await expect(action(result.current)).rejects.toThrow('Not authenticated')
      expect(api[apiName]).not.toHaveBeenCalled()
    })
  })

  it('exposes refreshUser as refreshDarPoints', async () => {
    const {result} = await renderHook(() => useMissions())

    expect(result.current.refreshDarPoints).toBe(mockRefreshUser)
  })
})

describe('useMission', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockToken = 'jwt-1'
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('reports a missing id without fetching', async () => {
    const {result} = await renderHook(() => useMission(undefined))

    expect(api.fetchMissionById).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({
      mission: null,
      loading: false,
      error: 'Missing mission id',
    })
  })

  it('is loading until the mission arrives', async () => {
    const request = deferred<Mission>()
    api.fetchMissionById.mockReturnValueOnce(request.promise)
    const {result} = await renderHook(() => useMission('m-1'))
    expect(result.current.loading).toBe(true)

    await act(async () => request.resolve(makeMission('m-1')))

    expect(api.fetchMissionById).toHaveBeenCalledWith('m-1', 'jwt-1')
    expect(result.current).toMatchObject({mission: makeMission('m-1'), loading: false, error: null})
  })

  it('fetches anonymously when signed out', async () => {
    mockToken = null
    api.fetchMissionById.mockResolvedValue(makeMission('m-1'))

    await renderHook(() => useMission('m-1'))

    expect(api.fetchMissionById).toHaveBeenCalledWith('m-1', undefined)
  })

  it('exposes the error message when loading fails', async () => {
    api.fetchMissionById.mockRejectedValueOnce(new Error('Not Found'))

    const {result} = await renderHook(() => useMission('m-1'))

    await waitFor(() => expect(result.current.error).toBe('Not Found'))
    expect(result.current.loading).toBe(false)
  })

  it('uses a generic message for non-Error failures', async () => {
    api.fetchMissionById.mockRejectedValueOnce('boom')

    const {result} = await renderHook(() => useMission('m-1'))

    await waitFor(() => expect(result.current.error).toBe('Failed to load mission'))
  })

  it('reloads on refresh', async () => {
    api.fetchMissionById.mockResolvedValueOnce(makeMission('m-1'))
    const {result} = await renderHook(() => useMission('m-1'))
    await waitFor(() => expect(result.current.mission).not.toBeNull())

    api.fetchMissionById.mockResolvedValueOnce(makeMission('m-1', {status: 'completed'}))
    await act(() => result.current.refresh())

    expect(result.current.mission?.status).toBe('completed')
  })

  // BUG: requests are never cancelled, so a slow response for the previous id
  // replaces the mission that belongs to the current id.
  it.failing('keeps the latest mission when an older request resolves last', async () => {
    const first = deferred<Mission>()
    const second = deferred<Mission>()
    api.fetchMissionById.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const {result, rerender} = await renderHook(({id}: {id: string}) => useMission(id), {
      initialProps: {id: 'm-1'},
    })

    await rerender({id: 'm-2'})
    await act(async () => second.resolve(makeMission('m-2')))
    await act(async () => first.resolve(makeMission('m-1')))

    expect(result.current.mission?.id).toBe('m-2')
  })
})
