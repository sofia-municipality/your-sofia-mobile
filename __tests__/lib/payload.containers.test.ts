import {
  cleanContainer,
  createWasteContainer,
  fetchContainerClusters,
  fetchContainersWithSignals,
  fetchNearbyWasteContainers,
  fetchWasteContainerById,
  fetchWasteContainers,
  updateWasteContainer,
} from '../../lib/payload'
import type {CreateContainerInput} from '../../types/wasteContainer'

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const API = 'https://api.test'
const fetchMock = jest.fn()

function jsonResponse(body: unknown) {
  return {ok: true, status: 200, statusText: 'OK', json: async () => body, text: async () => ''}
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
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }
}

function requestAt(index = 0) {
  const [url, init] = fetchMock.mock.calls[index]
  return {url: new URL(url as string), init: (init ?? {}) as RequestInit}
}

function bodyAt(index = 0) {
  return JSON.parse(requestAt(index).init.body as string)
}

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const photo = {uri: 'file:///photo.jpg', type: 'image/jpeg', name: 'photo.jpg'}

const containerInput: CreateContainerInput = {
  publicNumber: 'WC-001',
  wasteType: 'general',
  capacityVolume: 1.1,
  capacitySize: 'standard',
  binCount: 2,
  location: {latitude: 42.6977, longitude: 23.3219, address: 'ul. Shipka 1'},
  notes: 'Behind the school',
}

describe('fetchContainersWithSignals', () => {
  it('asks for all containers as individual markers by default', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchContainersWithSignals()

    const {url} = requestAt()
    expect(url.pathname).toBe('/api/waste-containers/containers-with-signal-count')
    expect(Object.fromEntries(url.searchParams)).toEqual({limit: '1000', page: '1', zoom: '16'})
  })

  it('filters by districts', async () => {
    fetchMock.mockResolvedValue(jsonResponse({docs: []}))

    await fetchContainersWithSignals({limit: 50, page: 2, districtId: [3, 14]})
    await fetchContainersWithSignals({districtId: []})

    expect(Object.fromEntries(requestAt(0).url.searchParams)).toEqual({
      limit: '50',
      page: '2',
      zoom: '16',
      districtId: '3,14',
    })
    expect(requestAt(1).url.searchParams.has('districtId')).toBe(false)
  })

  it('adds coordinates and absolute image URLs to every container', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        docs: [
          {
            id: 1,
            location: [23.32, 42.69],
            images: ['https://cdn.test/a.jpg', {url: '/media/b.jpg'}],
            activeSignalCount: 2,
          },
          {id: 2},
        ],
      })
    )

    const {docs} = await fetchContainersWithSignals()

    expect(docs[0]).toEqual({
      id: 1,
      location: [23.32, 42.69],
      latitude: 42.69,
      longitude: 23.32,
      images: ['https://cdn.test/a.jpg', `${API}/media/b.jpg`],
      activeSignalCount: 2,
    })
    expect(docs[1]).toEqual({id: 2, latitude: undefined, longitude: undefined, images: []})
  })

  it('returns a response without docs unchanged', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({type: 'clusters'}))

    await expect(fetchContainersWithSignals()).resolves.toEqual({type: 'clusters'})
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(502, 'Bad Gateway', {error: 'db down'}))

    await expect(fetchContainersWithSignals()).rejects.toThrow(
      'Failed to fetch containers with signals: Bad Gateway'
    )
  })
})

describe('fetchContainerClusters', () => {
  const viewport = {zoom: 13, minLat: 42.6, maxLat: 42.8, minLng: 23.2, maxLng: 23.4}

  it('requests the viewport at the given zoom', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({type: 'clusters', docs: [], zoom: 13}))

    await fetchContainerClusters(viewport)

    const {url} = requestAt()
    expect(url.pathname).toBe('/api/waste-containers/containers-with-signal-count')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      zoom: '13',
      minLat: '42.6',
      maxLat: '42.8',
      minLng: '23.2',
      maxLng: '23.4',
    })
  })

  it('adds the status, district and volume filters', async () => {
    fetchMock.mockResolvedValue(jsonResponse({type: 'clusters', docs: [], zoom: 13}))

    await fetchContainerClusters({
      ...viewport,
      status: 'full',
      districtId: [1, 2],
      volumeOptions: [1.1, 3],
    })
    await fetchContainerClusters({...viewport, districtId: [], volumeOptions: []})

    const filtered = requestAt(0).url.searchParams
    expect(filtered.get('status')).toBe('full')
    expect(filtered.get('districtId')).toBe('1,2')
    expect(filtered.get('volumeOptions')).toBe('1.1,3')
    const unfiltered = requestAt(1).url.searchParams
    expect(unfiltered.has('districtId')).toBe(false)
    expect(unfiltered.has('volumeOptions')).toBe(false)
  })

  it('returns clusters unchanged', async () => {
    const clusters = {
      type: 'clusters',
      zoom: 12,
      docs: [{type: 'cluster', lat: 42.7, lng: 23.3, count: 12, dominantStatus: 'full'}],
    }
    fetchMock.mockResolvedValueOnce(jsonResponse(clusters))

    await expect(fetchContainerClusters(viewport)).resolves.toEqual(clusters)
  })

  it('adds coordinates to markers and makes PostgreSQL timestamps ISO 8601', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        type: 'markers',
        zoom: 17,
        total: 2,
        docs: [
          {
            id: 1,
            location: [23.32, 42.69],
            createdAt: '2024-01-15 10:30:00.000000+00',
            updatedAt: '2024-01-15 10:30:00+00:00',
            lastCleaned: '2024-01-15T10:30:00.000Z',
          },
          {id: 2, createdAt: null, updatedAt: undefined, lastCleaned: null},
        ],
      })
    )

    const result = await fetchContainerClusters({...viewport, zoom: 17})

    expect(result).toEqual({
      type: 'markers',
      zoom: 17,
      total: 2,
      docs: [
        {
          id: 1,
          location: [23.32, 42.69],
          latitude: 42.69,
          longitude: 23.32,
          createdAt: '2024-01-15T10:30:00.000000Z',
          updatedAt: '2024-01-15T10:30:00Z',
          lastCleaned: '2024-01-15T10:30:00.000Z',
        },
        {
          id: 2,
          latitude: 0,
          longitude: 0,
          createdAt: null,
          updatedAt: undefined,
          lastCleaned: null,
        },
      ],
    })
  })

  it('returns no markers when the response has no docs', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({type: 'markers', zoom: 17}))

    await expect(fetchContainerClusters(viewport)).resolves.toEqual({
      type: 'markers',
      zoom: 17,
      docs: [],
    })
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchContainerClusters(viewport)).rejects.toThrow(
      'Failed to fetch clusters: Internal Server Error'
    )
  })
})

describe('fetchWasteContainers', () => {
  it('requests every container with relationships populated', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchWasteContainers()

    const {url} = requestAt()
    expect(url.pathname).toBe('/api/waste-containers')
    expect(Object.fromEntries(url.searchParams)).toEqual({limit: '3000', page: '1', depth: '2'})
  })

  it('filters by status and waste type', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchWasteContainers({status: 'full', wasteType: 'glass', limit: 10, page: 4})

    expect(Object.fromEntries(requestAt().url.searchParams)).toEqual({
      limit: '10',
      page: '4',
      depth: '2',
      'where[status][equals]': 'full',
      'where[wasteType][equals]': 'glass',
    })
  })

  it('adds coordinates and absolute image URLs', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        docs: [
          {id: 1, location: [23.32, 42.69], image: {id: 5, url: '/media/c.jpg', alt: 'Bin'}},
          {id: 2, location: [23.3, 42.7], image: {url: 'https://cdn.test/d.jpg'}},
          {id: 3, location: [23.1, 42.5]},
        ],
      })
    )

    const {docs} = await fetchWasteContainers()

    expect(docs).toEqual([
      {
        id: 1,
        location: [23.32, 42.69],
        latitude: 42.69,
        longitude: 23.32,
        image: {id: 5, url: `${API}/media/c.jpg`, alt: 'Bin'},
      },
      {
        id: 2,
        location: [23.3, 42.7],
        latitude: 42.7,
        longitude: 23.3,
        image: {url: 'https://cdn.test/d.jpg'},
      },
      {id: 3, location: [23.1, 42.5], latitude: 42.5, longitude: 23.1, image: undefined},
    ])
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchWasteContainers()).rejects.toThrow(
      'Failed to fetch waste containers: Internal Server Error'
    )
  })
})

describe('fetchNearbyWasteContainers', () => {
  it('searches 500 m around the location by default', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchNearbyWasteContainers({latitude: 42.6977, longitude: 23.3219})

    const {url} = requestAt()
    expect(url.pathname).toBe('/api/waste-containers/nearby')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: '42.6977',
      longitude: '23.3219',
      radius: '500',
      limit: '500',
    })
  })

  it('applies the radius and filters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: []}))

    await fetchNearbyWasteContainers({latitude: 42.6, longitude: 23.3}, 150, {
      status: 'active',
      wasteType: 'paper',
      limit: 20,
    })

    expect(Object.fromEntries(requestAt().url.searchParams)).toEqual({
      latitude: '42.6',
      longitude: '23.3',
      radius: '150',
      limit: '20',
      status: 'active',
      wasteType: 'paper',
    })
  })

  it('adds coordinates and absolute image URLs', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        docs: [{id: 1, distance: 42, location: [23.32, 42.69], image: {url: '/media/e.jpg'}}],
      })
    )

    const {docs} = await fetchNearbyWasteContainers({latitude: 42.69, longitude: 23.32})

    expect(docs[0]).toMatchObject({
      distance: 42,
      latitude: 42.69,
      longitude: 23.32,
      image: {url: `${API}/media/e.jpg`},
    })
  })

  it('includes the server error body in the error', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(400, 'Bad Request', {error: 'Radius must be between 0 and 10000 meters'})
    )

    await expect(
      fetchNearbyWasteContainers({latitude: 42.69, longitude: 23.32}, 20000)
    ).rejects.toThrow(
      'Failed to fetch nearby waste containers: Bad Request - {"error":"Radius must be between 0 and 10000 meters"}'
    )
  })
})

describe('fetchWasteContainerById', () => {
  it('loads the container and its latest cleaning photo', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({id: 7, location: [23.32, 42.69], image: {id: 3, url: '/media/f.jpg'}})
      )
      .mockResolvedValueOnce(
        jsonResponse({docs: [{id: 99, photo: {url: '/media/clean.jpg', alt: 'Cleaned'}}]})
      )

    const container = await fetchWasteContainerById('7')

    expect(requestAt(0).url.href).toBe(`${API}/api/waste-containers/7?depth=1`)
    const obs = requestAt(1).url
    expect(obs.pathname).toBe('/api/waste-container-observations')
    expect(Object.fromEntries(obs.searchParams)).toEqual({
      'where[container][equals]': '7',
      sort: '-cleanedAt',
      limit: '1',
      depth: '1',
    })
    expect(container).toEqual({
      id: 7,
      location: [23.32, 42.69],
      latitude: 42.69,
      longitude: 23.32,
      image: {id: 3, url: `${API}/media/f.jpg`},
      lastCleanedPhoto: {url: `${API}/media/clean.jpg`, alt: 'Cleaned'},
    })
  })

  it.each([
    ['no observations', jsonResponse({docs: []})],
    ['an observation without a photo', jsonResponse({docs: [{id: 1, photo: null}]})],
    ['a failed observations request', errorResponse(500, 'Internal Server Error')],
  ])('has no cleaning photo when there are %s', async (_case, obsResponse) => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({id: 7, location: [23.32, 42.69]}))
      .mockResolvedValueOnce(obsResponse)

    const container = await fetchWasteContainerById('7')

    expect(container.lastCleanedPhoto).toBeUndefined()
    expect(container.latitude).toBe(42.69)
  })

  it('still returns the container when the observations request throws', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({id: 7, location: [23.32, 42.69]}))
      .mockRejectedValueOnce(new TypeError('Network request failed'))

    await expect(fetchWasteContainerById('7')).resolves.toMatchObject({id: 7, longitude: 23.32})
  })

  it('throws without looking up observations when the container request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404, 'Not Found'))

    await expect(fetchWasteContainerById('7')).rejects.toThrow(
      'Failed to fetch waste container: Not Found'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('cleanContainer', () => {
  it('posts the photo and notes as multipart form data', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    const result = {success: true, resolvedSignals: 2, container: {id: 5}}
    fetchMock.mockResolvedValueOnce(jsonResponse(result))

    await expect(cleanContainer(5, 'jwt', photo, 'Emptied')).resolves.toEqual(result)

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/waste-containers/5/clean`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({Authorization: 'Bearer jwt'})
    expect(init.body).toBeInstanceOf(FormData)
    expect(append.mock.calls).toEqual([
      ['photo', photo],
      ['notes', 'Emptied'],
    ])
  })

  it('sends a placeholder field when there is no photo or notes', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    fetchMock.mockResolvedValueOnce(jsonResponse({success: true}))

    await cleanContainer('5', 'jwt')

    expect(append.mock.calls).toEqual([['_empty', '']])
  })

  it('throws the server message', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(403, 'Forbidden', {message: 'Only inspectors can clean containers'})
    )

    await expect(cleanContainer('5', 'jwt')).rejects.toThrow('Only inspectors can clean containers')
  })

  it('falls back to the status text when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(cleanContainer('5', 'jwt')).rejects.toThrow(
      'Failed to clean container: Internal Server Error'
    )
  })
})

describe('createWasteContainer', () => {
  it('creates an active container', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 1}, message: 'Created'}))

    await expect(createWasteContainer(containerInput, 'jwt')).resolves.toEqual({
      doc: {id: 1},
      message: 'Created',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/waste-containers`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt',
    })
    const body = bodyAt()
    expect(body).toMatchObject({
      publicNumber: 'WC-001',
      wasteType: 'general',
      capacityVolume: 1.1,
      capacitySize: 'standard',
      binCount: 2,
      notes: 'Behind the school',
      status: 'active',
    })
    expect(body).not.toHaveProperty('image')
  })

  it('uploads the photo first and links it to the container', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 'img-9'}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 1}}))

    await createWasteContainer(containerInput, 'jwt', photo)

    const upload = requestAt(0)
    expect(upload.url.href).toBe(`${API}/api/media`)
    expect(upload.init.method).toBe('POST')
    expect(upload.init.headers).toEqual({Authorization: 'Bearer jwt'})
    expect(append).toHaveBeenCalledWith('file', photo)
    expect(bodyAt(1).image).toBe('img-9')
  })

  it('stops when the photo upload fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(413, 'Payload Too Large', {}))

    await expect(createWasteContainer(containerInput, 'jwt', photo)).rejects.toThrow(
      'Failed to upload container photo'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws the server message', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(400, 'Bad Request', {message: 'Public number must be unique'})
    )

    await expect(createWasteContainer(containerInput, 'jwt')).rejects.toThrow(
      'Public number must be unique'
    )
  })

  it('falls back to the status text when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(createWasteContainer(containerInput, 'jwt')).rejects.toThrow(
      'Failed to create waste container: Internal Server Error'
    )
  })

  // BUG: lib/payload.ts:1120-1124 sends `location` as the form's {latitude, longitude, address}
  // object. Since the backend moved to a Payload `point` field (see the Mar 2026 "Point
  // Structure" fix that updated signals but not containers), the server requires
  // [longitude, latitude] and rejects the object with "requires two numbers". The address
  // also belongs in the container's top-level `address` field.
  it.failing(
    'sends the location as a [longitude, latitude] point and a separate address',
    async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 1}}))

      await createWasteContainer(containerInput, 'jwt')

      expect(bodyAt()).toMatchObject({location: [23.3219, 42.6977], address: 'ul. Shipka 1'})
    }
  )
})

describe('updateWasteContainer', () => {
  it('patches the container', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 12}, message: 'Updated'}))

    await expect(updateWasteContainer('12', containerInput, 'jwt')).resolves.toEqual({
      doc: {id: 12},
      message: 'Updated',
    })

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/waste-containers/12`)
    expect(init.method).toBe('PATCH')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt',
    })
    const body = bodyAt()
    expect(body).toMatchObject({publicNumber: 'WC-001', binCount: 2, notes: 'Behind the school'})
    expect(body).not.toHaveProperty('image')
    expect(body).not.toHaveProperty('status')
  })

  it('uploads a new photo and links it to the container', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 'img-3'}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 12}}))

    await updateWasteContainer('12', containerInput, 'jwt', photo)

    expect(requestAt(0).url.href).toBe(`${API}/api/media`)
    expect(requestAt(0).init.headers).toEqual({Authorization: 'Bearer jwt'})
    expect(bodyAt(1).image).toBe('img-3')
  })

  it('stops when the photo upload fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error', {}))

    await expect(updateWasteContainer('12', containerInput, 'jwt', photo)).rejects.toThrow(
      'Failed to upload container photo'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws the server message or the status text', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(400, 'Bad Request', {message: 'Invalid capacity'}))
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(updateWasteContainer('12', containerInput, 'jwt')).rejects.toThrow(
      'Invalid capacity'
    )
    await expect(updateWasteContainer('12', containerInput, 'jwt')).rejects.toThrow(
      'Failed to update waste container: Internal Server Error'
    )
  })

  // BUG: lib/payload.ts:1173-1176 has the same problem as createWasteContainer: the form's
  // {latitude, longitude, address} object is sent as `location`, which the backend's point
  // field rejects, so editing a container from the app fails.
  it.failing(
    'sends the location as a [longitude, latitude] point and a separate address',
    async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 12}}))

      await updateWasteContainer('12', containerInput, 'jwt')

      expect(bodyAt()).toMatchObject({location: [23.3219, 42.6977], address: 'ul. Shipka 1'})
    }
  )
})
