import {act, renderHook, waitFor} from '@testing-library/react-native'
import {useNews} from '../../hooks/useNews'
import {fetchNews, type PayloadNewsItem} from '../../lib/payload'

let mockLanguage = 'en'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({i18n: {language: mockLanguage}}),
}))

jest.mock('../../lib/payload', () => ({
  fetchNews: jest.fn(),
}))

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const mockFetchNews = fetchNews as jest.Mock

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return {promise, resolve}
}

const makeItem = (overrides: Partial<PayloadNewsItem> = {}) =>
  ({
    id: 'n-1',
    title: 'Street closure',
    description: 'Vitosha blvd closed',
    topic: 'street-closure',
    publishedAt: '2026-01-05T12:00:00Z',
    location: {latitude: 42.69, longitude: 23.32},
    ...overrides,
  }) as PayloadNewsItem

describe('useNews', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockLanguage = 'en'
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('request', () => {
    it('requests 20 items in the current language', async () => {
      mockFetchNews.mockResolvedValue({docs: []})

      await renderHook(() => useNews('alerts'))

      expect(mockFetchNews).toHaveBeenCalledWith({locale: 'en', topic: 'alerts', limit: 20})
    })

    it.each([
      ['"all"', 'all'],
      ['no topic', undefined],
    ])('does not filter by topic for %s', async (_label, topic) => {
      mockFetchNews.mockResolvedValue({docs: []})

      await renderHook(() => useNews(topic))

      expect(mockFetchNews).toHaveBeenCalledWith(expect.objectContaining({topic: undefined}))
    })

    it('refetches when the topic changes', async () => {
      mockFetchNews.mockResolvedValue({docs: []})
      const {rerender} = await renderHook(({topic}: {topic: string}) => useNews(topic), {
        initialProps: {topic: 'alerts'},
      })

      await rerender({topic: 'festivals'})

      expect(mockFetchNews).toHaveBeenLastCalledWith(expect.objectContaining({topic: 'festivals'}))
    })

    it('refetches when the language changes', async () => {
      mockFetchNews.mockResolvedValue({docs: []})
      const {rerender} = await renderHook(() => useNews())

      mockLanguage = 'bg'
      await rerender({})

      expect(mockFetchNews).toHaveBeenLastCalledWith(expect.objectContaining({locale: 'bg'}))
    })
  })

  describe('mapping', () => {
    it('is loading until the news arrive and maps them to news items', async () => {
      const request = deferred<{docs: PayloadNewsItem[]}>()
      mockFetchNews.mockReturnValueOnce(request.promise)
      const {result} = await renderHook(() => useNews())
      expect(result.current.loading).toBe(true)

      await act(async () => request.resolve({docs: [makeItem()]}))

      expect(result.current.loading).toBe(false)
      expect(result.current.news).toEqual([
        {
          id: 'n-1',
          title: 'Street closure',
          description: 'Vitosha blvd closed',
          date: 'January 5, 2026',
          topic: 'street-closure',
          image: undefined,
          location: {latitude: 42.69, longitude: 23.32},
        },
      ])
    })

    it('formats the date for the Bulgarian locale', async () => {
      mockLanguage = 'bg'
      mockFetchNews.mockResolvedValue({docs: [makeItem()]})

      const {result} = await renderHook(() => useNews())

      const expected = new Date('2026-01-05T12:00:00Z').toLocaleDateString('bg-BG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      await waitFor(() => expect(result.current.news[0]?.date).toBe(expected))
    })

    it('prefixes populated media URLs with the API URL', async () => {
      mockFetchNews.mockResolvedValue({
        docs: [makeItem({image: {id: 'm-1', url: '/media/closure.jpg'}})],
      })

      const {result} = await renderHook(() => useNews())

      await waitFor(() =>
        expect(result.current.news[0]?.image).toBe('https://api.test/media/closure.jpg')
      )
    })

    it.each([
      ['an unpopulated media id', 'media-id-123'],
      ['media without a URL', {id: 'm-1', url: ''}],
    ])('has no image for %s', async (_label, image) => {
      mockFetchNews.mockResolvedValue({
        docs: [makeItem({image: image as PayloadNewsItem['image']})],
      })

      const {result} = await renderHook(() => useNews())

      await waitFor(() => expect(result.current.news).toHaveLength(1))
      expect(result.current.news[0].image).toBeUndefined()
    })

    // BUG: absolute media URLs (which Payload returns when serverURL is set, see
    // getMediaUrl in lib/payload) get the API URL prepended a second time.
    it.failing('uses absolute media URLs as-is', async () => {
      mockFetchNews.mockResolvedValue({
        docs: [makeItem({image: {id: 'm-1', url: 'https://cdn.test/closure.jpg'}})],
      })

      const {result} = await renderHook(() => useNews())

      await waitFor(() => expect(result.current.news).toHaveLength(1))
      expect(result.current.news[0].image).toBe('https://cdn.test/closure.jpg')
    })
  })

  describe('errors', () => {
    it('exposes the error message and keeps the previous news', async () => {
      mockFetchNews.mockResolvedValueOnce({docs: [makeItem()]})
      const {result} = await renderHook(() => useNews())
      await waitFor(() => expect(result.current.news).toHaveLength(1))

      mockFetchNews.mockRejectedValueOnce(new Error('Failed to fetch news: Bad Gateway'))
      await act(() => result.current.refresh())

      expect(result.current.error).toBe('Failed to fetch news: Bad Gateway')
      expect(result.current.news).toHaveLength(1)
      expect(result.current.loading).toBe(false)
    })

    it('uses a generic message for non-Error failures', async () => {
      mockFetchNews.mockRejectedValueOnce('boom')

      const {result} = await renderHook(() => useNews())

      await waitFor(() => expect(result.current.error).toBe('Failed to load news'))
    })

    it('clears the error when a refresh succeeds', async () => {
      mockFetchNews.mockRejectedValueOnce(new Error('offline'))
      const {result} = await renderHook(() => useNews())
      await waitFor(() => expect(result.current.error).toBe('offline'))

      mockFetchNews.mockResolvedValueOnce({docs: []})
      await act(() => result.current.refresh())

      expect(result.current.error).toBeNull()
    })
  })
})
