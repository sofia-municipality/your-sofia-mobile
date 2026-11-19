import {
  cleanContainer,
  fetchNearbyWasteContainers,
  fetchSignals,
  updateSignal,
} from '../../lib/payload'
import {
  closeSignalsWithPhotos,
  createObjectsFromPhotos,
  createSignalsFromPhotos,
  findClosestCityObject,
  findNearbySignals,
  groupPhotosByProximity,
  uploadPhotos,
  type PhotoGroup,
  type PhotoWithMetadata,
} from '../../lib/bulkPhotoUtils'

jest.mock('../../lib/payload', () => ({
  fetchNearbyWasteContainers: jest.fn(),
  fetchSignals: jest.fn(),
  updateSignal: jest.fn(),
  cleanContainer: jest.fn(),
}))
jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const mockFetchNearby = fetchNearbyWasteContainers as jest.Mock
const mockFetchSignals = fetchSignals as jest.Mock
const mockUpdateSignal = updateSignal as jest.Mock
const mockCleanContainer = cleanContainer as jest.Mock
const fetchMock = jest.fn()

/** Records appended parts so tests can inspect multipart uploads. */
class FakeFormData {
  parts: [string, unknown][] = []
  append(key: string, value: unknown) {
    this.parts.push([key, value])
  }
}

const originalFormData = globalThis.FormData

// ~1.1 m of latitude in Sofia
const METER = 0.00001

function photo(id: string, latOffsetMeters = 0, minutes = 0): PhotoWithMetadata {
  return {
    id,
    uri: `file:///photos/${id}.jpg`,
    latitude: 42.7 + latOffsetMeters * METER * 0.9,
    longitude: 23.3,
    timestamp: new Date(Date.UTC(2026, 10, 16, 9, minutes)),
  }
}

function group(...photos: PhotoWithMetadata[]): PhotoGroup {
  return {
    centerLocation: {latitude: photos[0].latitude!, longitude: photos[0].longitude!},
    photos,
    timestamp: photos[0].timestamp!,
  }
}

const container = {id: 'c-1', publicNumber: 'WC-0042', distance: 3}

function okJson(body: unknown) {
  return {ok: true, status: 200, json: async () => body}
}
function failedJson(status: number, body: unknown = {message: 'nope'}) {
  return {ok: false, status, json: async () => body}
}

/** Routes fetch calls: media uploads return incrementing ids, other endpoints use the given handler. */
function routeFetch(handlers: {media?: () => unknown; other?: (url: string) => unknown} = {}) {
  let mediaId = 100
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('/api/media')) {
      return handlers.media ? handlers.media() : okJson({doc: {id: `m-${mediaId++}`}})
    }
    return handlers.other ? handlers.other(url) : okJson({id: 'created'})
  })
}

function callsTo(path: string) {
  return fetchMock.mock.calls.filter(([url]) => url === `https://api.test${path}`)
}

beforeEach(() => {
  jest.clearAllMocks()
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  globalThis.FormData = FakeFormData as unknown as typeof FormData
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
  globalThis.FormData = originalFormData
})

describe('groupPhotosByProximity', () => {
  it('groups photos taken within 10 m of each other', () => {
    const groups = groupPhotosByProximity([photo('a'), photo('b', 5), photo('c', 50)])

    expect(groups.map((g) => g.photos.map((p) => p.id))).toEqual([['a', 'b'], ['c']])
  })

  it('puts the group center at the average position', () => {
    const [only] = groupPhotosByProximity([photo('a'), photo('b', 8)])

    expect(only.centerLocation.latitude).toBeCloseTo(42.7 + 4 * METER * 0.9, 10)
    expect(only.centerLocation.longitude).toBeCloseTo(23.3, 10)
  })

  it('dates the group by its earliest photo', () => {
    const [only] = groupPhotosByProximity([photo('late', 0, 30), photo('early', 2, 5)])

    expect(only.timestamp).toEqual(new Date(Date.UTC(2026, 10, 16, 9, 5)))
  })

  it('measures distance from the first photo of a group, not the nearest member', () => {
    // b is 8 m from a, c is 8 m from b but 16 m from a
    const groups = groupPhotosByProximity([photo('a'), photo('b', 8), photo('c', 16)])

    expect(groups.map((g) => g.photos.map((p) => p.id))).toEqual([['a', 'b'], ['c']])
  })

  it('accepts a custom radius', () => {
    const photos = [photo('a'), photo('b', 40)]

    expect(groupPhotosByProximity(photos, 10)).toHaveLength(2)
    expect(groupPhotosByProximity(photos, 50)).toHaveLength(1)
  })

  it('skips photos without coordinates or a timestamp', () => {
    const groups = groupPhotosByProximity([
      {...photo('no-lat'), latitude: undefined},
      {...photo('no-lng'), longitude: undefined},
      {...photo('no-time'), timestamp: undefined},
      photo('ok'),
    ])

    expect(groups.map((g) => g.photos.map((p) => p.id))).toEqual([['ok']])
  })

  it('puts each photo in exactly one group', () => {
    const photos = [photo('a'), photo('b', 3), photo('c', 30), photo('d', 32), photo('e', 90)]

    const ids = groupPhotosByProximity(photos).flatMap((g) => g.photos.map((p) => p.id))

    expect(ids.sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('returns no groups for no photos', () => {
    expect(groupPhotosByProximity([])).toEqual([])
  })
})

describe('findClosestCityObject', () => {
  const here = {latitude: 42.7, longitude: 23.3}

  it('asks for the single closest active container within 10 m', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})

    await expect(findClosestCityObject(here)).resolves.toBe(container)
    expect(mockFetchNearby).toHaveBeenCalledWith(here, 10, {limit: 1, status: 'active'})
  })

  it('accepts a custom distance', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})

    await findClosestCityObject(here, 25)

    expect(mockFetchNearby).toHaveBeenCalledWith(here, 25, expect.anything())
  })

  it('returns null when nothing is nearby', async () => {
    mockFetchNearby.mockResolvedValue({docs: []})

    await expect(findClosestCityObject(here)).resolves.toBeNull()
  })

  it('returns null when the request fails', async () => {
    mockFetchNearby.mockRejectedValue(new Error('offline'))

    await expect(findClosestCityObject(here)).resolves.toBeNull()
    expect(console.error).toHaveBeenCalledWith('[findClosestCityObject] Error:', expect.any(Error))
  })
})

describe('findNearbySignals', () => {
  const here = {latitude: 42.7, longitude: 23.3}
  const signalAt = (id: string, location?: {latitude?: number; longitude?: number}) => ({
    id,
    status: 'pending',
    location,
  })

  it('returns the latest signals within the radius', async () => {
    mockFetchSignals.mockResolvedValue({
      docs: [
        signalAt('close', {latitude: 42.7 + 5 * METER, longitude: 23.3}),
        signalAt('far', {latitude: 42.7 + 50 * METER, longitude: 23.3}),
        signalAt('no-location'),
        signalAt('no-longitude', {latitude: 42.7}),
      ],
    })

    const signals = await findNearbySignals(here)

    expect(signals.map((s) => s.id)).toEqual(['close'])
    expect(mockFetchSignals).toHaveBeenCalledWith({limit: 100})
  })

  it('accepts a custom radius', async () => {
    mockFetchSignals.mockResolvedValue({
      docs: [signalAt('far', {latitude: 42.7 + 50 * METER, longitude: 23.3})],
    })

    await expect(findNearbySignals(here, 100)).resolves.toHaveLength(1)
  })

  it('returns no signals when the request fails', async () => {
    mockFetchSignals.mockRejectedValue(new Error('offline'))

    await expect(findNearbySignals(here)).resolves.toEqual([])
  })
})

describe('uploadPhotos', () => {
  it('uploads each photo and returns the media ids in order', async () => {
    routeFetch()

    await expect(uploadPhotos([photo('a'), photo('b')], 'device-1')).resolves.toEqual([
      'm-100',
      'm-101',
    ])
    expect(callsTo('/api/media')).toHaveLength(2)
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
  })

  it('sends the file and the reporter id as multipart parts', async () => {
    routeFetch()

    await uploadPhotos([photo('a')], 'device-1')

    const body = fetchMock.mock.calls[0][1].body as FakeFormData
    expect(body.parts).toEqual([
      ['file', {uri: 'file:///photos/a.jpg', type: 'image/jpeg', name: 'photo-a.jpg'}],
      ['_payload', JSON.stringify({reporterUniqueId: 'device-1'})],
    ])
  })

  it('sends a null reporter id when none is given', async () => {
    routeFetch()

    await uploadPhotos([photo('a')])

    const body = fetchMock.mock.calls[0][1].body as FakeFormData
    expect(body.parts[1]).toEqual(['_payload', '{"reporterUniqueId":null}'])
  })

  it('reports progress before each upload', async () => {
    routeFetch()
    const onProgress = jest.fn()

    await uploadPhotos([photo('a'), photo('b'), photo('c')], 'device-1', onProgress)

    expect(onProgress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  it('skips photos that fail to upload and keeps going', async () => {
    fetchMock
      .mockResolvedValueOnce(failedJson(413))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(okJson({doc: {id: 'm-3'}}))

    await expect(uploadPhotos([photo('a'), photo('b'), photo('c')], 'device-1')).resolves.toEqual([
      'm-3',
    ])
  })
})

describe('createSignalsFromPhotos', () => {
  const groupA = group(photo('a'), photo('b', 3))

  it('creates a "full" signal for the container next to each group', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})
    routeFetch()

    await expect(createSignalsFromPhotos([groupA], 'device-1')).resolves.toEqual({
      created: 1,
      failed: 0,
    })

    const [signalCall] = callsTo('/api/signals')
    expect(signalCall[1].method).toBe('POST')
    expect(JSON.parse(signalCall[1].body)).toEqual({
      title: 'Сигнал от масово качване на снимки',
      description: 'Създаден от масово качване на снимки',
      category: 'waste-container',
      cityObject: {type: 'waste-container', referenceId: 'WC-0042', name: 'Контейнер WC-0042'},
      containerState: ['full'],
      location: [groupA.centerLocation.longitude, groupA.centerLocation.latitude],
      reporterUniqueId: 'device-1',
      images: ['m-100', 'm-101'],
    })
  })

  it('looks for the container within 10 m of the group center', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})
    routeFetch()

    await createSignalsFromPhotos([groupA], 'device-1')

    expect(mockFetchNearby).toHaveBeenCalledWith(groupA.centerLocation, 10, expect.anything())
  })

  it('counts a group with no container nearby as failed without uploading', async () => {
    mockFetchNearby.mockResolvedValue({docs: []})

    await expect(createSignalsFromPhotos([groupA], 'device-1')).resolves.toEqual({
      created: 0,
      failed: 1,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('counts a group whose photos all fail to upload as failed', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})
    routeFetch({media: () => failedJson(500)})

    await expect(createSignalsFromPhotos([groupA], 'device-1')).resolves.toEqual({
      created: 0,
      failed: 1,
    })
    expect(callsTo('/api/signals')).toHaveLength(0)
  })

  it('counts a rejected signal as failed', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})
    routeFetch({other: () => failedJson(400)})

    await expect(createSignalsFromPhotos([groupA], 'device-1')).resolves.toEqual({
      created: 0,
      failed: 1,
    })
  })

  it('counts a network error as failed and moves on to the next group', async () => {
    const groupB = group(photo('c', 200))
    mockFetchNearby.mockResolvedValue({docs: [container]})
    let signalRequests = 0
    routeFetch({
      other: () => {
        signalRequests++
        if (signalRequests === 1) throw new Error('offline')
        return okJson({id: 'sig-2'})
      },
    })

    await expect(createSignalsFromPhotos([groupA, groupB], 'device-1')).resolves.toEqual({
      created: 1,
      failed: 1,
    })
  })

  it('reports progress per group', async () => {
    mockFetchNearby.mockResolvedValue({docs: []})
    const onProgress = jest.fn()

    await createSignalsFromPhotos([groupA, groupA], 'device-1', onProgress)

    expect(onProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ])
  })

  // BUG: the API only lets logged-in users create signals (Signals access `create: !!user` in
  // your-sofia-api), but this POST has no Authorization header and the function takes no token.
  // Every group fails with 403, after its photos were already uploaded.
  it.failing('creates the signals as the logged-in user', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})
    routeFetch()

    await createSignalsFromPhotos([groupA], 'device-1')

    const [signalCall] = callsTo('/api/signals')
    expect(signalCall[1].headers).toHaveProperty('Authorization')
  })
})

describe('closeSignalsWithPhotos', () => {
  const groupA = group(photo('a'), photo('b', 3))

  it('cleans the container next to each group with the first photo', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})
    mockCleanContainer.mockResolvedValue({success: true, container, resolvedSignals: 0})

    await expect(closeSignalsWithPhotos([groupA], 'token-1')).resolves.toEqual({
      closedSignals: 0,
      cleanedContainers: 1,
      failed: 0,
    })
    expect(mockCleanContainer).toHaveBeenCalledWith(
      'c-1',
      'token-1',
      {uri: 'file:///photos/a.jpg', type: 'image/jpeg', name: 'photo-a.jpg'},
      'от масово качване на снимки.'
    )
  })

  it('counts a group with no container nearby as failed', async () => {
    mockFetchNearby.mockResolvedValue({docs: []})

    await expect(closeSignalsWithPhotos([groupA], 'token-1')).resolves.toEqual({
      closedSignals: 0,
      cleanedContainers: 0,
      failed: 1,
    })
    expect(mockCleanContainer).not.toHaveBeenCalled()
  })

  it('counts a failed clean as failed and moves on', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})
    mockCleanContainer
      .mockRejectedValueOnce(new Error('Forbidden'))
      .mockResolvedValueOnce({success: true, container, resolvedSignals: 0})

    await expect(closeSignalsWithPhotos([groupA, groupA], 'token-1')).resolves.toEqual({
      closedSignals: 0,
      cleanedContainers: 1,
      failed: 1,
    })
  })

  it('reports progress per group', async () => {
    mockFetchNearby.mockResolvedValue({docs: []})
    const onProgress = jest.fn()

    await closeSignalsWithPhotos([groupA, groupA, groupA], 'token-1', onProgress)

    expect(onProgress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ])
  })

  // BUG: cleaning a container resolves its open signals and the API returns how many
  // (`resolvedSignals`), but the result is ignored and closedSignals is never incremented.
  // The bulk upload screen always says "Closed 0 signals".
  it.failing('reports how many signals the cleaning resolved', async () => {
    mockFetchNearby.mockResolvedValue({docs: [container]})
    mockCleanContainer.mockResolvedValue({success: true, container, resolvedSignals: 3})

    const result = await closeSignalsWithPhotos([groupA], 'token-1')

    expect(result.closedSignals).toBe(3)
  })
})

describe('createObjectsFromPhotos', () => {
  const groupA = group(photo('a'), photo('b', 3))
  const signal = (id: string, status: string) => ({
    id,
    status,
    location: {latitude: 42.7, longitude: 23.3},
  })

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(1763287200000)
    mockFetchSignals.mockResolvedValue({docs: []})
    mockUpdateSignal.mockResolvedValue({})
  })

  it('creates a standard general-waste container at each group with the first photo', async () => {
    routeFetch()

    await expect(createObjectsFromPhotos([groupA], 'token-1', 'device-1')).resolves.toEqual({
      createdObjects: 1,
      closedSignals: 0,
      failed: 0,
    })

    const [containerCall] = callsTo('/api/waste-containers')
    expect(containerCall[1]).toMatchObject({
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: 'Bearer token-1'},
    })
    expect(JSON.parse(containerCall[1].body)).toEqual({
      publicNumber: 'WC-1763287200000-0',
      image: 'm-100',
      location: groupA.centerLocation,
      capacityVolume: 1.1,
      capacitySize: 'standard',
      binCount: 1,
      wasteType: 'general',
      status: 'active',
      notes: 'Създаден от масово качване на снимки. Общо снимки: 2',
    })
  })

  it('gives each container in a batch its own public number', async () => {
    routeFetch()

    await createObjectsFromPhotos([groupA, groupA], 'token-1', 'device-1')

    const numbers = callsTo('/api/waste-containers').map(([, init]) => {
      return JSON.parse(init.body).publicNumber
    })
    expect(numbers).toEqual(['WC-1763287200000-0', 'WC-1763287200000-1'])
  })

  it('resolves the open signals next to a new container', async () => {
    routeFetch()
    mockFetchSignals.mockResolvedValue({
      docs: [
        signal('pending', 'pending'),
        signal('in-progress', 'in-progress'),
        signal('resolved', 'resolved'),
        signal('rejected', 'rejected'),
      ],
    })

    const result = await createObjectsFromPhotos([groupA], 'token-1', 'device-1')

    expect(result.closedSignals).toBe(2)
    expect(mockUpdateSignal.mock.calls.map(([id, data]) => [id, data])).toEqual([
      ['pending', {status: 'resolved'}],
      ['in-progress', {status: 'resolved'}],
    ])
  })

  it('keeps going when a signal cannot be resolved', async () => {
    routeFetch()
    mockFetchSignals.mockResolvedValue({docs: [signal('s1', 'pending'), signal('s2', 'pending')]})
    mockUpdateSignal.mockRejectedValueOnce(new Error('Forbidden')).mockResolvedValueOnce({})

    await expect(createObjectsFromPhotos([groupA], 'token-1', 'device-1')).resolves.toEqual({
      createdObjects: 1,
      closedSignals: 1,
      failed: 0,
    })
  })

  it('counts a group whose photos all fail to upload as failed', async () => {
    routeFetch({media: () => failedJson(500)})

    await expect(createObjectsFromPhotos([groupA], 'token-1', 'device-1')).resolves.toEqual({
      createdObjects: 0,
      closedSignals: 0,
      failed: 1,
    })
    expect(callsTo('/api/waste-containers')).toHaveLength(0)
  })

  it('does not resolve signals when the container is rejected', async () => {
    routeFetch({other: () => failedJson(403)})
    mockFetchSignals.mockResolvedValue({docs: [signal('s1', 'pending')]})

    await expect(createObjectsFromPhotos([groupA], 'token-1', 'device-1')).resolves.toEqual({
      createdObjects: 0,
      closedSignals: 0,
      failed: 1,
    })
    expect(mockUpdateSignal).not.toHaveBeenCalled()
  })

  it('counts a network error as failed', async () => {
    routeFetch({
      other: () => {
        throw new Error('offline')
      },
    })

    await expect(createObjectsFromPhotos([groupA], 'token-1', 'device-1')).resolves.toEqual({
      createdObjects: 0,
      closedSignals: 0,
      failed: 1,
    })
  })

  it('reports progress per group', async () => {
    routeFetch()
    const onProgress = jest.fn()

    await createObjectsFromPhotos([groupA, groupA], 'token-1', 'device-1', onProgress)

    expect(onProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ])
  })

  // BUG: updateSignal's third parameter is the auth token, but the reporter's device id is
  // passed instead, so the PATCH goes out as `Authorization: JWT <device id>`. The API rejects
  // it, the error is swallowed, and nearby signals are never resolved.
  it.failing("resolves the signals with the user's token", async () => {
    routeFetch()
    mockFetchSignals.mockResolvedValue({docs: [signal('s1', 'pending')]})

    await createObjectsFromPhotos([groupA], 'token-1', 'device-1')

    expect(mockUpdateSignal).toHaveBeenCalledWith('s1', {status: 'resolved'}, 'token-1')
  })
})
