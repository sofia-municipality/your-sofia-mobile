import type {UpdateMessage, UpdateSource} from '../../lib/updatesSchema'

type UpdatesApi = typeof import('../../lib/updatesApi')

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

/** The module caches sources and in-flight requests, so each test gets a fresh copy. */
function loadApi(): UpdatesApi {
  let api!: UpdatesApi
  jest.isolateModules(() => {
    api = require('../../lib/updatesApi')
  })
  return api
}

const message: UpdateMessage = {
  id: 'msg-1',
  text: 'Water outage on ul. Shipka',
  createdAt: '2026-11-10T08:00:00.000Z',
}

function jsonResponse(body: unknown, init: {status?: number; statusText?: string} = {}) {
  const status = init.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? 'OK',
    json: async () => body,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return {promise, resolve}
}

const fetchMock = jest.fn()

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  jest.useRealTimers()
})

describe('fetchNewsUpdates', () => {
  it('requests all updates when no options are given', async () => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({messages: [message]}))

    await expect(fetchNewsUpdates()).resolves.toEqual([message])
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/updates')
  })

  it('sends the push token, bounds, zoom, categories and end date as query params', async () => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({messages: []}))

    await fetchNewsUpdates({
      pushToken: 'ExponentPushToken[abc]',
      bounds: {north: 42.8, south: 42.6, east: 23.5, west: 23.1},
      zoom: 12.5,
      categories: ['water', 'heating'],
      timespanEndGte: '2026-11-16T00:00:00.000Z',
    })

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.origin + url.pathname).toBe('https://api.test/api/updates')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      pushToken: 'ExponentPushToken[abc]',
      north: '42.8',
      south: '42.6',
      east: '23.5',
      west: '23.1',
      zoom: '12.5',
      categories: 'water,heating',
      timespanEndGte: '2026-11-16T00:00:00.000Z',
    })
  })

  it.each([NaN, Infinity])('leaves out a zoom of %d', async (zoom) => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({messages: []}))

    await fetchNewsUpdates({zoom})

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/updates')
  })

  it('sends a zoom of 0', async () => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({messages: []}))

    await fetchNewsUpdates({zoom: 0})

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/updates?zoom=0')
  })

  it('leaves out an empty category list', async () => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({messages: []}))

    await fetchNewsUpdates({categories: []})

    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/updates')
  })

  it('throws with the HTTP status when the request fails', async () => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({}, {status: 502, statusText: 'Bad Gateway'}))

    await expect(fetchNewsUpdates()).rejects.toThrow('Failed to fetch updates: 502 Bad Gateway')
  })

  it('throws a labelled error when the payload does not match the schema', async () => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({messages: [{text: 'no createdAt'}]}))

    await expect(fetchNewsUpdates()).rejects.toThrow(/^Updates list: invalid response payload/)
  })

  it('shares one request between identical concurrent calls', async () => {
    const {fetchNewsUpdates} = loadApi()
    const response = deferred<ReturnType<typeof jsonResponse>>()
    fetchMock.mockReturnValue(response.promise)

    const first = fetchNewsUpdates({categories: ['water']})
    const second = fetchNewsUpdates({categories: ['water']})
    response.resolve(jsonResponse({messages: [message]}))

    await expect(first).resolves.toEqual([message])
    await expect(second).resolves.toEqual([message])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not share requests with different parameters', async () => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockImplementation(async () => jsonResponse({messages: []}))

    await Promise.all([
      fetchNewsUpdates({categories: ['water']}),
      fetchNewsUpdates({categories: ['heating']}),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('sends a new request once the previous one has finished', async () => {
    const {fetchNewsUpdates} = loadApi()
    fetchMock.mockImplementation(async () => jsonResponse({messages: []}))

    await fetchNewsUpdates()
    await fetchNewsUpdates()

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shares a failure between concurrent callers, then retries', async () => {
    const {fetchNewsUpdates} = loadApi()
    const response = deferred<ReturnType<typeof jsonResponse>>()
    fetchMock.mockReturnValueOnce(response.promise)

    const first = fetchNewsUpdates()
    const second = fetchNewsUpdates()
    response.resolve(jsonResponse({}, {status: 500, statusText: 'Server Error'}))

    await expect(first).rejects.toThrow('500')
    await expect(second).rejects.toThrow('500')

    fetchMock.mockResolvedValueOnce(jsonResponse({messages: [message]}))
    await expect(fetchNewsUpdates()).resolves.toEqual([message])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('fetchUpdateById', () => {
  it('requests the update by its encoded id', async () => {
    const {fetchUpdateById} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({message}))

    await expect(fetchUpdateById('a/b c')).resolves.toEqual(message)
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/updates/by-id?id=a%2Fb%20c')
  })

  it('throws with the HTTP status when the request fails', async () => {
    const {fetchUpdateById} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({}, {status: 404, statusText: 'Not Found'}))

    await expect(fetchUpdateById('missing')).rejects.toThrow(
      'Failed to fetch update: 404 Not Found'
    )
  })

  it('throws a labelled error when the payload does not match the schema', async () => {
    const {fetchUpdateById} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({messages: [message]}))

    await expect(fetchUpdateById('msg-1')).rejects.toThrow(
      /^Update by id: invalid response payload/
    )
  })
})

describe('fetchUpdateSources', () => {
  const sources: UpdateSource[] = [{id: 'sofiyska-voda', name: 'Sofiyska Voda'}]

  it('fetches the sources', async () => {
    const {fetchUpdateSources} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({sources}))

    await expect(fetchUpdateSources()).resolves.toEqual(sources)
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/updates/sources')
  })

  it('serves the sources from cache for five minutes', async () => {
    jest.useFakeTimers({now: new Date('2026-11-16T10:00:00.000Z')})
    const {fetchUpdateSources} = loadApi()
    fetchMock.mockImplementation(async () => jsonResponse({sources}))

    await fetchUpdateSources()
    jest.setSystemTime(new Date('2026-11-16T10:04:59.000Z'))
    await expect(fetchUpdateSources()).resolves.toEqual(sources)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    jest.setSystemTime(new Date('2026-11-16T10:05:01.000Z'))
    await fetchUpdateSources()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('bypasses the cache when forced', async () => {
    const {fetchUpdateSources} = loadApi()
    const updated = [...sources, {id: 'toplofikatsia'}]
    fetchMock
      .mockResolvedValueOnce(jsonResponse({sources}))
      .mockResolvedValueOnce(jsonResponse({sources: updated}))

    await fetchUpdateSources()
    await expect(fetchUpdateSources({force: true})).resolves.toEqual(updated)
    await expect(fetchUpdateSources()).resolves.toEqual(updated)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shares one request between concurrent calls', async () => {
    const {fetchUpdateSources} = loadApi()
    const response = deferred<ReturnType<typeof jsonResponse>>()
    fetchMock.mockReturnValue(response.promise)

    const first = fetchUpdateSources()
    const second = fetchUpdateSources()
    response.resolve(jsonResponse({sources}))

    await expect(Promise.all([first, second])).resolves.toEqual([sources, sources])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not cache a failure', async () => {
    const {fetchUpdateSources} = loadApi()
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, {status: 503, statusText: 'Unavailable'}))
      .mockResolvedValueOnce(jsonResponse({sources}))

    await expect(fetchUpdateSources()).rejects.toThrow(
      'Failed to fetch update sources: 503 Unavailable'
    )
    await expect(fetchUpdateSources()).resolves.toEqual(sources)
  })

  it('throws a labelled error when the payload does not match the schema', async () => {
    const {fetchUpdateSources} = loadApi()
    fetchMock.mockResolvedValue(jsonResponse({sources: [{name: 'no id'}]}))

    await expect(fetchUpdateSources()).rejects.toThrow(/^Updates sources: invalid response payload/)
  })
})

describe('mapSourcesById', () => {
  it('indexes sources by id and skips sources without one', () => {
    const {mapSourcesById} = loadApi()
    const voda = {id: 'sofiyska-voda', name: 'Sofiyska Voda'}
    const toplo = {id: 'toplofikatsia'}

    expect(mapSourcesById([voda, {id: ''}, toplo])).toEqual({
      'sofiyska-voda': voda,
      toplofikatsia: toplo,
    })
  })
})

describe('mapUpdateMessageToNewsItem', () => {
  const {mapUpdateMessageToNewsItem} = loadApi()

  beforeEach(() => {
    jest.useFakeTimers({now: new Date('2026-11-16T12:00:00.000Z')})
  })

  it('maps the basic fields', () => {
    const item = mapUpdateMessageToNewsItem(
      {
        ...message,
        plainText: 'Plain text',
        markdownText: '**Markdown**',
        categories: ['water', 'construction-and-repairs'],
        cityWide: true,
        responsibleEntity: 'Sofiyska Voda',
        busStops: ['0123'],
        locality: 'bg.sofia.lozenets',
      },
      'en'
    )

    expect(item).toMatchObject({
      id: 'msg-1',
      title: undefined,
      snippet: 'Plain text',
      description: 'bg.sofia.lozenets',
      topic: 'water',
      categories: ['water', 'construction-and-repairs'],
      markdownText: '**Markdown**',
      plainText: 'Plain text',
      rawText: 'Water outage on ul. Shipka',
      cityWide: true,
      responsibleEntity: 'Sofiyska Voda',
      busStops: ['0123'],
    })
  })

  it('falls back to createdAt for the id, Sofia for the locality and uncategorized for the topic', () => {
    const {id: _id, ...withoutId} = message
    const item = mapUpdateMessageToNewsItem(withoutId, 'en')

    expect(item.id).toBe('2026-11-10T08:00:00.000Z')
    expect(item.description).toBe('bg.sofia')
    expect(item.topic).toBe('uncategorized')
    expect(item.categories).toEqual([])
  })

  it('builds the snippet from the raw text without markdown when there is no plain text', () => {
    const item = mapUpdateMessageToNewsItem({...message, text: '## Outage\n**ul. Shipka**'}, 'en')

    expect(item.snippet).toBe('Outage ul. Shipka')
  })

  it('truncates the snippet to 100 characters', () => {
    const item = mapUpdateMessageToNewsItem({...message, text: 'x'.repeat(120)}, 'en')

    expect(item.snippet).toBe(`${'x'.repeat(100)}...`)
  })

  describe('date', () => {
    it('formats finalizedAt in the user language', () => {
      const finalized = {...message, finalizedAt: '2026-11-10T12:00:00.000Z'}

      expect(mapUpdateMessageToNewsItem(finalized, 'en').date).toBe('November 10, 2026')
      expect(mapUpdateMessageToNewsItem(finalized, 'bg').date).toBe('10 ноември 2026 г.')
    })

    it('falls back to the end of the timespan', () => {
      const item = mapUpdateMessageToNewsItem(
        {...message, timespanEnd: '2026-12-01T12:00:00.000Z'},
        'en'
      )

      expect(item.date).toBe('December 1, 2026')
    })

    it('prefers finalizedAt over the end of the timespan', () => {
      const item = mapUpdateMessageToNewsItem(
        {
          ...message,
          finalizedAt: '2026-11-10T12:00:00.000Z',
          timespanEnd: '2026-12-01T12:00:00.000Z',
        },
        'en'
      )

      expect(item.date).toBe('November 10, 2026')
    })

    // createdAt is always present, but the date falls back to "today" instead.
    it('uses today when there is neither finalizedAt nor a timespan end', () => {
      expect(mapUpdateMessageToNewsItem(message, 'en').date).toBe('November 16, 2026')
    })

    it('normalises finalizedAt to an ISO string', () => {
      const item = mapUpdateMessageToNewsItem(
        {...message, finalizedAt: '2026-11-10T14:00:00+02:00'},
        'en'
      )

      expect(item.finalizedAt).toBe('2026-11-10T12:00:00.000Z')
    })

    // BUG: timespans go through toISOStringIfValid, but finalizedAt calls toISOString() directly,
    // which throws a RangeError for an unparseable value. One bad message from the server then
    // fails the whole updates list, since useUpdates maps every message in one go.
    it.failing('ignores an unparseable finalizedAt instead of throwing', () => {
      const item = mapUpdateMessageToNewsItem({...message, finalizedAt: 'not a date'}, 'en')

      expect(item.finalizedAt).toBeUndefined()
    })
  })

  describe('timespan', () => {
    it.each([
      ['ended', '2026-11-01T08:00:00.000Z', '2026-11-15T08:00:00.000Z'],
      ['upcoming', '2026-11-20T08:00:00.000Z', '2026-11-21T08:00:00.000Z'],
      ['active', '2026-11-15T08:00:00.000Z', '2026-11-17T08:00:00.000Z'],
    ])('is %s', (status, timespanStart, timespanEnd) => {
      const item = mapUpdateMessageToNewsItem({...message, timespanStart, timespanEnd}, 'en')

      expect(item.timespanStatus).toBe(status)
      expect(item.timespanStart).toBe(timespanStart)
      expect(item.timespanEnd).toBe(timespanEnd)
    })

    it('is active when it started and has no end', () => {
      const item = mapUpdateMessageToNewsItem(
        {...message, timespanStart: '2026-11-15T08:00:00.000Z'},
        'en'
      )

      expect(item.timespanStatus).toBe('active')
    })

    it('is ended when only a past end is known', () => {
      const item = mapUpdateMessageToNewsItem(
        {...message, timespanEnd: '2026-11-15T08:00:00.000Z'},
        'en'
      )

      expect(item.timespanStatus).toBe('ended')
    })

    it('has no status without a timespan', () => {
      expect(mapUpdateMessageToNewsItem(message, 'en').timespanStatus).toBeUndefined()
    })

    it('normalises the timespan to ISO strings and drops invalid values', () => {
      const item = mapUpdateMessageToNewsItem(
        {...message, timespanStart: '2026-11-15T10:00:00+02:00', timespanEnd: 'soon'},
        'en'
      )

      expect(item.timespanStart).toBe('2026-11-15T08:00:00.000Z')
      expect(item.timespanEnd).toBeUndefined()
    })
  })

  describe('source', () => {
    const sourcesById = {
      'sofiyska-voda': {
        id: 'sofiyska-voda',
        name: 'Sofiyska Voda',
        url: 'https://sofiyskavoda.bg',
        logoUrl: 'https://cdn.test/voda.png',
      },
    }

    it('adds the name, URL and logo of a known source', () => {
      const item = mapUpdateMessageToNewsItem(
        {...message, source: 'sofiyska-voda'},
        'en',
        sourcesById
      )

      expect(item).toMatchObject({
        sourceId: 'sofiyska-voda',
        sourceName: 'Sofiyska Voda',
        sourceUrl: 'https://sofiyskavoda.bg',
        sourceLogoUrl: 'https://cdn.test/voda.png',
      })
    })

    it('prefers the message link over the source homepage', () => {
      const item = mapUpdateMessageToNewsItem(
        {...message, source: 'sofiyska-voda', sourceUrl: 'https://sofiyskavoda.bg/news/1'},
        'en',
        sourcesById
      )

      expect(item.sourceUrl).toBe('https://sofiyskavoda.bg/news/1')
    })

    it('uses the source id as the name of an unknown source', () => {
      const item = mapUpdateMessageToNewsItem({...message, source: 'toplofikatsia'}, 'en', {})

      expect(item.sourceName).toBe('toplofikatsia')
      expect(item.sourceLogoUrl).toBeUndefined()
    })
  })

  describe('location', () => {
    const feature = (type: 'Point' | 'LineString' | 'Polygon', coordinates: unknown) => ({
      type: 'Feature' as const,
      geometry: {type, coordinates},
    })
    const withFeatures = (...features: ReturnType<typeof feature>[]): UpdateMessage => ({
      ...message,
      geoJson: {type: 'FeatureCollection', features},
    })

    it('uses a GeoJSON point, swapping [lng, lat]', () => {
      const item = mapUpdateMessageToNewsItem(withFeatures(feature('Point', [23.33, 42.69])), 'en')

      expect(item.location).toEqual({latitude: 42.69, longitude: 23.33})
    })

    it('uses the first point of a line', () => {
      const line = feature('LineString', [
        [23.3, 42.7],
        [23.4, 42.8],
      ])

      expect(mapUpdateMessageToNewsItem(withFeatures(line), 'en').location).toEqual({
        latitude: 42.7,
        longitude: 23.3,
      })
    })

    it('uses the first vertex of a polygon', () => {
      const polygon = feature('Polygon', [
        [
          [23.3, 42.7],
          [23.4, 42.7],
          [23.35, 42.8],
          [23.3, 42.7],
        ],
      ])

      expect(mapUpdateMessageToNewsItem(withFeatures(polygon), 'en').location).toEqual({
        latitude: 42.7,
        longitude: 23.3,
      })
    })

    it('only looks at the first feature', () => {
      const item = mapUpdateMessageToNewsItem(
        withFeatures(feature('Point', [23.1, 42.1]), feature('Point', [23.2, 42.2])),
        'en'
      )

      expect(item.location).toEqual({latitude: 42.1, longitude: 23.1})
    })

    it('falls back to the first address with coordinates', () => {
      const item = mapUpdateMessageToNewsItem(
        {
          ...message,
          geoJson: {type: 'FeatureCollection', features: []},
          addresses: [{originalText: 'ul. Shipka 1', coordinates: {lat: 42.69, lng: 23.33}}],
        },
        'en'
      )

      expect(item.location).toEqual({latitude: 42.69, longitude: 23.33})
    })

    it('falls back to the address when the line is empty', () => {
      const item = mapUpdateMessageToNewsItem(
        {
          ...withFeatures(feature('LineString', [])),
          addresses: [{coordinates: {lat: 42.69, lng: 23.33}}],
        },
        'en'
      )

      expect(item.location).toEqual({latitude: 42.69, longitude: 23.33})
    })

    it('has no location without geometry or address coordinates', () => {
      const item = mapUpdateMessageToNewsItem(
        {...message, addresses: [{originalText: 'somewhere'}]},
        'en'
      )

      expect(item.location).toBeUndefined()
    })

    it('collects every point, line vertex, address and pin into allLocations', () => {
      const item = mapUpdateMessageToNewsItem(
        {
          ...withFeatures(
            feature('Point', [23.1, 42.1]),
            feature('LineString', [
              [23.2, 42.2],
              [23.3, 42.3],
            ])
          ),
          addresses: [{coordinates: {lat: 42.4, lng: 23.4}}, {originalText: 'no coordinates'}],
          pins: [
            {address: 'pin', coordinates: {lat: 42.5, lng: 23.5}, timespans: []},
            {address: 'pin without coordinates', timespans: []},
          ],
        },
        'en'
      )

      expect(item.allLocations).toEqual([
        {latitude: 42.1, longitude: 23.1},
        {latitude: 42.2, longitude: 23.2},
        {latitude: 42.3, longitude: 23.3},
        {latitude: 42.4, longitude: 23.4},
        {latitude: 42.5, longitude: 23.5},
      ])
    })

    // allLocations is not read anywhere yet, so this only documents current behaviour.
    it('leaves polygons out of allLocations', () => {
      const polygon = feature('Polygon', [[[23.3, 42.7]]])

      expect(mapUpdateMessageToNewsItem(withFeatures(polygon), 'en').allLocations).toEqual([])
    })
  })

  it('copies addresses, pins and streets', () => {
    const timespans = [{start: '2026-11-11T08:00:00.000Z', end: null}]
    const item = mapUpdateMessageToNewsItem(
      {
        ...message,
        addresses: [{coordinates: {lat: 42.69, lng: 23.33}}],
        pins: [{address: 'ul. Shipka 1', timespans}],
        streets: [
          {
            street: 'ul. Shipka',
            from: 'bul. Vasil Levski',
            fromCoordinates: {lat: 42.69, lng: 23.33},
            to: 'ul. Oborishte',
            timespans,
          },
        ],
      },
      'en'
    )

    expect(item.addresses).toEqual([
      {originalText: '', formattedAddress: '', coordinates: {lat: 42.69, lng: 23.33}},
    ])
    expect(item.pins).toEqual([{address: 'ul. Shipka 1', timespans}])
    expect(item.streets).toEqual([
      {street: 'ul. Shipka', from: 'bul. Vasil Levski', to: 'ul. Oborishte', timespans},
    ])
  })
})
