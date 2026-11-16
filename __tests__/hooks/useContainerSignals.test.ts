import {act, renderHook, waitFor} from '@testing-library/react-native'
import {useContainerSignals} from '../../hooks/useContainerSignals'
import {fetchSignals} from '../../lib/payload'

jest.mock('../../lib/payload', () => ({
  fetchSignals: jest.fn(),
}))

const mockFetchSignals = fetchSignals as jest.Mock

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return {promise, resolve}
}

type SignalsResponse = {docs?: {status: string}[]; totalDocs?: number}

const signals = (...statuses: string[]) => statuses.map((status) => ({status}))

describe('useContainerSignals', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('fetches signals for the container reference id', async () => {
    mockFetchSignals.mockResolvedValue({docs: [], totalDocs: 0})

    await renderHook(() => useContainerSignals('WC-001'))

    expect(mockFetchSignals).toHaveBeenCalledWith({containerReferenceId: 'WC-001', limit: 1000})
  })

  it('reports the total and counts every non-resolved, non-rejected signal as active', async () => {
    const request = deferred<SignalsResponse>()
    mockFetchSignals.mockReturnValueOnce(request.promise)
    const {result} = await renderHook(() => useContainerSignals('WC-001'))
    expect(result.current.loading).toBe(true)

    await act(async () =>
      request.resolve({
        docs: signals('pending', 'in-progress', 'resolved', 'rejected', 'confirmed'),
        totalDocs: 12,
      })
    )

    expect(result.current).toMatchObject({total: 12, active: 3, loading: false, error: null})
  })

  it('falls back to the number of returned docs when totalDocs is missing', async () => {
    mockFetchSignals.mockResolvedValue({docs: signals('pending', 'resolved')})

    const {result} = await renderHook(() => useContainerSignals('WC-001'))

    await waitFor(() => expect(result.current.total).toBe(2))
    expect(result.current.active).toBe(1)
  })

  it('treats a response without docs as zero signals', async () => {
    mockFetchSignals.mockResolvedValue({})

    const {result} = await renderHook(() => useContainerSignals('WC-001'))

    await waitFor(() => expect(result.current.total).toBe(0))
    expect(result.current.active).toBe(0)
  })

  it('reports zero signals without fetching when there is no reference id', async () => {
    const {result} = await renderHook(() => useContainerSignals(undefined))

    expect(mockFetchSignals).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({total: 0, active: 0, loading: false})
  })

  it('resets the counts and exposes the error when loading fails', async () => {
    mockFetchSignals.mockRejectedValueOnce(new Error('Server down'))

    const {result} = await renderHook(() => useContainerSignals('WC-001'))

    await waitFor(() => expect(result.current.error).toBe('Server down'))
    expect(result.current).toMatchObject({total: 0, active: 0, loading: false})
  })

  it('uses a generic message for non-Error failures', async () => {
    mockFetchSignals.mockRejectedValueOnce('boom')

    const {result} = await renderHook(() => useContainerSignals('WC-001'))

    await waitFor(() => expect(result.current.error).toBe('Failed to load signals'))
  })

  describe('with initial counts', () => {
    it('uses the provided counts and skips the request', async () => {
      const {result} = await renderHook(() =>
        useContainerSignals('WC-001', {initialTotal: 4, initialActive: 2})
      )

      expect(mockFetchSignals).not.toHaveBeenCalled()
      expect(result.current).toMatchObject({total: 4, active: 2, loading: false, error: null})
    })

    it('still fetches when only one of the counts is provided', async () => {
      mockFetchSignals.mockResolvedValue({docs: [], totalDocs: 0})

      await renderHook(() => useContainerSignals('WC-001', {initialTotal: 4}))

      expect(mockFetchSignals).toHaveBeenCalledTimes(1)
    })

    it('fetches fresh counts on refresh', async () => {
      mockFetchSignals.mockResolvedValue({docs: signals('pending'), totalDocs: 9})
      const {result} = await renderHook(() =>
        useContainerSignals('WC-001', {initialTotal: 4, initialActive: 2})
      )

      await act(() => result.current.refresh())

      expect(result.current).toMatchObject({total: 9, active: 1})
    })

    // BUG: the initial counts only seed useState, so when the hook is reused for
    // another container its new counts are ignored and the old ones are shown.
    it.failing('shows the counts of the new container when the container changes', async () => {
      const {result, rerender} = await renderHook(
        ({id, total, active}: {id: string; total: number; active: number}) =>
          useContainerSignals(id, {initialTotal: total, initialActive: active}),
        {initialProps: {id: 'WC-001', total: 4, active: 2}}
      )

      await rerender({id: 'WC-002', total: 0, active: 0})

      expect(result.current).toMatchObject({total: 0, active: 0})
    })
  })

  it('refetches when the reference id changes', async () => {
    mockFetchSignals.mockResolvedValue({docs: [], totalDocs: 0})
    const {rerender} = await renderHook(({id}: {id: string}) => useContainerSignals(id), {
      initialProps: {id: 'WC-001'},
    })

    await rerender({id: 'WC-002'})

    expect(mockFetchSignals).toHaveBeenLastCalledWith({containerReferenceId: 'WC-002', limit: 1000})
  })

  // BUG: requests are never cancelled, so a slow response for the previous
  // container overwrites the counts of the current one.
  it.failing(
    'keeps the counts of the latest container when an older request resolves last',
    async () => {
      const first = deferred<SignalsResponse>()
      const second = deferred<SignalsResponse>()
      mockFetchSignals.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
      const {result, rerender} = await renderHook(({id}: {id: string}) => useContainerSignals(id), {
        initialProps: {id: 'WC-001'},
      })

      await rerender({id: 'WC-002'})
      await act(async () => second.resolve({docs: [], totalDocs: 0}))
      await act(async () => first.resolve({docs: signals('pending'), totalDocs: 7}))

      expect(result.current.total).toBe(0)
    }
  )
})
