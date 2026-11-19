import {
  createDrinkingFountain,
  fetchDrinkingFountains,
  fetchFountainSources,
  fetchFountainStatuses,
} from '../../lib/payload'

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const API = 'https://api.test'
const fetchMock = jest.fn()

function jsonResponse(body: unknown) {
  return {ok: true, status: 200, statusText: 'OK', json: async () => body}
}

function errorResponse(status: number, statusText: string, body?: unknown) {
  return {
    ok: false,
    status,
    statusText,
    json: async () => {
      if (body === undefined) throw new SyntaxError('Unexpected end of JSON input')
      return body
    },
  }
}

function requestAt(index = 0) {
  const [url, init] = fetchMock.mock.calls[index]
  return {url: new URL(url as string), init: (init ?? {}) as RequestInit}
}

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

describe('fetchDrinkingFountains', () => {
  it('loads every fountain with its lookups populated', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await expect(fetchDrinkingFountains()).resolves.toEqual([])

    const {url} = requestAt()
    expect(url.pathname).toBe('/api/drinking-fountains')
    expect(Object.fromEntries(url.searchParams)).toEqual({limit: '2000', depth: '1'})
  })

  it('flattens a fountain for the map', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        docs: [
          {
            id: 4,
            publicNumber: 'DF-SRS-0004',
            address: 'bul. Vitosha 1',
            location: [23.3219, 42.6977],
            isActive: false,
            protectionStatus: 'cultural',
            externalLink: 'https://example.test/df-4',
            district: {id: 1, name: 'Sredets'},
            source: {id: 2, name: 'Mineral'},
            status: {id: 3, name: 'Good condition'},
            owner: {id: 4, name: 'Sofia Municipality'},
            activationType: {id: 5, name: 'Push button'},
            createdAt: '2026-01-02 03:04:05.000000+00',
            updatedAt: '2026-01-03T00:00:00.000Z',
            extra: 'ignored',
          },
        ],
      })
    )

    await expect(fetchDrinkingFountains()).resolves.toEqual([
      {
        id: 4,
        publicNumber: 'DF-SRS-0004',
        address: 'bul. Vitosha 1',
        latitude: 42.6977,
        longitude: 23.3219,
        isActive: false,
        protectionStatus: 'cultural',
        externalLink: 'https://example.test/df-4',
        districtName: 'Sredets',
        sourceName: 'Mineral',
        statusName: 'Good condition',
        ownerName: 'Sofia Municipality',
        activationName: 'Push button',
        createdAt: '2026-01-02T03:04:05.000000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
      },
    ])
  })

  it('uses null for missing data and unpopulated lookups', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        docs: [{id: 9, address: 'pl. Nezavisimost', district: 3, source: null, status: {id: 1}}],
      })
    )

    await expect(fetchDrinkingFountains()).resolves.toEqual([
      {
        id: 9,
        publicNumber: null,
        address: 'pl. Nezavisimost',
        latitude: 0,
        longitude: 0,
        isActive: null,
        protectionStatus: null,
        externalLink: null,
        districtName: null,
        sourceName: null,
        statusName: null,
        ownerName: null,
        activationName: null,
        createdAt: undefined,
        updatedAt: undefined,
      },
    ])
  })

  it('returns no fountains when the response has no docs', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}))

    await expect(fetchDrinkingFountains()).resolves.toEqual([])
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchDrinkingFountains()).rejects.toThrow(
      'Failed to fetch drinking fountains: Internal Server Error'
    )
  })
})

describe.each([
  ['fetchFountainStatuses', fetchFountainStatuses, 'fountain-status'],
  ['fetchFountainSources', fetchFountainSources, 'drinking-fountain-source'],
])('%s', (_name, fetchLookup, slug) => {
  it('loads the lookup sorted by name as {id, name} pairs', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({docs: [{id: 1, name: 'Mineral', createdAt: 'x', updatedAt: 'y'}]})
    )

    await expect(fetchLookup()).resolves.toEqual([{id: 1, name: 'Mineral'}])

    expect(requestAt().url.href).toBe(`${API}/api/${slug}?limit=100&sort=name`)
  })

  it('returns an empty list when the response has no docs', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}))

    await expect(fetchLookup()).resolves.toEqual([])
  })

  it('throws with the collection and status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(503, 'Service Unavailable'))

    await expect(fetchLookup()).rejects.toThrow(`Failed to fetch ${slug}: Service Unavailable`)
  })
})

describe('createDrinkingFountain', () => {
  const input = {
    address: 'bul. Vitosha 1',
    location: {latitude: 42.6977, longitude: 23.3219},
    isActive: true,
    district: 3,
    source: 1,
    status: 2,
  }

  it('posts the fountain with the location as a [longitude, latitude] point', async () => {
    const created = {id: 11, publicNumber: 'DF-SRS-0011'}
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: created, message: 'Created'}))

    await expect(createDrinkingFountain(input, 'jwt')).resolves.toEqual(created)

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/drinking-fountains`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt',
    })
    expect(JSON.parse(init.body as string)).toEqual({
      address: 'bul. Vitosha 1',
      isActive: true,
      district: 3,
      source: 1,
      status: 2,
      location: [23.3219, 42.6977],
    })
  })

  it('throws the server message', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(403, 'Forbidden', {message: 'You are not allowed to perform this action.'})
    )

    await expect(createDrinkingFountain(input, 'jwt')).rejects.toThrow(
      'You are not allowed to perform this action.'
    )
  })

  it('falls back to the status text when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(createDrinkingFountain(input, 'jwt')).rejects.toThrow(
      'Failed to create drinking fountain: Internal Server Error'
    )
  })
})
