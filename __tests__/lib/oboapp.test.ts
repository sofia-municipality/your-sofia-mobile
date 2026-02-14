import {fetchOboMessageById, fetchOboMessages, fetchOboSources} from '../../lib/oboapp'

describe('oboapp client', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_OBOAPP_API_URL = 'https://example.com/api/ysm'
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('fetches messages with query params and validates payload', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [
          {
            id: 'm1',
            text: 'Test message',
            createdAt: '2026-02-14T10:00:00.000Z',
            locality: 'Sofia',
          },
        ],
      }),
    })

    const messages = await fetchOboMessages({
      categories: ['transport'],
      bounds: {north: 1, south: 2, east: 3, west: 4},
      zoom: 12,
    })

    expect(messages).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api/ysm/messages?north=1&south=2&east=3&west=4&zoom=12&categories=transport'
    )
  })

  it('fails fast when messages payload is invalid', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [
          {
            id: 'm1',
            text: 'Test message',
            createdAt: '2026-02-14T10:00:00.000Z',
          },
        ],
      }),
    })

    await expect(fetchOboMessages()).rejects.toThrow('invalid response payload')
  })

  it('fetches sources and validates payload', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        sources: [
          {
            id: 's1',
            name: 'Source',
            url: 'https://source.example.com',
            logoUrl: 'https://source.example.com/logo.png',
            locality: 'Sofia',
          },
        ],
      }),
    })

    const sources = await fetchOboSources()

    expect(sources).toHaveLength(1)
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/ysm/sources')
  })

  it('finds message by id using documented messages endpoint', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [
          {
            id: 'm1',
            text: 'one',
            createdAt: '2026-02-14T10:00:00.000Z',
            locality: 'Sofia',
          },
          {
            id: 'm2',
            text: 'two',
            createdAt: '2026-02-14T11:00:00.000Z',
            locality: 'Sofia',
          },
        ],
      }),
    })

    const message = await fetchOboMessageById('m2')

    expect(message?.id).toBe('m2')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/ysm/messages')
  })
})
