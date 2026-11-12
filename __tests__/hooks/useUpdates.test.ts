import {act, renderHook, waitFor} from '@testing-library/react-native'
import {useUpdates} from '../../hooks/useUpdates'
import {fetchNewsUpdates, fetchUpdateSources} from '../../lib/updatesApi'
import type {MapBounds} from '../../lib/mapBounds'
import type {UpdateMessage, UpdateSource} from '../../lib/updatesSchema'

let mockLanguage = 'en'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({i18n: {language: mockLanguage}}),
}))

// The real mapping imports the i18n singleton (via stringUtils); stub it.
jest.mock('../../i18n', () => ({
  __esModule: true,
  default: {t: (key: string) => key},
}))

// Keep the real message -> NewsItem mapping; only the network calls are mocked.
jest.mock('../../lib/updatesApi', () => ({
  ...jest.requireActual('../../lib/updatesApi'),
  fetchNewsUpdates: jest.fn(),
  fetchUpdateSources: jest.fn(),
}))

const mockFetchUpdates = fetchNewsUpdates as jest.Mock
const mockFetchSources = fetchUpdateSources as jest.Mock

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return {promise, resolve, reject}
}

const makeMessage = (id: string, category = 'water'): UpdateMessage => ({
  id,
  text: `Update ${id}`,
  createdAt: '2026-01-04T08:00:00Z',
  finalizedAt: '2026-01-05T12:00:00Z',
  source: 'sofiyska-voda',
  categories: [category],
})

const sources: UpdateSource[] = [{id: 'sofiyska-voda', name: 'Софийска вода'}]

const BOUNDS: MapBounds = {north: 42.78, south: 42.6, east: 23.45, west: 23.2}

type Options = Parameters<typeof useUpdates>[0]

async function renderUpdates(initialProps: Options) {
  return renderHook((props: Options) => useUpdates(props), {initialProps})
}

describe('useUpdates', () => {
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockLanguage = 'en'
    mockFetchUpdates.mockResolvedValue([makeMessage('u-1'), makeMessage('u-2')])
    mockFetchSources.mockResolvedValue(sources)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    jest.restoreAllMocks()
  })

  describe('loading', () => {
    it('requests updates with the given filters', async () => {
      await renderUpdates({
        pushToken: 'ExponentPushToken[abc]',
        categories: ['water', 'heating'],
        bounds: BOUNDS,
        zoom: 12,
        timespanEndGte: '2026-01-01T00:00:00Z',
      })

      expect(mockFetchUpdates).toHaveBeenCalledWith({
        pushToken: 'ExponentPushToken[abc]',
        categories: ['water', 'heating'],
        bounds: BOUNDS,
        zoom: 12,
        timespanEndGte: '2026-01-01T00:00:00Z',
      })
    })

    it('omits unset filters', async () => {
      await renderUpdates({})

      expect(mockFetchUpdates).toHaveBeenCalledWith({
        pushToken: undefined,
        categories: undefined,
        bounds: undefined,
        zoom: undefined,
        timespanEndGte: undefined,
      })
    })

    it('is loading until the first results arrive and maps them with source metadata', async () => {
      const request = deferred<UpdateMessage[]>()
      mockFetchUpdates.mockReturnValueOnce(request.promise)
      const {result} = await renderUpdates({})
      expect(result.current.loading).toBe(true)

      await act(async () => request.resolve([makeMessage('u-1')]))

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.news).toHaveLength(1)
      expect(result.current.news[0]).toMatchObject({
        id: 'u-1',
        topic: 'water',
        sourceName: 'Софийска вода',
        date: 'January 5, 2026',
      })
    })

    it('limits the number of results', async () => {
      const {result} = await renderUpdates({limit: 1})

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.news.map((n) => n.id)).toEqual(['u-1'])
    })

    it('still shows updates when the sources metadata cannot be loaded', async () => {
      mockFetchSources.mockRejectedValueOnce(new Error('sources down'))

      const {result} = await renderUpdates({})

      await waitFor(() => expect(result.current.news).toHaveLength(2))
      expect(result.current.news[0].sourceName).toBe('sofiyska-voda')
      expect(result.current.error).toBeNull()
    })

    it('does nothing while disabled', async () => {
      const {result} = await renderUpdates({enabled: false})

      expect(mockFetchUpdates).not.toHaveBeenCalled()
      expect(result.current.loading).toBe(false)
    })

    it('waits for map bounds when bounds are explicitly null', async () => {
      const {result, rerender} = await renderUpdates({bounds: null})
      expect(mockFetchUpdates).not.toHaveBeenCalled()
      expect(result.current.loading).toBe(false)

      await rerender({bounds: BOUNDS})

      expect(mockFetchUpdates).toHaveBeenCalledWith(expect.objectContaining({bounds: BOUNDS}))
    })

    it('keeps showing the current results without a blocking spinner while reloading', async () => {
      const {result, rerender} = await renderUpdates({categories: ['water']})
      await waitFor(() => expect(result.current.news).toHaveLength(2))

      const request = deferred<UpdateMessage[]>()
      mockFetchUpdates.mockReturnValueOnce(request.promise)
      await rerender({categories: ['heating']})

      expect(result.current.loading).toBe(false)
      expect(result.current.news).toHaveLength(2)

      await act(async () => request.resolve([makeMessage('h-1', 'heating')]))
      expect(result.current.news.map((n) => n.id)).toEqual(['h-1'])
    })
  })

  describe('reloading', () => {
    it('refetches when the categories change', async () => {
      const {rerender} = await renderUpdates({categories: ['water']})

      await rerender({categories: ['heating']})

      expect(mockFetchUpdates).toHaveBeenLastCalledWith(
        expect.objectContaining({categories: ['heating']})
      )
    })

    it('does not refetch for an equal set of options', async () => {
      const {result, rerender} = await renderUpdates({categories: ['water']})
      await waitFor(() => expect(result.current.loading).toBe(false))

      await rerender({categories: ['water']})

      expect(mockFetchUpdates).toHaveBeenCalledTimes(1)
    })

    it('refetches and re-localizes when the language changes', async () => {
      const {result, rerender} = await renderUpdates({})
      await waitFor(() => expect(result.current.news).toHaveLength(2))

      mockLanguage = 'bg'
      await rerender({})

      const expected = new Date('2026-01-05T12:00:00Z').toLocaleDateString('bg-BG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      await waitFor(() => expect(result.current.news[0].date).toBe(expected))
      expect(mockFetchUpdates).toHaveBeenCalledTimes(2)
    })

    it('refetches the same filters on refresh', async () => {
      const {result} = await renderUpdates({})
      await waitFor(() => expect(result.current.loading).toBe(false))

      mockFetchUpdates.mockResolvedValueOnce([makeMessage('u-3')])
      await act(() => result.current.refresh())

      expect(mockFetchUpdates).toHaveBeenCalledTimes(2)
      expect(result.current.news.map((n) => n.id)).toEqual(['u-3'])
    })
  })

  describe('errors', () => {
    it('exposes the error message', async () => {
      mockFetchUpdates.mockRejectedValueOnce(new Error('Updates API down'))

      const {result} = await renderUpdates({})

      await waitFor(() => expect(result.current.error).toBe('Updates API down'))
      expect(result.current.loading).toBe(false)
    })

    it('uses a generic message for non-Error failures', async () => {
      mockFetchUpdates.mockRejectedValueOnce('boom')

      const {result} = await renderUpdates({})

      await waitFor(() => expect(result.current.error).toBe('Failed to load updates'))
    })

    it('does not retry the same request automatically right after a failure', async () => {
      mockFetchUpdates.mockRejectedValue(new Error('Updates API down'))

      const {result} = await renderUpdates({bounds: BOUNDS})
      await waitFor(() => expect(result.current.error).toBe('Updates API down'))
      await act(async () => {})

      expect(mockFetchUpdates).toHaveBeenCalledTimes(1)
    })

    it('retries the same failed request only after the 15s cooldown', async () => {
      const start = Date.now()
      const now = jest.spyOn(Date, 'now').mockReturnValue(start)
      mockFetchUpdates.mockRejectedValueOnce(new Error('Updates API down'))
      const {result, rerender} = await renderUpdates({limit: 10})
      await waitFor(() => expect(result.current.error).toBe('Updates API down'))

      // `limit` re-runs the effect without changing the request key.
      now.mockReturnValue(start + 5_000)
      await rerender({limit: 20})
      expect(mockFetchUpdates).toHaveBeenCalledTimes(1)

      now.mockReturnValue(start + 16_000)
      await rerender({limit: 30})
      await waitFor(() => expect(result.current.error).toBeNull())
      expect(mockFetchUpdates).toHaveBeenCalledTimes(2)
    })

    it('retries immediately on an explicit refresh and clears the error', async () => {
      mockFetchUpdates.mockRejectedValueOnce(new Error('Updates API down'))
      const {result} = await renderUpdates({})
      await waitFor(() => expect(result.current.error).toBe('Updates API down'))

      await act(() => result.current.refresh())

      expect(result.current.error).toBeNull()
      expect(result.current.news).toHaveLength(2)
    })
  })

  // BUG: when the filters change while a request is in flight, nothing discards
  // the older response, so it can replace the results for the current filters
  // (e.g. quickly switching category chips on Home, or panning the map).
  it.failing(
    'shows the results for the latest filters when an older request resolves last',
    async () => {
      const waterRequest = deferred<UpdateMessage[]>()
      const heatingRequest = deferred<UpdateMessage[]>()
      mockFetchUpdates
        .mockReturnValueOnce(waterRequest.promise)
        .mockReturnValueOnce(heatingRequest.promise)
      const {result, rerender} = await renderUpdates({categories: ['water'], bounds: BOUNDS})

      await rerender({categories: ['heating'], bounds: BOUNDS})
      await act(async () => heatingRequest.resolve([makeMessage('h-1', 'heating')]))
      await act(async () => waterRequest.resolve([makeMessage('w-1', 'water')]))

      expect(result.current.news.map((n) => n.id)).toEqual(['h-1'])
    }
  )
})
