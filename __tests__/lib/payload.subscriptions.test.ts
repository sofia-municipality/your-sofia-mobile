import {
  createSubscription,
  fetchMySubscription,
  fetchPushTokenId,
  setAuthErrorHandler,
  updateSubscription,
} from '../../lib/payload'

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const API = 'https://api.test'
const PUSH_TOKEN = 'ExponentPushToken[abc+123]'
const ENCODED_PUSH_TOKEN = 'ExponentPushToken%5Babc%2B123%5D'
const fetchMock = jest.fn()
const onAuthError = jest.fn()

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
  return {url: url as string, init: (init ?? {}) as RequestInit}
}

beforeEach(() => {
  fetchMock.mockReset()
  onAuthError.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
  setAuthErrorHandler(onAuthError)
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const subscription = {
  id: 15,
  enabled: true,
  pushToken: 3,
  categories: [],
  locationFilters: [],
  createdAt: '',
  updatedAt: '',
}

describe('fetchMySubscription', () => {
  it('looks the subscription up by the encoded push token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({subscription}))

    await expect(fetchMySubscription(PUSH_TOKEN)).resolves.toEqual(subscription)

    expect(requestAt().url).toBe(`${API}/api/subscriptions/mine?token=${ENCODED_PUSH_TOKEN}`)
  })

  it('returns null when the device has no subscription yet', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({subscription: null}))

    await expect(fetchMySubscription(PUSH_TOKEN)).resolves.toBeNull()
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchMySubscription(PUSH_TOKEN)).rejects.toThrow(
      'Failed to fetch subscription: Internal Server Error'
    )
  })
})

describe('createSubscription', () => {
  it('posts the subscription without credentials and returns the created document', async () => {
    const input = {pushToken: 3, categories: ['waste'], locationFilters: []}
    fetchMock.mockResolvedValueOnce(jsonResponse({doc: subscription, message: 'Created'}))

    await expect(createSubscription(input)).resolves.toEqual(subscription)

    const {url, init} = requestAt()
    expect(url).toBe(`${API}/api/subscriptions`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({'Content-Type': 'application/json'})
    expect(JSON.parse(init.body as string)).toEqual(input)
  })

  it('throws with the status text when the request fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(400, 'Bad Request'))

    await expect(createSubscription({pushToken: 3})).rejects.toThrow(
      'Failed to create subscription: Bad Request'
    )
  })
})

describe('updateSubscription', () => {
  const input = {enabled: false, categories: ['waste', 'water']}

  describe('with a push token', () => {
    it('patches the device’s subscription even when the user is signed in', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({doc: subscription}))

      await expect(updateSubscription(15, input, 'jwt', PUSH_TOKEN)).resolves.toEqual(subscription)

      const {url, init} = requestAt()
      expect(url).toBe(`${API}/api/subscriptions/mine?token=${ENCODED_PUSH_TOKEN}`)
      expect(init.method).toBe('PATCH')
      expect(init.headers).toEqual({'Content-Type': 'application/json'})
      expect(JSON.parse(init.body as string)).toEqual(input)
    })

    it('throws the server error', async () => {
      fetchMock.mockResolvedValueOnce(
        errorResponse(403, 'Forbidden', {error: 'Token does not own this subscription'})
      )

      await expect(updateSubscription(15, input, null, PUSH_TOKEN)).rejects.toThrow(
        'Failed to update subscription: Token does not own this subscription'
      )
    })

    it('falls back to the status text when the error body is not JSON', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(502, 'Bad Gateway'))

      await expect(updateSubscription(15, input, null, PUSH_TOKEN)).rejects.toThrow(
        'Failed to update subscription: Bad Gateway'
      )
    })

    it('does not log the user out on a 401, which is about the device token', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(401, 'Unauthorized', {}))

      await expect(updateSubscription(15, input, 'jwt', PUSH_TOKEN)).rejects.toThrow()
      expect(onAuthError).not.toHaveBeenCalled()
    })
  })

  describe('with only a user token', () => {
    it('patches the subscription by id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({doc: subscription}))

      await expect(updateSubscription(15, input, 'jwt')).resolves.toEqual(subscription)

      const {url, init} = requestAt()
      expect(url).toBe(`${API}/api/subscriptions/15`)
      expect(init.method).toBe('PATCH')
      expect(init.headers).toEqual({'Content-Type': 'application/json', Authorization: 'JWT jwt'})
      expect(JSON.parse(init.body as string)).toEqual(input)
    })

    it.each([
      [{message: 'Not allowed', error: 'ignored'}, 'Not allowed'],
      [{error: 'Validation failed'}, 'Validation failed'],
      [{}, 'Forbidden'],
    ])('throws the most specific error from %j', async (body, detail) => {
      fetchMock.mockResolvedValueOnce(errorResponse(403, 'Forbidden', body))

      await expect(updateSubscription(15, input, 'jwt', null)).rejects.toThrow(
        `Failed to update subscription: ${detail}`
      )
    })
  })

  it('refuses to update without any credentials', async () => {
    await expect(updateSubscription(15, input)).rejects.toThrow(
      'Cannot update subscription: no auth token and no push token'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('fetchPushTokenId', () => {
  it('resolves the document id of the push token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({docs: [{id: 3, token: PUSH_TOKEN}]}))

    await expect(fetchPushTokenId(PUSH_TOKEN)).resolves.toBe(3)

    expect(requestAt().url).toBe(
      `${API}/api/push-tokens?where[token][equals]=${ENCODED_PUSH_TOKEN}&limit=1`
    )
  })

  it.each([{docs: []}, {}])('throws when the token is not registered (%j)', async (body) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(body))

    await expect(fetchPushTokenId(PUSH_TOKEN)).rejects.toThrow(
      'Push token not registered on server'
    )
  })

  it('throws when the lookup fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500, 'Internal Server Error'))

    await expect(fetchPushTokenId(PUSH_TOKEN)).rejects.toThrow(
      'Could not resolve push token document'
    )
  })
})
