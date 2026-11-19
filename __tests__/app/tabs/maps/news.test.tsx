import React from 'react'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import * as Location from 'expo-location'
import NewsMap from '../../../../app/(tabs)/maps/news'
import type {NewsItem} from '../../../../types/news'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {Balanced: 3},
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush}),
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

/** Minimal stand-in: one button per chip that selects only that topic. */
jest.mock('../../../../components/TopicFilter', () => {
  const {Pressable, Text} = require('react-native')
  return {
    TopicFilter: ({
      topics,
      selectedTopics,
      onTopicsChange,
    }: {
      topics: {id: string; label: string}[]
      selectedTopics: Set<string>
      onTopicsChange: (next: Set<string>) => void
    }) =>
      topics.map((topic) => (
        <Pressable key={topic.id} onPress={() => onTopicsChange(new Set([topic.id]))}>
          <Text>{`chip:${topic.id}${selectedTopics.has(topic.id) ? ':on' : ''}`}</Text>
        </Pressable>
      )),
  }
})

jest.mock('../../../../hooks/useUpdateCategories', () => ({
  useUpdateCategories: () => ({
    filterChips: [
      {id: 'all', label: 'All'},
      {id: 'water', label: 'Water'},
      {id: 'transport', label: 'Transport'},
    ],
  }),
}))

const mockPermission = Location.requestForegroundPermissionsAsync as jest.Mock
const mockPosition = Location.getCurrentPositionAsync as jest.Mock

const SOFIA = {latitude: 42.6977, longitude: 23.3219}
const NOW = new Date('2026-11-16T10:00:00.000Z')

const item = (overrides: Partial<NewsItem>): NewsItem => ({
  id: 'n1',
  title: 'Water outage',
  description: 'Planned maintenance',
  date: '2026-11-16',
  topic: 'water',
  categories: ['water'],
  location: {latitude: 42.69, longitude: 23.32},
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

/** Marker -> container -> [icon bubble, pointer] */
function markerColors(marker: ReturnType<typeof screen.getByTestId>) {
  const container = marker.children[0] as typeof marker
  return {
    bubble: (container.children[0] as typeof marker).props.style,
    pointer: (container.children[1] as typeof marker).props.style,
  }
}

async function renderMap() {
  await render(<NewsMap />)
  await waitFor(() => expect(mockPermission).toHaveBeenCalled())
}

describe('NewsMap screen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask']})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockUseUpdates.mockReturnValue({news: [], loading: false})
    mockPermission.mockResolvedValue({status: 'denied'})
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  it('shows a loading state instead of the map while news loads', async () => {
    mockUseUpdates.mockReturnValue({news: [], loading: true})

    await renderMap()

    expect(screen.getByText('map.loading')).toBeOnTheScreen()
    expect(screen.queryByTestId('map')).toBeNull()
  })

  it('loads news of every category from the last 7 days around Sofia', async () => {
    await renderMap()

    expect(lastUpdatesOptions()).toEqual({
      categories: undefined,
      bounds: boundsAround(SOFIA.latitude, SOFIA.longitude, 0.05),
      zoom: expect.closeTo(Math.log2(360 / 0.05), 6),
      timespanEndGte: '2026-11-09T10:00:00.000Z',
      enabled: true,
    })
  })

  it('centres on Sofia without asking for a position when location is denied', async () => {
    await renderMap()

    expect(map().props.initialRegion).toEqual({...SOFIA, latitudeDelta: 0.05, longitudeDelta: 0.05})
    expect(mockPosition).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith('Location permission not granted')
  })

  it('loads news around the user when location is allowed', async () => {
    mockPermission.mockResolvedValue({status: 'granted'})
    mockPosition.mockResolvedValue({coords: {latitude: 42.65, longitude: 23.38}})

    await renderMap()

    await waitFor(() =>
      expect(lastUpdatesOptions().bounds).toEqual(boundsAround(42.65, 23.38, 0.05))
    )
    expect(map().props.initialRegion).toEqual({
      latitude: 42.65,
      longitude: 23.38,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    })
  })

  it('logs and stays on Sofia when the position cannot be read', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockPermission.mockResolvedValue({status: 'granted'})
    mockPosition.mockRejectedValue(new Error('GPS off'))

    await renderMap()

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Error getting location:', expect.any(Error))
    )
    expect(lastUpdatesOptions().bounds).toEqual(boundsAround(SOFIA.latitude, SOFIA.longitude, 0.05))
  })

  it('shows a marker only for news with a location', async () => {
    mockUseUpdates.mockReturnValue({
      news: [
        item({id: 'n1'}),
        item({id: 'n2', location: undefined}),
        item({id: 'n3', location: {latitude: 42.7, longitude: 23.31}}),
      ],
      loading: false,
    })

    await renderMap()

    expect(markers().map((m) => m.props.coordinate)).toEqual([
      {latitude: 42.69, longitude: 23.32},
      {latitude: 42.7, longitude: 23.31},
    ])
  })

  it('colours a marker by its first category and falls back to the topic', async () => {
    mockUseUpdates.mockReturnValue({
      news: [
        item({id: 'n1', categories: ['water', 'transport'], topic: 'other'}),
        item({id: 'n2', categories: undefined, topic: 'traffic'}),
      ],
      loading: false,
    })

    await renderMap()

    const [water, traffic] = markers().map(markerColors)
    expect(water.bubble).toEqual(expect.arrayContaining([{backgroundColor: '#3B82F6'}]))
    expect(water.pointer).toEqual(expect.arrayContaining([{borderTopColor: '#3B82F6'}]))
    expect(traffic.bubble).toEqual(expect.arrayContaining([{backgroundColor: '#8B5CF6'}]))
  })

  it('opens the news item when its marker is tapped', async () => {
    mockUseUpdates.mockReturnValue({news: [item({id: 'n42'})], loading: false})
    await renderMap()

    await fireEvent.press(markers()[0])

    expect(mockPush).toHaveBeenCalledWith('/(tabs)/home/n42')
  })

  it('shows all topics selected at first', async () => {
    await renderMap()

    expect(screen.getByText('chip:all:on')).toBeOnTheScreen()
    expect(screen.getByText('chip:water')).toBeOnTheScreen()
  })

  it('reloads only the chosen topic', async () => {
    await renderMap()

    await fireEvent.press(screen.getByText('chip:water'))

    expect(lastUpdatesOptions().categories).toEqual(['water'])
    expect(screen.getByText('chip:water:on')).toBeOnTheScreen()
  })

  it('goes back to every category when "all" is chosen again', async () => {
    await renderMap()
    await fireEvent.press(screen.getByText('chip:water'))

    await fireEvent.press(screen.getByText('chip:all'))

    expect(lastUpdatesOptions().categories).toBeUndefined()
  })

  it('reloads news for the panned area 400 ms after the map settles', async () => {
    await renderMap()

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

  it('keeps the panned area when the topic changes', async () => {
    await renderMap()
    await fireEvent(map(), 'regionChangeComplete', {
      latitude: 42.72,
      longitude: 23.25,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    })
    await act(async () => {
      jest.advanceTimersByTime(400)
    })

    await fireEvent.press(screen.getByText('chip:transport'))

    expect(lastUpdatesOptions()).toEqual(
      expect.objectContaining({
        categories: ['transport'],
        bounds: boundsAround(42.72, 23.25, 0.02),
      })
    )
  })
})
