import React from 'react'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import * as Location from 'expo-location'
import EventsMap from '../../../../app/(tabs)/maps/events'
import type {NewsItem} from '../../../../types/news'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {Balanced: 3},
}))

jest.mock('react-native-maps', () => {
  const {View} = require('react-native')
  return {
    __esModule: true,
    default: (props: object) => <View testID="map" {...props} />,
    Marker: (props: object) => <View testID="marker" {...props} />,
  }
})

const mockUseUpdates = jest.fn()
jest.mock('../../../../hooks/useUpdates', () => ({
  useUpdates: (options: unknown) => mockUseUpdates(options),
}))

jest.mock('../../../../components/ImplementMeGithub', () => {
  const {View} = require('react-native')
  return {ImplementMeGithub: (props: object) => <View testID="implement-me" {...props} />}
})

const mockPermission = Location.requestForegroundPermissionsAsync as jest.Mock
const mockPosition = Location.getCurrentPositionAsync as jest.Mock

const SOFIA = {latitude: 42.6977, longitude: 23.3219}

const event = (overrides: Partial<NewsItem>): NewsItem => ({
  id: 'e1',
  title: 'Open-air concert',
  description: 'Free entry',
  date: '2026-11-20',
  topic: 'culture',
  location: {latitude: 42.69, longitude: 23.33},
  ...overrides,
})

function boundsAround(latitude: number, longitude: number, delta: number) {
  return {
    north: expect.closeTo(latitude + delta / 2, 6),
    south: expect.closeTo(latitude - delta / 2, 6),
    east: expect.closeTo(longitude + delta / 2, 6),
    west: expect.closeTo(longitude - delta / 2, 6),
  }
}

const lastUpdatesOptions = () => mockUseUpdates.mock.calls.at(-1)[0]
const map = () => screen.getByTestId('map')
const markers = () => screen.queryAllByTestId('marker')

async function renderMap() {
  await render(<EventsMap />)
  await waitFor(() => expect(mockPermission).toHaveBeenCalled())
}

describe('EventsMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockUseUpdates.mockReturnValue({news: [], loading: false})
    mockPermission.mockResolvedValue({status: 'denied'})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('shows a loading state instead of the map while events load', async () => {
    mockUseUpdates.mockReturnValue({news: [], loading: true})

    await renderMap()

    expect(screen.getByText('map.loading')).toBeOnTheScreen()
    expect(screen.queryByTestId('map')).toBeNull()
  })

  it('loads up to 100 culture, art and sports events around Sofia', async () => {
    await renderMap()

    expect(lastUpdatesOptions()).toEqual({
      categories: ['culture', 'art', 'sports'],
      limit: 100,
      bounds: boundsAround(SOFIA.latitude, SOFIA.longitude, 0.05),
      zoom: expect.closeTo(Math.log2(360 / 0.05), 6),
    })
  })

  it('centres on Sofia without asking for a position when location is denied', async () => {
    await renderMap()

    expect(map().props.initialRegion).toEqual({...SOFIA, latitudeDelta: 0.05, longitudeDelta: 0.05})
    expect(mockPosition).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith('Location permission not granted')
    expect(markers()).toHaveLength(0)
  })

  it('centres on the user and marks their position when location is allowed', async () => {
    mockPermission.mockResolvedValue({status: 'granted'})
    mockPosition.mockResolvedValue({coords: {latitude: 42.65, longitude: 23.38}})

    await renderMap()

    await waitFor(() =>
      expect(map().props.initialRegion).toEqual({
        latitude: 42.65,
        longitude: 23.38,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      })
    )
    expect(mockPosition).toHaveBeenCalledWith({accuracy: Location.Accuracy.Balanced})
    expect(markers()).toHaveLength(1)
    expect(markers()[0].props).toEqual(
      expect.objectContaining({
        coordinate: {latitude: 42.65, longitude: 23.38},
        title: 'common.yourLocation',
      })
    )
    expect(lastUpdatesOptions().bounds).toEqual(boundsAround(42.65, 23.38, 0.05))
  })

  it('stays on Sofia when the position cannot be read', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockPermission.mockResolvedValue({status: 'granted'})
    mockPosition.mockRejectedValue(new Error('GPS off'))

    await renderMap()

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Error getting location:', expect.any(Error))
    )
    expect(map().props.initialRegion).toEqual({...SOFIA, latitudeDelta: 0.05, longitudeDelta: 0.05})
  })

  it('shows a marker with title and description only for events that have a location', async () => {
    mockUseUpdates.mockReturnValue({
      news: [
        event({id: 'e1'}),
        event({id: 'e2', title: 'Online lecture', location: undefined}),
        event({
          id: 'e3',
          title: 'Marathon',
          description: 'Road closures',
          location: {latitude: 42.7, longitude: 23.31},
        }),
      ],
      loading: false,
    })

    await renderMap()

    expect(markers().map((m) => m.props.title)).toEqual(['Open-air concert', 'Marathon'])
    expect(markers()[1].props).toEqual(
      expect.objectContaining({
        coordinate: {latitude: 42.7, longitude: 23.31},
        description: 'Road closures',
      })
    )
  })

  it('reloads events for the panned area once the map settles', async () => {
    jest.useFakeTimers()
    await render(<EventsMap />)

    await fireEvent(map(), 'regionChangeComplete', {
      latitude: 42.72,
      longitude: 23.25,
      latitudeDelta: 0.02,
      longitudeDelta: 0.04,
    })
    await act(async () => {
      jest.advanceTimersByTime(399)
    })
    expect(lastUpdatesOptions().bounds).toEqual(boundsAround(SOFIA.latitude, SOFIA.longitude, 0.05))

    await act(async () => {
      jest.advanceTimersByTime(1)
    })

    expect(lastUpdatesOptions().bounds).toEqual({
      north: expect.closeTo(42.73, 6),
      south: expect.closeTo(42.71, 6),
      east: expect.closeTo(23.27, 6),
      west: expect.closeTo(23.23, 6),
    })
    expect(lastUpdatesOptions().zoom).toBeCloseTo(Math.log2(360 / 0.04), 6)
  })

  it('only applies the last of several quick pans', async () => {
    jest.useFakeTimers()
    await render(<EventsMap />)
    const region = (latitude: number) => ({
      latitude,
      longitude: 23.3,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    })

    await fireEvent(map(), 'regionChangeComplete', region(42.6))
    await act(async () => {
      jest.advanceTimersByTime(200)
    })
    await fireEvent(map(), 'regionChangeComplete', region(42.8))
    await act(async () => {
      jest.advanceTimersByTime(400)
    })

    const norths: number[] = mockUseUpdates.mock.calls.map(([options]) => options.bounds.north)
    expect(norths.some((north) => Math.abs(north - 42.61) < 1e-6)).toBe(false)
    expect(lastUpdatesOptions().bounds.north).toBeCloseTo(42.81, 6)
  })

  it('links to the GitHub issue for finishing the events map', async () => {
    await renderMap()

    expect(screen.getByTestId('implement-me').props).toEqual(
      expect.objectContaining({
        extendedText: 'common.implementMeMessage',
        issueUrl: 'https://github.com/sofia-municipality/your-sofia-mobile/issues/4',
      })
    )
  })
})
