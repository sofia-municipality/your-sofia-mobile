import {Alert} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {router} from 'expo-router'
import {act, renderHook, waitFor} from '@testing-library/react-native'
import {AuthApiError, AuthProvider, useAuth} from '../../contexts/AuthContext'
import {fetchMissionProfileMe, setAuthErrorHandler, updateSubscription} from '../../lib/payload'

jest.mock('expo-router', () => ({
  router: {push: jest.fn()},
}))

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

jest.mock('../../lib/payload', () => ({
  fetchMissionProfileMe: jest.fn(),
  setAuthErrorHandler: jest.fn(),
  updateSubscription: jest.fn(),
}))

const mockFetchProfile = fetchMissionProfileMe as jest.Mock
const mockSetAuthErrorHandler = setAuthErrorHandler as jest.Mock
const mockUpdateSubscription = updateSubscription as jest.Mock

const IN_ONE_HOUR = Math.floor(Date.now() / 1000) + 60 * 60
const AN_HOUR_AGO = Math.floor(Date.now() / 1000) - 60 * 60

function makeToken(payload: Record<string, unknown>) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${encode({alg: 'HS256', typ: 'JWT'})}.${encode(payload)}.signature`
}

const TOKEN = makeToken({id: 7, collection: 'users', email: 'ivan@abv.bg', exp: IN_ONE_HOUR})
const USER = {id: 7, email: 'ivan@abv.bg', name: 'Ivan', role: 'user'}
const PROFILE = {darPoints: 120, contributorLevel: 'guardian'}

function jsonResponse(body: unknown, init: {ok?: boolean; status?: number} = {}) {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: jest.fn().mockResolvedValue(body),
  }
}

function unparsableResponse(status: number) {
  return {ok: false, status, json: jest.fn().mockRejectedValue(new SyntaxError('Unexpected <'))}
}

const fetchMock = () => global.fetch as jest.Mock

async function storeSession(token = TOKEN, user: object = USER) {
  await AsyncStorage.multiSet([
    ['auth_token', token],
    ['auth_user', JSON.stringify(user)],
  ])
}

async function renderAuth() {
  const hook = await renderHook(() => useAuth(), {wrapper: AuthProvider})
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
  return hook
}

async function renderLoggedIn(user: object = USER) {
  await storeSession(TOKEN, user)
  return renderAuth()
}

describe('AuthContext', () => {
  let logSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    global.fetch = jest.fn() as unknown as typeof fetch
    mockFetchProfile.mockResolvedValue(PROFILE)
    mockUpdateSubscription.mockResolvedValue({})
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('throws when used outside AuthProvider', async () => {
    await expect(renderHook(() => useAuth())).rejects.toThrow(
      'useAuth must be used within an AuthProvider'
    )
  })

  describe('restoring the session', () => {
    it('is loading until the stored session has been read', async () => {
      await storeSession()
      const renders: {isLoading: boolean; isAuthenticated: boolean}[] = []

      const {result} = await renderHook(
        () => {
          const auth = useAuth()
          renders.push({isLoading: auth.isLoading, isAuthenticated: auth.isAuthenticated})
          return auth
        },
        {wrapper: AuthProvider}
      )
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(renders[0]).toEqual({isLoading: true, isAuthenticated: false})
      expect(renders.at(-1)).toEqual({isLoading: false, isAuthenticated: true})
    })

    it('restores a stored session', async () => {
      const {result} = await renderLoggedIn()

      expect(result.current).toMatchObject({
        user: USER,
        token: TOKEN,
        isAuthenticated: true,
      })
    })

    it('starts logged out when nothing is stored', async () => {
      const {result} = await renderAuth()

      expect(result.current).toMatchObject({user: null, token: null, isAuthenticated: false})
    })

    it('ignores a token stored without its user', async () => {
      await AsyncStorage.setItem('auth_token', TOKEN)

      const {result} = await renderAuth()

      expect(result.current.token).toBeNull()
    })

    it('drops an expired session from storage', async () => {
      await storeSession(makeToken({id: 7, exp: AN_HOUR_AGO}))

      const {result} = await renderAuth()

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(await AsyncStorage.getItem('auth_token')).toBeNull()
      expect(await AsyncStorage.getItem('auth_user')).toBeNull()
    })

    it('treats a malformed token as expired', async () => {
      await storeSession('not-a-jwt')

      const {result} = await renderAuth()

      expect(result.current.isAuthenticated).toBe(false)
      expect(await AsyncStorage.getItem('auth_token')).toBeNull()
    })

    it('accepts a token without an expiry', async () => {
      await storeSession(makeToken({id: 7}))

      const {result} = await renderAuth()

      expect(result.current.isAuthenticated).toBe(true)
    })

    it('finishes loading when storage cannot be read', async () => {
      jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk I/O'))

      const {result} = await renderAuth()

      expect(result.current.isAuthenticated).toBe(false)
      expect(errorSpy).toHaveBeenCalledWith('Error loading auth state:', expect.any(Error))
    })

    // BUG: isTokenExpired() decodes the JWT payload with atob(), but JWTs are
    // base64url-encoded. When the payload contains '-' or '_' (here because of
    // the '~' in the email) atob throws and the token is treated as expired, so
    // the user is logged out on every app start.
    it.failing('restores a session whose token payload needs base64url characters', async () => {
      const token = makeToken({
        id: 7,
        collection: 'users',
        email: 'ivan.p~@abv.bg',
        iat: 1700000000,
        exp: 4102444800,
      })
      expect(token.split('.')[1]).toMatch(/[-_]/)
      await storeSession(token, {...USER, email: 'ivan.p~@abv.bg'})

      const {result} = await renderAuth()

      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('login', () => {
    it('logs in and stores the session with the mission profile', async () => {
      fetchMock().mockResolvedValueOnce(jsonResponse({token: TOKEN, user: USER}))
      const {result} = await renderAuth()

      await act(() => result.current.login('ivan@abv.bg', 'Secret1!'))

      expect(global.fetch).toHaveBeenCalledWith('https://api.test/api/users/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: 'ivan@abv.bg', password: 'Secret1!'}),
      })
      expect(mockFetchProfile).toHaveBeenCalledWith(TOKEN)
      const expectedUser = {...USER, ...PROFILE}
      expect(result.current).toMatchObject({
        user: expectedUser,
        token: TOKEN,
        isAuthenticated: true,
      })
      expect(await AsyncStorage.getItem('auth_token')).toBe(TOKEN)
      expect(JSON.parse((await AsyncStorage.getItem('auth_user'))!)).toEqual(expectedUser)
    })

    it('logs in with beginner defaults when the mission profile is unavailable', async () => {
      fetchMock().mockResolvedValueOnce(jsonResponse({token: TOKEN, user: USER}))
      mockFetchProfile.mockRejectedValueOnce(new Error('503'))
      const {result} = await renderAuth()

      await act(() => result.current.login('ivan@abv.bg', 'Secret1!'))

      expect(result.current.user).toEqual({...USER, darPoints: 0, contributorLevel: 'beginner'})
      expect(result.current.isAuthenticated).toBe(true)
    })

    it("links the device's anonymous subscription to the user", async () => {
      await AsyncStorage.setItem('subscriptionId', 'sub-1')
      fetchMock().mockResolvedValueOnce(jsonResponse({token: TOKEN, user: USER}))
      const {result} = await renderAuth()

      await act(() => result.current.login('ivan@abv.bg', 'Secret1!'))

      expect(mockUpdateSubscription).toHaveBeenCalledWith('sub-1', {user: 7}, TOKEN)
    })

    it('does not link anything when the device has no subscription', async () => {
      fetchMock().mockResolvedValueOnce(jsonResponse({token: TOKEN, user: USER}))
      const {result} = await renderAuth()

      await act(() => result.current.login('ivan@abv.bg', 'Secret1!'))

      expect(mockUpdateSubscription).not.toHaveBeenCalled()
    })

    it('stays logged in when linking the subscription fails', async () => {
      await AsyncStorage.setItem('subscriptionId', 'sub-1')
      mockUpdateSubscription.mockRejectedValueOnce(new Error('404'))
      fetchMock().mockResolvedValueOnce(jsonResponse({token: TOKEN, user: USER}))
      const {result} = await renderAuth()

      await act(() => result.current.login('ivan@abv.bg', 'Secret1!'))

      expect(result.current.isAuthenticated).toBe(true)
    })

    it('rejects with the status and first error message from the API', async () => {
      fetchMock().mockResolvedValueOnce(
        jsonResponse(
          {errors: [{message: 'Please verify your email'}], message: 'Forbidden'},
          {ok: false, status: 403}
        )
      )
      const {result} = await renderAuth()

      const error = await act(() =>
        result.current.login('ivan@abv.bg', 'Secret1!').catch((e: unknown) => e)
      )

      expect(error).toBeInstanceOf(AuthApiError)
      expect(error).toMatchObject({message: 'Please verify your email', status: 403})
      expect(result.current.isAuthenticated).toBe(false)
      expect(await AsyncStorage.getItem('auth_token')).toBeNull()
    })

    it('falls back to the top-level API message', async () => {
      fetchMock().mockResolvedValueOnce(
        jsonResponse({message: 'Invalid credentials'}, {ok: false, status: 401})
      )
      const {result} = await renderAuth()

      await expect(result.current.login('ivan@abv.bg', 'wrong')).rejects.toMatchObject({
        message: 'Invalid credentials',
        status: 401,
      })
    })

    it('uses a generic message when the error body is not JSON', async () => {
      fetchMock().mockResolvedValueOnce(unparsableResponse(502))
      const {result} = await renderAuth()

      await expect(result.current.login('ivan@abv.bg', 'wrong')).rejects.toMatchObject({
        message: 'Login failed',
        status: 502,
      })
    })

    it('rethrows network failures', async () => {
      fetchMock().mockRejectedValueOnce(new TypeError('Network request failed'))
      const {result} = await renderAuth()

      await expect(result.current.login('ivan@abv.bg', 'Secret1!')).rejects.toThrow(
        'Network request failed'
      )
    })
  })

  describe('register', () => {
    it('creates a regular user', async () => {
      fetchMock().mockResolvedValueOnce(jsonResponse({doc: {id: 8}}))
      const {result} = await renderAuth()

      await act(() => result.current.register('Ivan', 'ivan@abv.bg', 'Secret1!'))

      expect(global.fetch).toHaveBeenCalledWith('https://api.test/api/users', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          name: 'Ivan',
          email: 'ivan@abv.bg',
          password: 'Secret1!',
          role: 'user',
        }),
      })
      // Registration requires email verification, so the user is not logged in.
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('rejects with the API error message', async () => {
      fetchMock().mockResolvedValueOnce(
        jsonResponse({errors: [{message: 'Email already registered'}]}, {ok: false, status: 400})
      )
      const {result} = await renderAuth()

      await expect(result.current.register('Ivan', 'ivan@abv.bg', 'Secret1!')).rejects.toThrow(
        'Email already registered'
      )
    })

    it('uses a generic message when the error body is not JSON', async () => {
      fetchMock().mockResolvedValueOnce(unparsableResponse(500))
      const {result} = await renderAuth()

      await expect(result.current.register('Ivan', 'ivan@abv.bg', 'Secret1!')).rejects.toThrow(
        'Registration failed'
      )
    })
  })

  describe('logout', () => {
    it('clears the session from memory and storage', async () => {
      const {result} = await renderLoggedIn()

      await act(() => result.current.logout())

      expect(result.current).toMatchObject({user: null, token: null, isAuthenticated: false})
      expect(await AsyncStorage.getItem('auth_token')).toBeNull()
      expect(await AsyncStorage.getItem('auth_user')).toBeNull()
    })

    it('rethrows when storage cannot be cleared', async () => {
      const {result} = await renderLoggedIn()
      jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('disk I/O'))

      await expect(result.current.logout()).rejects.toThrow('disk I/O')
    })
  })

  describe('deleteAccount', () => {
    it('deletes the account and logs out', async () => {
      const {result} = await renderLoggedIn()
      fetchMock().mockResolvedValueOnce(jsonResponse({}))

      await act(() => result.current.deleteAccount())

      expect(global.fetch).toHaveBeenCalledWith('https://api.test/api/users/delete-account', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}`},
      })
      expect(result.current.isAuthenticated).toBe(false)
      expect(await AsyncStorage.getItem('auth_token')).toBeNull()
    })

    it('refuses without a session', async () => {
      const {result} = await renderAuth()

      await expect(result.current.deleteAccount()).rejects.toThrow('No authentication token found')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it.each([
      [{error: 'Account has open missions'}, 'Account has open missions'],
      [{message: 'Forbidden'}, 'Forbidden'],
      [{}, 'Failed to delete account'],
    ])('keeps the session and rejects when the API answers %j', async (body, message) => {
      const {result} = await renderLoggedIn()
      fetchMock().mockResolvedValueOnce(jsonResponse(body, {ok: false, status: 400}))

      await expect(result.current.deleteAccount()).rejects.toThrow(message)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe('resendVerificationEmail', () => {
    it('asks the API to resend the email', async () => {
      fetchMock().mockResolvedValueOnce(jsonResponse({}))
      const {result} = await renderAuth()

      await act(() => result.current.resendVerificationEmail('ivan@abv.bg'))

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test/api/users/resend-verification-email',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({email: 'ivan@abv.bg'}),
        }
      )
    })

    it('rejects with the API error message', async () => {
      fetchMock().mockResolvedValueOnce(
        jsonResponse({message: 'Too many requests'}, {ok: false, status: 429})
      )
      const {result} = await renderAuth()

      await expect(result.current.resendVerificationEmail('ivan@abv.bg')).rejects.toThrow(
        'Too many requests'
      )
    })

    it('uses a generic message when the error body is not JSON', async () => {
      fetchMock().mockResolvedValueOnce(unparsableResponse(500))
      const {result} = await renderAuth()

      await expect(result.current.resendVerificationEmail('ivan@abv.bg')).rejects.toThrow(
        'Failed to resend verification email'
      )
    })
  })

  describe('refreshUser', () => {
    it('does nothing without a session', async () => {
      const {result} = await renderAuth()

      await act(() => result.current.refreshUser())

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('reloads the user and mission profile and stores them', async () => {
      const {result} = await renderLoggedIn()
      fetchMock().mockResolvedValueOnce(jsonResponse({user: {...USER, name: 'Ivan Petrov'}}))
      mockFetchProfile.mockResolvedValueOnce({darPoints: 300, contributorLevel: 'guardian'})

      await act(() => result.current.refreshUser())

      expect(global.fetch).toHaveBeenCalledWith('https://api.test/api/users/me', {
        headers: {Authorization: `JWT ${TOKEN}`},
      })
      const expected = {...USER, name: 'Ivan Petrov', darPoints: 300, contributorLevel: 'guardian'}
      expect(result.current.user).toEqual(expected)
      expect(JSON.parse((await AsyncStorage.getItem('auth_user'))!)).toEqual(expected)
    })

    it('accepts a user returned at the top level of the response', async () => {
      const {result} = await renderLoggedIn()
      fetchMock().mockResolvedValueOnce(jsonResponse({...USER, name: 'Flat'}))

      await act(() => result.current.refreshUser())

      expect(result.current.user?.name).toBe('Flat')
    })

    it('keeps the current user when the API rejects the request', async () => {
      const {result} = await renderLoggedIn()
      fetchMock().mockResolvedValueOnce(jsonResponse({}, {ok: false, status: 500}))

      await act(() => result.current.refreshUser())

      expect(result.current.user).toEqual(USER)
    })

    it('keeps the current user when the response has no user', async () => {
      const {result} = await renderLoggedIn()
      fetchMock().mockResolvedValueOnce(jsonResponse({user: null}))

      await act(() => result.current.refreshUser())

      expect(result.current.user).toEqual(USER)
    })

    it('keeps the current user when the network fails', async () => {
      const {result} = await renderLoggedIn()
      fetchMock().mockRejectedValueOnce(new TypeError('Network request failed'))

      await act(() => result.current.refreshUser())

      expect(result.current.user).toEqual(USER)
    })

    it('falls back to beginner defaults when the mission profile is unavailable', async () => {
      const {result} = await renderLoggedIn({...USER, darPoints: 50, contributorLevel: 'guardian'})
      fetchMock().mockResolvedValueOnce(jsonResponse({user: USER}))
      mockFetchProfile.mockRejectedValueOnce(new Error('503'))

      await act(() => result.current.refreshUser())

      expect(result.current.user).toMatchObject({darPoints: 0, contributorLevel: 'beginner'})
    })
  })

  describe('roles', () => {
    it.each([
      ['user', {}],
      ['admin', {isAdmin: true, isContainerAdmin: true, isInfrastructureAdmin: true}],
      ['containerAdmin', {isContainerAdmin: true}],
      ['infrastructureAdmin', {isInfrastructureAdmin: true}],
      ['inspector', {isInfrastructureAdmin: true, isBulkUploadAllowed: true}],
      ['fountainAdmin', {isFountainAdmin: true}],
      ['wasteCollector', {}],
    ])('grants the right permissions to "%s"', async (role, granted) => {
      const {result} = await renderLoggedIn({...USER, role})

      expect(result.current).toMatchObject({
        isAdmin: false,
        isContainerAdmin: false,
        isInfrastructureAdmin: false,
        isFountainAdmin: false,
        ...granted,
        isBulkUploadAllowed: role === 'admin' || role === 'inspector',
      })
    })

    it('grants nothing when logged out', async () => {
      const {result} = await renderAuth()

      expect(result.current).toMatchObject({
        isAdmin: false,
        isContainerAdmin: false,
        isInfrastructureAdmin: false,
        isFountainAdmin: false,
        isBulkUploadAllowed: false,
      })
    })
  })

  describe('expired session reported by the API', () => {
    it('logs the user out, explains why and opens the login screen', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
      const {result} = await renderLoggedIn()
      const onAuthError = mockSetAuthErrorHandler.mock.calls[0][0]

      await act(async () => onAuthError())

      expect(alertSpy).toHaveBeenCalledWith(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [{text: 'OK'}]
      )
      expect(result.current.isAuthenticated).toBe(false)
      expect(await AsyncStorage.getItem('auth_token')).toBeNull()
      expect(router.push).toHaveBeenCalledWith('/auth/login')
      alertSpy.mockRestore()
    })
  })
})
