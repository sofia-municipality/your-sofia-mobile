import {act, renderHook, waitFor} from '@testing-library/react-native'
import {useWasteContainers} from '../../hooks/useWasteContainers'
import {fetchWasteContainers} from '../../lib/payload'
import type {WasteContainer} from '../../types/wasteContainer'

jest.mock('../../lib/payload', () => ({
  fetchWasteContainers: jest.fn(),
}))

const mockFetch = fetchWasteContainers as jest.Mock

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return {promise, resolve}
}

const makeContainer = (id: string, status: WasteContainer['status'] = 'active') =>
  ({id, publicNumber: `WC-${id}`, status}) as WasteContainer

const page = (docs: WasteContainer[]) => ({docs})

describe('useWasteContainers', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('starts loading and then exposes the fetched containers', async () => {
    const request = deferred<{docs: WasteContainer[]}>()
    mockFetch.mockReturnValueOnce(request.promise)

    const {result} = await renderHook(() => useWasteContainers())
    expect(result.current.loading).toBe(true)
    expect(result.current.containers).toEqual([])

    await act(async () => request.resolve(page([makeContainer('1')])))

    expect(result.current.loading).toBe(false)
    expect(result.current.containers).toEqual([makeContainer('1')])
    expect(result.current.error).toBeNull()
  })

  it('requests all containers (high limit) with the given filters', async () => {
    mockFetch.mockResolvedValue(page([]))

    await renderHook(() => useWasteContainers({status: 'full', wasteType: 'glass'}))

    expect(mockFetch).toHaveBeenCalledWith({status: 'full', wasteType: 'glass', limit: 3000})
  })

  it('exposes the error message when loading fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Server down'))

    const {result} = await renderHook(() => useWasteContainers())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Server down')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading waste containers:',
      expect.any(Error)
    )
  })

  it('uses a generic message for non-Error failures', async () => {
    mockFetch.mockRejectedValueOnce('boom')

    const {result} = await renderHook(() => useWasteContainers())

    await waitFor(() => expect(result.current.error).toBe('Failed to load waste containers'))
  })

  it('clears the error when a refresh succeeds', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Server down'))
    const {result} = await renderHook(() => useWasteContainers())
    await waitFor(() => expect(result.current.error).toBe('Server down'))

    mockFetch.mockResolvedValueOnce(page([makeContainer('2')]))
    await act(() => result.current.refresh())

    expect(result.current.error).toBeNull()
    expect(result.current.containers).toEqual([makeContainer('2')])
  })

  it('refetches when a filter changes', async () => {
    mockFetch.mockResolvedValue(page([]))
    const {rerender} = await renderHook(
      ({status}: {status: 'active' | 'full'}) => useWasteContainers({status}),
      {initialProps: {status: 'active'}}
    )

    await rerender({status: 'full'})

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenLastCalledWith({status: 'full', limit: 3000})
  })

  it('does not refetch when re-rendered with an equal options object', async () => {
    mockFetch.mockResolvedValue(page([]))
    const {rerender} = await renderHook(
      ({status}: {status: 'active' | 'full'}) => useWasteContainers({status}),
      {initialProps: {status: 'active'}}
    )

    await rerender({status: 'active'})

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('lets callers update the containers locally', async () => {
    mockFetch.mockResolvedValue(page([makeContainer('1')]))
    const {result} = await renderHook(() => useWasteContainers())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(() => result.current.setContainers([makeContainer('1', 'full')]))

    expect(result.current.containers[0].status).toBe('full')
  })

  // BUG: requests are never cancelled, so a slow response for an old filter
  // overwrites the result for the current filter.
  it.failing(
    'keeps the containers of the latest filter when an older request resolves last',
    async () => {
      const activeRequest = deferred<{docs: WasteContainer[]}>()
      const fullRequest = deferred<{docs: WasteContainer[]}>()
      mockFetch.mockReturnValueOnce(activeRequest.promise).mockReturnValueOnce(fullRequest.promise)
      const {result, rerender} = await renderHook(
        ({status}: {status: 'active' | 'full'}) => useWasteContainers({status}),
        {initialProps: {status: 'active'}}
      )

      await rerender({status: 'full'})
      await act(async () => fullRequest.resolve(page([makeContainer('full-1', 'full')])))
      await act(async () => activeRequest.resolve(page([makeContainer('active-1', 'active')])))

      expect(result.current.containers).toEqual([makeContainer('full-1', 'full')])
    }
  )
})
