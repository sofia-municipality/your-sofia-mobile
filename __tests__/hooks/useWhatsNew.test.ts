import {act, renderHook, waitFor} from '@testing-library/react-native'
import {useWhatsNew} from '../../hooks/useWhatsNew'
import {fetchNews, type PayloadNewsItem} from '../../lib/payload'

let mockLanguage = 'bg'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({i18n: {language: mockLanguage}}),
}))

jest.mock('../../lib/payload', () => ({
  fetchNews: jest.fn(),
}))

const mockFetchNews = fetchNews as jest.Mock

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return {promise, resolve}
}

const makeItem = (id: string) => ({id, title: `Release ${id}`}) as PayloadNewsItem

describe('useWhatsNew', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLanguage = 'bg'
  })

  it('loads the four latest release notes in the current language', async () => {
    mockFetchNews.mockResolvedValue({docs: []})

    await renderHook(() => useWhatsNew())

    expect(mockFetchNews).toHaveBeenCalledWith({
      locale: 'bg',
      topic: 'release-notes',
      limit: 4,
      page: 1,
    })
  })

  it('is loading until the items arrive', async () => {
    const request = deferred<{docs: PayloadNewsItem[]}>()
    mockFetchNews.mockReturnValueOnce(request.promise)

    const {result} = await renderHook(() => useWhatsNew())
    expect(result.current).toEqual({items: [], loading: true, error: null})

    await act(async () => request.resolve({docs: [makeItem('1'), makeItem('2')]}))

    expect(result.current).toEqual({
      items: [makeItem('1'), makeItem('2')],
      loading: false,
      error: null,
    })
  })

  it('exposes the error message when loading fails', async () => {
    mockFetchNews.mockRejectedValueOnce(new Error('Network request failed'))

    const {result} = await renderHook(() => useWhatsNew())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Network request failed')
  })

  it('uses a generic message for non-Error failures', async () => {
    mockFetchNews.mockRejectedValueOnce('boom')

    const {result} = await renderHook(() => useWhatsNew())

    await waitFor(() => expect(result.current.error).toBe('Failed to load'))
  })

  it('reloads when the language changes', async () => {
    mockFetchNews.mockResolvedValue({docs: []})
    const {rerender} = await renderHook(() => useWhatsNew())

    mockLanguage = 'en'
    await rerender({})

    expect(mockFetchNews).toHaveBeenCalledTimes(2)
    expect(mockFetchNews).toHaveBeenLastCalledWith(expect.objectContaining({locale: 'en'}))
  })

  it('ignores the response of a request superseded by a language change', async () => {
    const bgRequest = deferred<{docs: PayloadNewsItem[]}>()
    const enRequest = deferred<{docs: PayloadNewsItem[]}>()
    mockFetchNews.mockReturnValueOnce(bgRequest.promise).mockReturnValueOnce(enRequest.promise)
    const {result, rerender} = await renderHook(() => useWhatsNew())

    mockLanguage = 'en'
    await rerender({})
    await act(async () => enRequest.resolve({docs: [makeItem('en')]}))
    await act(async () => bgRequest.resolve({docs: [makeItem('bg')]}))

    expect(result.current.items).toEqual([makeItem('en')])
    expect(result.current.loading).toBe(false)
  })

  it('does not update state after unmounting', async () => {
    const request = deferred<{docs: PayloadNewsItem[]}>()
    mockFetchNews.mockReturnValueOnce(request.promise)
    const {result, unmount} = await renderHook(() => useWhatsNew())

    await unmount()
    await act(async () => request.resolve({docs: [makeItem('late')]}))

    expect(result.current.items).toEqual([])
  })
})
