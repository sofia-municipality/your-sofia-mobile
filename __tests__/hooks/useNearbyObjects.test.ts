import {act, renderHook, waitFor} from '@testing-library/react-native'
import * as Location from 'expo-location'
import {useNearbyObjects} from '../../hooks/useNearbyObjects'
import {loadNearbyContainers} from '../../lib/containerUtils'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}))

jest.mock('../../lib/containerUtils', () => ({
  loadNearbyContainers: jest.fn(),
}))

const location = Location as jest.Mocked<typeof Location>
const mockLoadNearby = loadNearbyContainers as jest.Mock

const GPS = {latitude: 42.6977, longitude: 23.3219}
const PREFILLED = {latitude: 42.7, longitude: 23.33}

const granted = {status: 'granted'} as Location.LocationPermissionResponse
const denied = {status: 'denied'} as Location.LocationPermissionResponse

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => (resolve = res))
  return {promise, resolve}
}

const selectedObject = {id: 'WC-9', name: 'Selected', type: 'waste-container', distance: 3}

describe('useNearbyObjects', () => {
  let consoleLogSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    location.requestForegroundPermissionsAsync.mockResolvedValue(granted)
    location.getCurrentPositionAsync.mockResolvedValue({
      coords: GPS,
    } as Location.LocationObject)
    mockLoadNearby.mockResolvedValue([
      {publicNumber: 'WC-1', distance: 12},
      {publicNumber: 'WC-2', distance: 80},
    ])
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  it('starts empty and seeds the location from the prefilled container location', async () => {
    const {result} = await renderHook(() =>
      useNearbyObjects({selectedObject: null, containerLocation: PREFILLED})
    )

    expect(result.current).toMatchObject({
      nearbyObjects: [],
      loadingNearbyObjects: false,
      currentLocation: PREFILLED,
      locationPermissionDenied: false,
    })
  })

  it('starts without a location when nothing is prefilled', async () => {
    const {result} = await renderHook(() => useNearbyObjects({selectedObject: null}))

    expect(result.current.currentLocation).toBeNull()
  })

  it('skips loading while an object is already selected', async () => {
    const {result} = await renderHook(() => useNearbyObjects({selectedObject: null}))

    await act(async () => result.current.loadNearbyObjects(selectedObject))

    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
    expect(result.current.loadingNearbyObjects).toBe(false)
  })

  it('finds the 3 nearest containers within 200m of the GPS position', async () => {
    const {result} = await renderHook(() => useNearbyObjects({selectedObject: null}))

    await act(async () => result.current.loadNearbyObjects(null))

    await waitFor(() => expect(result.current.nearbyObjects).toHaveLength(2))
    expect(mockLoadNearby).toHaveBeenCalledWith(GPS, 200, {limit: 3})
    expect(result.current.currentLocation).toEqual(GPS)
    expect(result.current.nearbyObjects).toEqual([
      {
        id: 'WC-1',
        name: 'newSignal.objectTypes.wasteContainer #WC-1',
        type: 'waste-container',
        distance: 12,
      },
      {
        id: 'WC-2',
        name: 'newSignal.objectTypes.wasteContainer #WC-2',
        type: 'waste-container',
        distance: 80,
      },
    ])
  })

  it('searches around the prefilled container location instead of GPS', async () => {
    const {result} = await renderHook(() =>
      useNearbyObjects({selectedObject: null, containerLocation: PREFILLED})
    )

    await act(async () => result.current.loadNearbyObjects(null))

    await waitFor(() => expect(mockLoadNearby).toHaveBeenCalledWith(PREFILLED, 200, {limit: 3}))
    expect(location.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  it('shows a loading state while searching', async () => {
    const search = deferred<{publicNumber: string; distance: number}[]>()
    mockLoadNearby.mockReturnValueOnce(search.promise)
    const {result} = await renderHook(() => useNearbyObjects({selectedObject: null}))

    await act(async () => result.current.loadNearbyObjects(null))
    await waitFor(() => expect(result.current.loadingNearbyObjects).toBe(true))

    await act(async () => search.resolve([]))

    expect(result.current.loadingNearbyObjects).toBe(false)
  })

  it('flags a denied location permission and does not search', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValueOnce(denied)
    const {result} = await renderHook(() => useNearbyObjects({selectedObject: null}))

    await act(async () => result.current.loadNearbyObjects(null))

    await waitFor(() => expect(result.current.locationPermissionDenied).toBe(true))
    expect(result.current.loadingNearbyObjects).toBe(false)
    expect(mockLoadNearby).not.toHaveBeenCalled()
  })

  it('clears the denied flag once permission is granted', async () => {
    location.requestForegroundPermissionsAsync.mockResolvedValueOnce(denied)
    const {result} = await renderHook(() => useNearbyObjects({selectedObject: null}))
    await act(async () => result.current.loadNearbyObjects(null))
    await waitFor(() => expect(result.current.locationPermissionDenied).toBe(true))

    await act(async () => result.current.loadNearbyObjects(null))

    await waitFor(() => expect(result.current.locationPermissionDenied).toBe(false))
  })

  it('logs and stops loading when the search fails', async () => {
    mockLoadNearby.mockRejectedValueOnce(new Error('PostGIS down'))
    const {result} = await renderHook(() => useNearbyObjects({selectedObject: null}))

    await act(async () => result.current.loadNearbyObjects(null))

    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error loading nearby objects:',
        expect.any(Error)
      )
    )
    expect(result.current.loadingNearbyObjects).toBe(false)
    expect(result.current.nearbyObjects).toEqual([])
  })

  it('exposes setters for the nearby objects and location', async () => {
    const {result} = await renderHook(() => useNearbyObjects({selectedObject: null}))

    await act(async () => {
      result.current.setNearbyObjects([selectedObject])
      result.current.setCurrentLocation(GPS)
    })

    expect(result.current.nearbyObjects).toEqual([selectedObject])
    expect(result.current.currentLocation).toEqual(GPS)
  })
})
