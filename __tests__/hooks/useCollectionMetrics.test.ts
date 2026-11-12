import {act, renderHook, waitFor} from '@testing-library/react-native'
import {useCollectionMetrics, type MetricsRange} from '../../hooks/useCollectionMetrics'
import {fetchCollectionMetrics, type CollectionMetrics} from '../../lib/payload'

jest.mock('../../lib/payload', () => ({
  fetchCollectionMetrics: jest.fn(),
}))

const mockFetch = fetchCollectionMetrics as jest.Mock

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return {promise, resolve}
}

const makeMetrics = (from: string) =>
  ({from, to: 'now', byDistrict: []}) as unknown as CollectionMetrics

function requestedSpanMs(callIndex = 0): number {
  const [from, to] = mockFetch.mock.calls[callIndex]
  return new Date(to).getTime() - new Date(from).getTime()
}

describe('useCollectionMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it.each([
    ['day', 1],
    ['week', 7],
    ['month', 30],
  ] as const)('requests the last %s (%i days) ending now', async (range, days) => {
    mockFetch.mockResolvedValue(makeMetrics(range))
    const before = Date.now()

    await renderHook(() => useCollectionMetrics(range))

    const [, to] = mockFetch.mock.calls[0]
    expect(new Date(to).getTime()).toBeGreaterThanOrEqual(before - 1000)
    // Local-calendar arithmetic may shift by an hour across a DST change.
    expect(Math.abs(requestedSpanMs() - days * DAY_MS)).toBeLessThanOrEqual(HOUR_MS)
  })

  it('is loading until the metrics arrive', async () => {
    const request = deferred<CollectionMetrics>()
    mockFetch.mockReturnValueOnce(request.promise)

    const {result} = await renderHook(() => useCollectionMetrics('week'))
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    const metrics = makeMetrics('week')
    await act(async () => request.resolve(metrics))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe(metrics)
    expect(result.current.error).toBeNull()
  })

  it('exposes the error message when loading fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed to fetch collection metrics: Bad Gateway'))

    const {result} = await renderHook(() => useCollectionMetrics('week'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Failed to fetch collection metrics: Bad Gateway')
  })

  it('uses a generic message for non-Error failures', async () => {
    mockFetch.mockRejectedValueOnce('boom')

    const {result} = await renderHook(() => useCollectionMetrics('week'))

    await waitFor(() => expect(result.current.error).toBe('Failed to load metrics'))
  })

  it('clears the error when a refresh succeeds', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline'))
    const {result} = await renderHook(() => useCollectionMetrics('week'))
    await waitFor(() => expect(result.current.error).toBe('offline'))

    const metrics = makeMetrics('week')
    mockFetch.mockResolvedValueOnce(metrics)
    await act(() => result.current.refresh())

    expect(result.current.error).toBeNull()
    expect(result.current.data).toBe(metrics)
  })

  it('keeps the previous data when a refresh fails', async () => {
    const metrics = makeMetrics('week')
    mockFetch.mockResolvedValueOnce(metrics)
    const {result} = await renderHook(() => useCollectionMetrics('week'))
    await waitFor(() => expect(result.current.data).toBe(metrics))

    mockFetch.mockRejectedValueOnce(new Error('offline'))
    await act(() => result.current.refresh())

    expect(result.current.data).toBe(metrics)
    expect(result.current.error).toBe('offline')
  })

  it('refetches for the new range when the range changes', async () => {
    mockFetch.mockResolvedValue(makeMetrics('any'))
    const {rerender} = await renderHook(
      ({range}: {range: MetricsRange}) => useCollectionMetrics(range),
      {initialProps: {range: 'week'}}
    )

    await rerender({range: 'day'})

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(Math.abs(requestedSpanMs(1) - DAY_MS)).toBeLessThanOrEqual(HOUR_MS)
  })

  // BUG: requests are never cancelled, so switching ranges quickly (e.g. week ->
  // day on the dashboard) can leave the slower, older range's data on screen.
  it.failing('shows the latest range when an older request resolves last', async () => {
    const weekRequest = deferred<CollectionMetrics>()
    const dayRequest = deferred<CollectionMetrics>()
    mockFetch.mockReturnValueOnce(weekRequest.promise).mockReturnValueOnce(dayRequest.promise)
    const {result, rerender} = await renderHook(
      ({range}: {range: MetricsRange}) => useCollectionMetrics(range),
      {initialProps: {range: 'week'}}
    )

    await rerender({range: 'day'})
    const dayMetrics = makeMetrics('day')
    await act(async () => dayRequest.resolve(dayMetrics))
    await act(async () => weekRequest.resolve(makeMetrics('week')))

    expect(result.current.data).toBe(dayMetrics)
  })
})
