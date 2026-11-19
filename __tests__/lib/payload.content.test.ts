import {
  fetchBulkyWasteZones,
  fetchCityDistricts,
  fetchCollectionMetrics,
  fetchNews,
  fetchNewsById,
} from '../../lib/payload'

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const fetchMock = jest.fn()

function jsonResponse(body: unknown) {
  return {ok: true, status: 200, statusText: 'OK', json: async () => body}
}

function errorResponse(status: number, statusText: string) {
  return {ok: false, status, statusText, json: async () => ({})}
}

function requestAt(index = 0) {
  const [url, init] = fetchMock.mock.calls[index]
  return {url: new URL(url as string), init: init as RequestInit | undefined}
}

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  jest.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const polygon = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [23.3, 42.6],
      [23.4, 42.6],
      [23.4, 42.7],
      [23.3, 42.6],
    ] as [number, number][],
  ],
}
const multiPolygon = {type: 'MultiPolygon' as const, coordinates: [polygon.coordinates]}

describe('fetchBulkyWasteZones', () => {
  it('requests the zones and passes the abort signal through', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))
    const controller = new AbortController()

    await fetchBulkyWasteZones(controller.signal)

    const {url, init} = requestAt()
    expect(url.href).toBe('https://api.test/api/bulky-waste-zones')
    expect(init?.signal).toBe(controller.signal)
  })

  it('reads a GeoJSON feature collection', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {id: 7, name: 'Lozenets', info: 'Tuesdays', collectionDaysOfWeek: ['tue']},
            geometry: polygon,
          },
          {type: 'Feature', properties: {id: 8, name: 'Mladost'}, geometry: multiPolygon},
        ],
      })
    )

    await expect(fetchBulkyWasteZones()).resolves.toEqual([
      {
        id: '7',
        name: 'Lozenets',
        info: 'Tuesdays',
        collectionDaysOfWeek: ['tue'],
        geometry: polygon,
      },
      {id: '8', name: 'Mladost', collectionDaysOfWeek: [], geometry: multiPolygon},
    ])
  })

  it('drops features that are not usable zones', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        type: 'FeatureCollection',
        features: [
          {type: 'Feature', properties: {name: 'No id'}, geometry: polygon},
          {
            type: 'Feature',
            properties: {id: 2, name: 'Point'},
            geometry: {type: 'Point', coordinates: [1, 2]},
          },
          {type: 'Feature', properties: {id: 3, name: 'No geometry'}},
          {type: 'Other', properties: {id: 4, name: 'Not a feature'}, geometry: polygon},
          {type: 'Feature', properties: {id: 5, name: 'Kept'}, geometry: polygon},
        ],
      })
    )

    const zones = await fetchBulkyWasteZones()

    expect(zones.map((z) => z.name)).toEqual(['Kept'])
  })

  it('reads a Payload docs list', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        docs: [
          {id: 1, name: 'Sredets', info: null, collectionDaysOfWeek: ['mon'], boundary: polygon},
          {id: 2, name: 'Vitosha', boundary: multiPolygon},
          {id: 3, name: 'No boundary'},
          {id: 0, name: 'No id', boundary: polygon},
          {id: 4, name: 'Line', boundary: {type: 'LineString', coordinates: []}},
        ],
      })
    )

    await expect(fetchBulkyWasteZones()).resolves.toEqual([
      {id: '1', name: 'Sredets', info: null, collectionDaysOfWeek: ['mon'], geometry: polygon},
      {id: '2', name: 'Vitosha', info: undefined, collectionDaysOfWeek: [], geometry: multiPolygon},
    ])
  })

  it('rejects a response in an unknown format', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({zones: []}))

    await expect(fetchBulkyWasteZones()).rejects.toThrow('Invalid bulky waste zones response')
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(503, 'Service Unavailable'))

    await expect(fetchBulkyWasteZones()).rejects.toThrow(
      'Failed to fetch bulky waste zones: Service Unavailable'
    )
  })
})

describe('fetchNews', () => {
  it('asks for the latest published Bulgarian news by default', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchNews()

    const {url} = requestAt()
    expect(url.origin + url.pathname).toBe('https://api.test/api/news')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      locale: 'bg',
      limit: '10',
      page: '1',
      depth: '1',
      sort: '-publishedAt',
      'where[status][equals]': 'published',
    })
  })

  it('applies locale, topic and paging options', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchNews({locale: 'en', topic: 'festivals', limit: 5, page: 3})

    const {searchParams} = requestAt().url
    expect(searchParams.get('locale')).toBe('en')
    expect(searchParams.get('limit')).toBe('5')
    expect(searchParams.get('page')).toBe('3')
    expect(searchParams.get('where[topic][equals]')).toBe('festivals')
  })

  it('does not filter by topic for "all"', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchNews({topic: 'all'})

    expect(requestAt().url.searchParams.has('where[topic][equals]')).toBe(false)
  })

  it('returns the response body', async () => {
    const body = {docs: [{id: 'n1'}], totalDocs: 1}
    fetchMock.mockResolvedValueOnce(jsonResponse(body))

    await expect(fetchNews()).resolves.toEqual(body)
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchNews()).rejects.toThrow('Failed to fetch news: Internal Server Error')
  })
})

describe('fetchNewsById', () => {
  it('requests the item in Bulgarian by default', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({id: 'n1'}))

    await expect(fetchNewsById('n1')).resolves.toEqual({id: 'n1'})

    expect(requestAt().url.href).toBe('https://api.test/api/news/n1?locale=bg')
  })

  it('requests the given locale', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({id: 'n1'}))

    await fetchNewsById('n1', 'en')

    expect(requestAt().url.searchParams.get('locale')).toBe('en')
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404, 'Not Found'))

    await expect(fetchNewsById('n1')).rejects.toThrow('Failed to fetch news item: Not Found')
  })
})

describe('fetchCollectionMetrics', () => {
  it('requests the metrics for the date range and returns them', async () => {
    const metrics = {from: '2026-11-01', to: '2026-11-07', byDistrict: []}
    fetchMock.mockResolvedValueOnce(jsonResponse(metrics))

    await expect(
      fetchCollectionMetrics('2026-11-01T00:00:00.000Z', '2026-11-07T23:59:59.999Z')
    ).resolves.toEqual(metrics)

    const {url} = requestAt()
    expect(url.pathname).toBe('/api/waste-containers/collection-metrics')
    expect(url.searchParams.get('from')).toBe('2026-11-01T00:00:00.000Z')
    expect(url.searchParams.get('to')).toBe('2026-11-07T23:59:59.999Z')
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchCollectionMetrics('a', 'b')).rejects.toThrow(
      'Failed to fetch collection metrics: Internal Server Error'
    )
  })
})

describe('fetchCityDistricts', () => {
  it('requests all 24 districts in order and returns them', async () => {
    const districts = [{id: 1, districtId: 1, name: 'Sredets', code: 'SRS'}]
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: districts}))

    await expect(fetchCityDistricts()).resolves.toEqual(districts)

    expect(requestAt().url.href).toBe(
      'https://api.test/api/city-districts?limit=24&sort=districtId'
    )
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(502, 'Bad Gateway'))

    await expect(fetchCityDistricts()).rejects.toThrow(
      'Failed to fetch city districts: Bad Gateway'
    )
  })
})
