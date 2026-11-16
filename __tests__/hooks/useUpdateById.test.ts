import {act, renderHook, waitFor} from '@testing-library/react-native'
import {useUpdateById} from '../../hooks/useUpdateById'
import {fetchUpdateById, fetchUpdateSources} from '../../lib/updatesApi'
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
  fetchUpdateById: jest.fn(),
  fetchUpdateSources: jest.fn(),
}))

const mockFetchUpdate = fetchUpdateById as jest.Mock
const mockFetchSources = fetchUpdateSources as jest.Mock

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return {promise, resolve}
}

const makeMessage = (id: string, overrides: Partial<UpdateMessage> = {}): UpdateMessage => ({
  id,
  text: `Water outage ${id}`,
  createdAt: '2026-01-04T08:00:00Z',
  finalizedAt: '2026-01-05T12:00:00Z',
  source: 'sofiyska-voda',
  categories: ['water'],
  ...overrides,
})

const sources: UpdateSource[] = [
  {id: 'sofiyska-voda', name: 'Софийска вода', url: 'https://sofiyskavoda.bg'},
]

describe('useUpdateById', () => {
  let consoleErrorSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockLanguage = 'en'
    mockFetchSources.mockResolvedValue(sources)
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  it('does nothing without an id', async () => {
    const {result} = await renderHook(() => useUpdateById(undefined))

    expect(mockFetchUpdate).not.toHaveBeenCalled()
    expect(result.current).toMatchObject({newsItem: null, loading: false, error: null})
  })

  it('is loading until the update arrives and maps it with its source metadata', async () => {
    const request = deferred<UpdateMessage>()
    mockFetchUpdate.mockReturnValueOnce(request.promise)
    const {result} = await renderHook(() => useUpdateById('u-1'))
    expect(result.current.loading).toBe(true)

    await act(async () => request.resolve(makeMessage('u-1')))

    expect(mockFetchUpdate).toHaveBeenCalledWith('u-1')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.newsItem).toMatchObject({
      id: 'u-1',
      snippet: 'Water outage u-1',
      topic: 'water',
      categories: ['water'],
      sourceId: 'sofiyska-voda',
      sourceName: 'Софийска вода',
      sourceUrl: 'https://sofiyskavoda.bg',
      date: 'January 5, 2026',
    })
  })

  it('still shows the update when the sources metadata cannot be loaded', async () => {
    mockFetchUpdate.mockResolvedValue(makeMessage('u-1'))
    mockFetchSources.mockRejectedValueOnce(new Error('sources down'))

    const {result} = await renderHook(() => useUpdateById('u-1'))

    await waitFor(() => expect(result.current.newsItem).not.toBeNull())
    expect(result.current.newsItem?.sourceName).toBe('sofiyska-voda')
    expect(result.current.error).toBeNull()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Error loading update sources metadata:',
      expect.any(Error)
    )
  })

  it('exposes the error and clears the item when the update cannot be loaded', async () => {
    mockFetchUpdate.mockResolvedValueOnce(makeMessage('u-1'))
    const {result} = await renderHook(() => useUpdateById('u-1'))
    await waitFor(() => expect(result.current.newsItem).not.toBeNull())

    mockFetchUpdate.mockRejectedValueOnce(new Error('Failed to fetch update: 404 Not Found'))
    await act(() => result.current.refresh())

    expect(result.current.error).toBe('Failed to fetch update: 404 Not Found')
    expect(result.current.newsItem).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('uses a generic message for non-Error failures', async () => {
    mockFetchUpdate.mockRejectedValueOnce('boom')

    const {result} = await renderHook(() => useUpdateById('u-1'))

    await waitFor(() => expect(result.current.error).toBe('Failed to load update'))
  })

  it('reloads and re-localizes when the language changes', async () => {
    mockFetchUpdate.mockResolvedValue(makeMessage('u-1'))
    const {result, rerender} = await renderHook(() => useUpdateById('u-1'))
    await waitFor(() => expect(result.current.newsItem?.date).toBe('January 5, 2026'))

    mockLanguage = 'bg'
    await rerender({})

    const expected = new Date('2026-01-05T12:00:00Z').toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    await waitFor(() => expect(result.current.newsItem?.date).toBe(expected))
    expect(mockFetchUpdate).toHaveBeenCalledTimes(2)
  })

  it('loads the new update when the id changes', async () => {
    mockFetchUpdate.mockImplementation(async (id: string) => makeMessage(id))
    const {result, rerender} = await renderHook(({id}: {id: string}) => useUpdateById(id), {
      initialProps: {id: 'u-1'},
    })

    await rerender({id: 'u-2'})

    await waitFor(() => expect(result.current.newsItem?.id).toBe('u-2'))
  })

  // BUG: requests are never cancelled, so a slow response for the previous id
  // replaces the update that belongs to the current id.
  it.failing('keeps the latest update when an older request resolves last', async () => {
    const first = deferred<UpdateMessage>()
    const second = deferred<UpdateMessage>()
    mockFetchUpdate.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const {result, rerender} = await renderHook(({id}: {id: string}) => useUpdateById(id), {
      initialProps: {id: 'u-1'},
    })

    await rerender({id: 'u-2'})
    await act(async () => second.resolve(makeMessage('u-2')))
    await act(async () => first.resolve(makeMessage('u-1')))

    expect(result.current.newsItem?.id).toBe('u-2')
  })
})
