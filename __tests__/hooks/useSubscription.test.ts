import {renderHook, act, waitFor} from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {useSubscription} from '../../hooks/useSubscription'
import * as payload from '../../lib/payload'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// @react-native-async-storage/async-storage is mapped to its jest mock via
// moduleNameMapper in package.json — no jest.mock() needed here.

jest.mock('../../lib/payload', () => ({
  fetchMySubscription: jest.fn(),
  updateSubscription: jest.fn(),
}))

const mockFetch = payload.fetchMySubscription as jest.Mock
const mockUpdate = payload.updateSubscription as jest.Mock

const PUSH_TOKEN = 'ExponentPushToken[test123]'
const SUB_ID = 'sub-1'

const makeSub = (overrides = {}) => ({
  id: SUB_ID,
  pushToken: {id: 'pt-1', token: PUSH_TOKEN},
  user: null,
  categories: [],
  locationFilters: [],
  updatedAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const setToken = (token: string | null) => AsyncStorage.setItem('pushToken', token as string)

const setSubscriptionId = (id: string | null) =>
  id ? AsyncStorage.setItem('subscriptionId', id) : AsyncStorage.removeItem('subscriptionId')

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
})

describe('useSubscription — load()', () => {
  it('sets subscription to null and finishes loading when no push token', async () => {
    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.subscription).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('loads and caches subscription when token and sub exist', async () => {
    await setToken(PUSH_TOKEN)
    const sub = makeSub()
    mockFetch.mockResolvedValue(sub)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.subscription).toEqual(sub)
    const cached = await AsyncStorage.getItem('subscriptionId')
    expect(cached).toBe(SUB_ID)
  })

  it('sets subscription to null when token exists but no sub on server', async () => {
    await setToken(PUSH_TOKEN)
    mockFetch.mockResolvedValue(null)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.subscription).toBeNull()
  })

  it('sets error when fetch throws', async () => {
    await setToken(PUSH_TOKEN)
    mockFetch.mockRejectedValue(new Error('network error'))
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    consoleSpy.mockRestore()
    expect(result.current.error).toBe('network error')
    expect(result.current.subscription).toBeNull()
  })

  it('updates cached id when it differs from server response', async () => {
    await setToken(PUSH_TOKEN)
    await AsyncStorage.setItem('subscriptionId', 'stale-id')
    const sub = makeSub({id: 'fresh-id'})
    mockFetch.mockResolvedValue(sub)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const cached = await AsyncStorage.getItem('subscriptionId')
    expect(cached).toBe('fresh-id')
  })
})

describe('useSubscription — saveSubscription()', () => {
  it('throws when no push token is registered', async () => {
    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(act(() => result.current.saveSubscription([], []))).rejects.toThrow(
      'No push token registered on this device'
    )
  })

  it('calls updateSubscription when cachedId exists in AsyncStorage', async () => {
    await setToken(PUSH_TOKEN)
    await setSubscriptionId(SUB_ID)
    mockFetch.mockResolvedValue(makeSub())
    const updated = makeSub({categories: ['cat-1']})
    mockUpdate.mockResolvedValue(updated)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(() => result.current.saveSubscription(['cat-1'], []))

    expect(mockUpdate).toHaveBeenCalledWith(
      SUB_ID,
      {categories: ['cat-1'], locationFilters: []},
      undefined,
      PUSH_TOKEN
    )
    expect(result.current.subscription).toEqual(updated)
  })

  it('calls updateSubscription when subscription is in state (no cached id)', async () => {
    await setToken(PUSH_TOKEN)
    // No subscriptionId in storage — but load will set state
    const sub = makeSub()
    mockFetch.mockResolvedValue(sub)
    const updated = makeSub({categories: ['cat-2']})
    mockUpdate.mockResolvedValue(updated)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // Clear storage after load so we only have subscription in-state
    await AsyncStorage.removeItem('subscriptionId')

    await act(() => result.current.saveSubscription(['cat-2'], []))

    expect(mockUpdate).toHaveBeenCalledWith(
      SUB_ID,
      {categories: ['cat-2'], locationFilters: []},
      undefined,
      PUSH_TOKEN
    )
  })

  it('calls updateSubscription with empty id when no cachedId and no state (server upserts via /mine)', async () => {
    await setToken(PUSH_TOKEN)
    mockFetch.mockResolvedValue(null)
    const updated = makeSub({categories: ['cat-3']})
    mockUpdate.mockResolvedValue(updated)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(() => result.current.saveSubscription(['cat-3'], []))

    expect(mockUpdate).toHaveBeenCalledWith(
      '',
      {categories: ['cat-3'], locationFilters: []},
      undefined,
      PUSH_TOKEN
    )
    const cached = await AsyncStorage.getItem('subscriptionId')
    expect(cached).toBe(SUB_ID)
  })

  it('creates a new subscription via /mine upsert when no subscription exists yet', async () => {
    await setToken(PUSH_TOKEN)
    mockFetch.mockResolvedValue(null)
    const created = makeSub({id: 'new-sub'})
    mockUpdate.mockResolvedValue(created)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(() => result.current.saveSubscription(['cat-4'], []))

    expect(mockUpdate).toHaveBeenCalledWith(
      '',
      {categories: ['cat-4'], locationFilters: []},
      undefined,
      PUSH_TOKEN
    )
    expect(result.current.subscription).toEqual(created)
    const cached = await AsyncStorage.getItem('subscriptionId')
    expect(cached).toBe('new-sub')
  })

  it('forwards authToken to updateSubscription', async () => {
    await setToken(PUSH_TOKEN)
    await setSubscriptionId(SUB_ID)
    mockFetch.mockResolvedValue(makeSub())
    mockUpdate.mockResolvedValue(makeSub())

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(() => result.current.saveSubscription([], [], 'jwt-token-abc'))

    expect(mockUpdate).toHaveBeenCalledWith(SUB_ID, expect.any(Object), 'jwt-token-abc', PUSH_TOKEN)
  })

  it('sends locationFilters in updateSubscription payload', async () => {
    await setToken(PUSH_TOKEN)
    await setSubscriptionId(SUB_ID)
    mockFetch.mockResolvedValue(makeSub())
    mockUpdate.mockResolvedValue(makeSub())

    const filters = [{filterType: 'all' as const}]

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(() => result.current.saveSubscription([], filters))

    expect(mockUpdate).toHaveBeenCalledWith(
      SUB_ID,
      {categories: [], locationFilters: filters},
      undefined,
      PUSH_TOKEN
    )
  })
})

describe('useSubscription — linkUser()', () => {
  it('does nothing when no subscription id available', async () => {
    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(() => result.current.linkUser('user-1', 'auth-token'))
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('calls updateSubscription with user id and auth token', async () => {
    await setToken(PUSH_TOKEN)
    await setSubscriptionId(SUB_ID)
    mockFetch.mockResolvedValue(makeSub())
    const linked = makeSub({user: 'user-1'})
    mockUpdate.mockResolvedValue(linked)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(() => result.current.linkUser('user-1', 'auth-token'))

    expect(mockUpdate).toHaveBeenCalledWith(SUB_ID, {user: 'user-1'}, 'auth-token')
    expect(result.current.subscription).toEqual(linked)
  })

  it('does not throw when linkUser update fails (non-fatal)', async () => {
    await setToken(PUSH_TOKEN)
    await setSubscriptionId(SUB_ID)
    mockFetch.mockResolvedValue(makeSub())
    mockUpdate.mockRejectedValue(new Error('server error'))

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(act(() => result.current.linkUser('user-1', 'auth-token'))).resolves.not.toThrow()
  })
})

describe('useSubscription — reload()', () => {
  it('re-fetches and updates subscription on reload', async () => {
    await setToken(PUSH_TOKEN)
    const sub = makeSub()
    mockFetch.mockResolvedValue(null)

    const {result} = await renderHook(() => useSubscription())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.subscription).toBeNull()

    mockFetch.mockResolvedValue(sub)
    await act(() => result.current.reload())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.subscription).toEqual(sub)
  })
})
