import {
  checkExistingSignal,
  createSignal,
  fetchSignalById,
  fetchSignalStats,
  fetchSignals,
  updateSignal,
} from '../../lib/payload'
import type {CreateSignalInput, Signal} from '../../types/signal'

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

function signal(overrides: Partial<Signal>): Signal {
  return {
    id: 's1',
    title: 'Overflowing container',
    description: '',
    category: 'waste-container',
    status: 'pending',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  }
}

function page(docs: Signal[], totalDocs = docs.length) {
  return {docs, totalDocs, limit: 20, page: 1, totalPages: 1}
}

/**
 * A stand-in for Payload's `GET /api/signals` that honours the `where[field][op]` filters
 * (equals, not_equals, in, not_in), `sort=-createdAt` and `limit`.
 */
function serveSignals(signals: Signal[]) {
  const fieldValue = (s: Signal, field: string): unknown =>
    field === 'cityObject.referenceId' ? s.cityObject?.referenceId : s[field as keyof Signal]

  fetchMock.mockImplementation(async (rawUrl: string) => {
    const params = new URL(rawUrl).searchParams
    const filters = new Map<string, {op: string; values: string[]}>()
    params.forEach((value, key) => {
      const match = /^where\[([^\]]+)\]\[([^\]]+)\](?:\[\d+\])?$/.exec(key)
      if (!match) return
      const [, field, op] = match
      const filter = filters.get(field) ?? {op, values: []}
      filter.values.push(...value.split(','))
      filters.set(field, filter)
    })

    const docs = signals
      .filter((s) =>
        [...filters].every(([field, {op, values}]) => {
          const value = String(fieldValue(s, field))
          if (op === 'equals' || op === 'in') return values.includes(value)
          if (op === 'not_equals' || op === 'not_in') return !values.includes(value)
          throw new Error(`Unsupported operator ${op}`)
        })
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const limit = Number(params.get('limit') ?? 10)
    return jsonResponse(page(docs.slice(0, limit), docs.length))
  })
}

describe('fetchSignals', () => {
  it('requests the newest signals with images populated', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(page([])))

    await fetchSignals()

    const {url} = requestAt()
    expect(url.pathname).toBe('/api/signals')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      limit: '20',
      page: '1',
      depth: '1',
      sort: '-createdAt',
    })
  })

  it('applies every filter', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(page([])))

    await fetchSignals({
      status: 'pending',
      category: 'waste-container',
      limit: 5,
      page: 2,
      reporterUniqueId: 'device-1',
      reporterUserId: 0,
      containerReferenceId: 'WC-001',
    })

    expect(Object.fromEntries(requestAt().url.searchParams)).toEqual({
      limit: '5',
      page: '2',
      depth: '1',
      sort: '-createdAt',
      'where[status][equals]': 'pending',
      'where[category][equals]': 'waste-container',
      'where[reporterUniqueId][equals]': 'device-1',
      'where[reporter][equals]': '0',
      'where[cityObject.referenceId][equals]': 'WC-001',
    })
  })

  it('makes image URLs absolute', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        page([
          signal({
            id: 'a',
            images: [
              {id: 1, url: '/media/a.jpg', alt: 'A'},
              {id: 2, url: 'https://cdn.test/b.jpg'},
            ],
          }),
          signal({id: 'b'}),
        ])
      )
    )

    const {docs} = await fetchSignals()

    expect(docs[0].images).toEqual([
      {id: 1, url: `${API}/media/a.jpg`, alt: 'A'},
      {id: 2, url: 'https://cdn.test/b.jpg'},
    ])
    expect(docs[1].images).toBeUndefined()
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchSignals()).rejects.toThrow('Failed to fetch signals: Internal Server Error')
  })
})

describe('fetchSignalById', () => {
  it('loads the signal with absolute image URLs', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(signal({id: 's9', images: [{id: 1, url: '/media/a.jpg'}]}))
    )

    const result = await fetchSignalById('s9')

    expect(requestAt().url.href).toBe(`${API}/api/signals/s9?depth=1`)
    expect(result.images).toEqual([{id: 1, url: `${API}/media/a.jpg`}])
  })

  it('returns a signal without images unchanged', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(signal({id: 's9'})))

    await expect(fetchSignalById('s9')).resolves.toEqual(signal({id: 's9'}))
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404, 'Not Found'))

    await expect(fetchSignalById('s9')).rejects.toThrow('Failed to fetch signal: Not Found')
  })
})

describe('createSignal', () => {
  const input: CreateSignalInput = {
    title: 'Broken fountain',
    category: 'drinking-fountain',
    location: {latitude: 42.6977, longitude: 23.3219, address: 'bul. Vitosha 1'},
    reporterUniqueId: 'device-1',
  }
  const photos = [
    {uri: 'file:///1.jpg', type: 'image/jpeg', name: '1.jpg'},
    {uri: 'file:///2.jpg', type: 'image/jpeg', name: '2.jpg'},
  ]

  it('sends no Authorization header for anonymous reporters', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 1}}))

    await createSignal(input)

    expect(requestAt().init.headers).toEqual({'Content-Type': 'application/json'})
  })

  it('sends the location as a [longitude, latitude] point', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 1}}))

    await createSignal(input)

    expect(bodyAt()).toEqual({
      title: 'Broken fountain',
      category: 'drinking-fountain',
      reporterUniqueId: 'device-1',
      location: [23.3219, 42.6977],
    })
  })

  it('leaves out the location when there is none', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 1}}))

    await createSignal({title: 'Noise', category: 'other'})

    expect(bodyAt()).toEqual({title: 'Noise', category: 'other'})
  })

  it('uploads each photo in order, reporting progress, then links them', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    const onProgress = jest.fn()
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 'img-1'}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 'img-2'}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 's1'}}))

    await createSignal(input, photos, 'device-1', undefined, onProgress)

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(requestAt(0).url.href).toBe(`${API}/api/media`)
    expect(requestAt(0).init.headers).toEqual({})
    expect(append.mock.calls).toEqual([
      ['file', photos[0]],
      ['_payload', JSON.stringify({reporterUniqueId: 'device-1'})],
      ['file', photos[1]],
      ['_payload', JSON.stringify({reporterUniqueId: 'device-1'})],
    ])
    expect(onProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ])
    expect(bodyAt(2)).toMatchObject({images: ['img-1', 'img-2'], location: [23.3219, 42.6977]})
  })

  it('reports the progress before each upload starts', async () => {
    const onProgress = jest.fn()
    fetchMock.mockImplementation(async () => {
      if (fetchMock.mock.calls.length === 1) expect(onProgress).toHaveBeenCalledWith(1, 2)
      if (fetchMock.mock.calls.length === 2) expect(onProgress).toHaveBeenCalledWith(2, 2)
      return jsonResponse({doc: {id: 'x'}})
    })

    await createSignal(input, photos, 'device-1', undefined, onProgress)

    expect(onProgress).toHaveBeenCalledTimes(2)
  })

  it('marks the upload as anonymous when there is no reporter id', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 'img-1'}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 's1'}}))

    await createSignal(input, [photos[0]])

    expect(append).toHaveBeenCalledWith('_payload', JSON.stringify({reporterUniqueId: null}))
  })

  it('stops at the first failed upload with the server message', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 'img-1'}}))
      .mockResolvedValueOnce(errorResponse(413, 'Payload Too Large', {message: 'File too big'}))

    await expect(createSignal(input, photos)).rejects.toThrow('File too big')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('names the photo when the failed upload has no message', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(createSignal(input, photos)).rejects.toThrow('Failed to upload photo: 1.jpg')
  })

  it.each([
    [{message: 'Top-level message', errors: [{message: 'Nested'}]}, 'Top-level message'],
    [{errors: [{message: 'The following field is invalid: title'}]}, 'invalid: title'],
    [{data: [{message: 'Daily limit reached'}]}, 'Daily limit reached'],
    [{}, 'Failed to create signal: Bad Request'],
  ])('throws the most specific error message from %j', async (body, message) => {
    fetchMock.mockResolvedValueOnce(errorResponse(400, 'Bad Request', body))

    await expect(createSignal(input)).rejects.toThrow(message)
  })

  it('returns the server response body', async () => {
    const body = {doc: {id: 's1'}, message: 'Signal successfully created.'}
    fetchMock.mockResolvedValueOnce(jsonResponse(body))

    await expect(createSignal(input)).resolves.toEqual(body)
  })
})

describe('checkExistingSignal', () => {
  it('looks up the reporter’s latest signal for the container', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(page([])))

    await checkExistingSignal('device-1', 'WC-001')

    const params = requestAt().url.searchParams
    expect(params.get('where[reporterUniqueId][equals]')).toBe('device-1')
    expect(params.get('where[cityObject.referenceId][equals]')).toBe('WC-001')
    expect(params.get('where[category][equals]')).toBe('waste-container')
  })

  it.each(['pending', 'in-progress'] as const)('finds a %s signal', async (status) => {
    const existing = signal({status})
    fetchMock.mockResolvedValueOnce(jsonResponse(page([existing])))

    await expect(checkExistingSignal('device-1', 'WC-001')).resolves.toEqual({
      exists: true,
      signal: existing,
    })
  })

  it.each(['resolved', 'rejected'] as const)('ignores a %s signal', async (status) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(page([signal({status})])))

    await expect(checkExistingSignal('device-1', 'WC-001')).resolves.toEqual({
      exists: false,
      signal: undefined,
    })
  })

  it('reports no signal when the lookup fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'))

    await expect(checkExistingSignal('device-1', 'WC-001')).resolves.toEqual({exists: false})
  })

  // BUG (latent, no callers yet): lib/payload.ts:958-968 asks the server for only the
  // newest signal (limit: 1) and filters out resolved/rejected ones afterwards. If the newest
  // signal is closed, an older one that is still open is never seen.
  it.failing('finds an open signal behind a newer closed one', async () => {
    const open = signal({
      id: 'old',
      status: 'pending',
      reporterUniqueId: 'device-1',
      cityObject: {type: 'waste-container', referenceId: 'WC-001'},
      createdAt: '2026-11-01T10:00:00.000Z',
    })
    const closed = signal({
      ...open,
      id: 'new',
      status: 'rejected',
      createdAt: '2026-11-02T10:00:00.000Z',
    })
    serveSignals([open, closed])

    await expect(checkExistingSignal('device-1', 'WC-001')).resolves.toEqual({
      exists: true,
      signal: open,
    })
  })
})

describe('fetchSignalStats', () => {
  it('counts all and still-open signals of the reporter', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        page(
          [
            signal({id: '1', status: 'pending'}),
            signal({id: '2', status: 'in-progress'}),
            signal({id: '3', status: 'resolved'}),
            signal({id: '4', status: 'rejected'}),
          ],
          4
        )
      )
    )

    await expect(fetchSignalStats('device-1')).resolves.toEqual({total: 4, active: 2})

    const params = requestAt().url.searchParams
    expect(params.get('where[reporterUniqueId][equals]')).toBe('device-1')
    expect(params.get('limit')).toBe('1000')
  })

  it('returns zeros when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchSignalStats('device-1')).resolves.toEqual({total: 0, active: 0})
  })
})

describe('updateSignal', () => {
  const newPhotos = [
    {uri: 'file:///n1.jpg', type: 'image/jpeg', name: 'n1.jpg'},
    {uri: 'file:///n2.jpg', type: 'image/jpeg', name: 'n2.jpg'},
  ]

  it('patches the given fields with the user’s token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 's9'}}))

    await updateSignal('s9', {status: 'resolved'}, 'jwt')

    const {url, init} = requestAt()
    expect(url.href).toBe(`${API}/api/signals/s9`)
    expect(init.method).toBe('PATCH')
    expect(init.headers).toEqual({'Content-Type': 'application/json', Authorization: 'JWT jwt'})
    expect(bodyAt()).toEqual({status: 'resolved'})
  })

  it('sends no Authorization header without a token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 's9'}}))

    await updateSignal('s9', {title: 'New title'})

    expect(requestAt().init.headers).toEqual({'Content-Type': 'application/json'})
  })

  it('sends the location as a [longitude, latitude] point', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 's9'}}))

    await updateSignal('s9', {location: {latitude: 42.6977, longitude: 23.3219}}, 'jwt')

    expect(bodyAt()).toEqual({location: [23.3219, 42.6977]})
  })

  it('removes every photo when the kept photo list is empty', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: {id: 's9'}}))

    await updateSignal('s9', {title: 'T', existingPhotoIds: []}, 'jwt')

    expect(bodyAt()).toEqual({title: 'T', images: []})
  })

  it('uploads new photos and keeps the existing ones first', async () => {
    const append = jest.spyOn(FormData.prototype, 'append')
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 21}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 22}}))
      .mockResolvedValueOnce(jsonResponse({doc: {id: 's9'}}))

    await updateSignal('s9', {title: 'T', existingPhotoIds: [3, 4], newPhotos}, 'jwt')

    expect(requestAt(0).url.href).toBe(`${API}/api/media`)
    expect(requestAt(0).init.headers).toEqual({Authorization: 'JWT jwt'})
    expect(append.mock.calls).toEqual([
      ['file', newPhotos[0]],
      ['file', newPhotos[1]],
    ])
    expect(bodyAt(2)).toEqual({title: 'T', images: [3, 4, 21, 22]})
  })

  it('stops at a failed upload without patching the signal', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({doc: {id: 21}}))
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(updateSignal('s9', {existingPhotoIds: [], newPhotos}, 'jwt')).rejects.toThrow(
      'Failed to upload photo: n2.jpg'
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('throws the upload error message from the server', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400, 'Bad Request', {message: 'Not an image'}))

    await expect(updateSignal('s9', {existingPhotoIds: [], newPhotos}, 'jwt')).rejects.toThrow(
      'Not an image'
    )
  })

  it('throws the server message or the status text', async () => {
    fetchMock
      .mockResolvedValueOnce(errorResponse(403, 'Forbidden', {message: 'Not your signal'}))
      .mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(updateSignal('s9', {title: 'T'}, 'jwt')).rejects.toThrow('Not your signal')
    await expect(updateSignal('s9', {title: 'T'}, 'jwt')).rejects.toThrow(
      'Failed to update signal: Internal Server Error'
    )
  })

  it('returns the server response body', async () => {
    const body = {doc: {id: 's9', status: 'resolved'}, message: 'Updated successfully.'}
    fetchMock.mockResolvedValueOnce(jsonResponse(body))

    await expect(updateSignal('s9', {status: 'resolved'}, 'jwt')).resolves.toEqual(body)
  })
})
