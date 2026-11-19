import React from 'react'
import {Alert, StyleSheet} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import * as Location from 'expo-location'
import WasteContainers from '../../../../app/(tabs)/maps/waste-containers'
import {
  fetchBulkyWasteZones,
  fetchContainerClusters,
  fetchWasteContainerById,
  type ContainerCluster,
} from '../../../../lib/payload'
import type {WasteContainer} from '../../../../types/wasteContainer'
import type {BulkyWasteZone} from '../../../../types/bulkyWasteZone'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockT}),
}))
// Stable across renders, like the real hook.
const mockT = (key: string) => key

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 20, left: 0}),
}))

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {Balanced: 3, BestForNavigation: 6},
}))

const mockAnimateToRegion = jest.fn()
jest.mock('react-native-maps', () => {
  const React = require('react')
  const {View} = require('react-native')
  const MapView = React.forwardRef((props: object, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({animateToRegion: mockAnimateToRegion}))
    return <View testID="map" {...props} />
  })
  MapView.displayName = 'MapView'
  return {
    __esModule: true,
    default: MapView,
    Marker: (props: object) => <View testID="marker" {...props} />,
    Polygon: (props: object) => <View testID="polygon" {...props} />,
    PROVIDER_DEFAULT: 'default',
  }
})

let mockParams: Record<string, string | undefined> = {}
const mockSetParams = jest.fn((next: Record<string, string | undefined>) => {
  mockParams = {...mockParams, ...next}
})
// Stable like the real router, so effects that depend on it do not re-run every render.
const mockRouter = {setParams: mockSetParams, push: jest.fn()}
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}))

jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({isAuthenticated: false}),
}))

jest.mock('../../../../lib/payload', () => ({
  fetchBulkyWasteZones: jest.fn(),
  fetchContainerClusters: jest.fn(),
  fetchWasteContainerById: jest.fn(),
}))

jest.mock('../../../../components/WasteContainerMarker', () => {
  const {View} = require('react-native')
  return {
    WasteContainerMarker: ({color}: {color: string}) => (
      <View testID="container-marker" accessibilityHint={color} />
    ),
  }
})

jest.mock('../../../../components/WasteContainerCluster', () => {
  const {Text} = require('react-native')
  return {
    WasteContainerCluster: ({count}: {count: number}) => <Text testID="cluster">{count}</Text>,
  }
})

jest.mock('../../../../components/WasteContainerCard', () => {
  const {Pressable, Text, View} = require('react-native')
  return {
    WasteContainerCard: ({
      container,
      onClose,
      onContainerUpdated,
    }: {
      container: {publicNumber: string; status: string}
      onClose: () => void
      onContainerUpdated: () => void
    }) => (
      <View>
        <Text>{`card:${container.publicNumber}:${container.status}`}</Text>
        <Pressable onPress={onClose}>
          <Text>card-close</Text>
        </Pressable>
        <Pressable onPress={() => onContainerUpdated()}>
          <Text>card-updated</Text>
        </Pressable>
      </View>
    ),
  }
})

jest.mock('../../../../components/BulkyWasteZoneDetailsModal', () => {
  const {Pressable, Text} = require('react-native')
  return {
    BulkyWasteZoneDetailsModal: ({
      visible,
      zone,
      onClose,
    }: {
      visible: boolean
      zone: {name: string} | null
      onClose: () => void
    }) =>
      visible ? (
        <Pressable onPress={onClose}>
          <Text>{`zone:${zone?.name}`}</Text>
        </Pressable>
      ) : null,
  }
})

jest.mock('../../../../components/BottomSheetBackdrop', () => {
  const {Pressable, View} = require('react-native')
  return {
    BottomSheetBackdrop: ({
      children,
      onPress,
    }: {
      children: React.ReactNode
      onPress: () => void
    }) => (
      <View>
        <Pressable testID="backdrop" onPress={onPress} />
        {children}
      </View>
    ),
  }
})

const mockZones = fetchBulkyWasteZones as jest.Mock
const mockClusters = fetchContainerClusters as jest.Mock
const mockContainerById = fetchWasteContainerById as jest.Mock
const mockPermission = Location.requestForegroundPermissionsAsync as jest.Mock
const mockPosition = Location.getCurrentPositionAsync as jest.Mock
const mockWatch = Location.watchPositionAsync as jest.Mock

const SOFIA = {latitude: 42.683, longitude: 23.315}
const USER = {latitude: 42.65, longitude: 23.38}
const PRIMARY = '#2F54C5'
/** latitudeDelta 0.005 → zoom 16, where the server returns individual containers. */
const ZOOMED_IN = {latitude: 42.66, longitude: 23.37, latitudeDelta: 0.005, longitudeDelta: 0.005}
/** 360 / 2^16: the span the map jumps to when a filter needs individual markers. */
const INDIVIDUAL_DELTA = 360 / Math.pow(2, 16)

const container = (overrides: Partial<WasteContainer>): WasteContainer => ({
  id: '1',
  publicNumber: 'TRI-0001',
  location: [23.37, 42.66],
  latitude: 42.66,
  longitude: 23.37,
  capacityVolume: 1.1,
  capacitySize: 'standard',
  wasteType: 'general',
  status: 'active',
  state: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

let lng = 23.36
const at = (overrides: Partial<WasteContainer>) => {
  lng += 0.0001
  return container({longitude: lng, location: [lng, 42.66], ...overrides})
}

const containers = [
  at({id: '1', publicNumber: 'OK-1'}),
  at({id: '2', publicNumber: 'FULL-2', state: ['full']}),
  at({id: '3', publicNumber: 'DAMAGED-3', state: ['damaged'], wasteType: 'glass'}),
  at({id: '4', publicNumber: 'DIRTY-4', state: ['dirty'], wasteType: 'glass'}),
  at({id: '5', publicNumber: 'INACTIVE-5', status: 'inactive', state: ['full']}),
  at({id: '6', publicNumber: 'PENDING-6', status: 'pending'}),
  at({id: '7', publicNumber: 'BAGGED-7', state: ['bagged'], wasteType: 'paper'}),
  at({id: '8', publicNumber: 'STATUSFULL-8', status: 'full'}),
]

const clusters: ContainerCluster[] = [
  {
    type: 'cluster',
    lat: 42.67,
    lng: 23.31,
    count: 12,
    dominantStatus: 'active',
    activeSignalCount: 0,
  },
  {type: 'cluster', lat: 42.69, lng: 23.33, count: 5, dominantStatus: 'full', activeSignalCount: 2},
]

const zones: BulkyWasteZone[] = [
  {
    id: 'z1',
    name: 'Triaditsa North',
    collectionDaysOfWeek: ['monday'],
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [23.3, 42.6],
          [23.31, 42.6],
          [23.31, 42.61],
        ],
        [
          [23.301, 42.601],
          [23.302, 42.601],
          [23.302, 42.602],
        ],
        [
          [23.0, 42.0],
          [23.1, 42.1],
        ],
      ],
    },
  },
  {
    id: 'z2',
    name: 'Mladost',
    collectionDaysOfWeek: ['friday'],
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [23.37, 42.65],
            [23.38, 42.65],
            [23.38, 42.66],
          ],
        ],
        [
          [
            [23.4, 42.6],
            [23.41, 42.6],
          ],
        ],
        [
          [
            [23.39, 42.64],
            [23.4, 42.64],
            [23.4, 42.65],
            [23.39, 42.64],
          ],
        ],
      ],
    },
  },
]

let mockMarkerDocs: WasteContainer[] = containers

const map = () => screen.getByTestId('map')
const spinners = () => screen.container.queryAll((node) => node.type === 'ActivityIndicator')
const clusterCounts = () => screen.queryAllByTestId('cluster').map((n) => n.props.children)

/** publicNumbers of the containers shown, matched back by marker coordinate. */
function shownContainers() {
  return screen
    .queryAllByTestId('container-marker')
    .map(
      (m) =>
        mockMarkerDocs.find(
          (c) =>
            c.latitude === m.parent!.props.coordinate.latitude &&
            c.longitude === m.parent!.props.coordinate.longitude
        )!.publicNumber
    )
}

function markerColour(publicNumber: string) {
  const marker = screen
    .queryAllByTestId('container-marker')
    .find((m) => m.parent!.props.coordinate.longitude === byNumber(publicNumber).longitude)
  return marker!.props.accessibilityHint
}

const byNumber = (publicNumber: string) =>
  mockMarkerDocs.find((c) => c.publicNumber === publicNumber)!

function markerFor(publicNumber: string) {
  return screen
    .queryAllByTestId('marker')
    .find((m) => m.props.coordinate.longitude === byNumber(publicNumber).longitude)!
}

/** Action buttons in order: follow-me, zoom in, zoom out. */
function actionButtons() {
  const buttons = screen.container.queryAll(
    (node) =>
      typeof node.type === 'string' &&
      node.props.onClick !== undefined &&
      node.parent?.props.style?.position === 'absolute' &&
      node.parent?.props.style?.bottom === 20
  )
  return {followMe: buttons[0], zoomIn: buttons[1], zoomOut: buttons[2]}
}

/** The AR button is the only control pinned to the bottom-left corner. */
function arButtons() {
  return screen.container.queryAll((node) => {
    const style = StyleSheet.flatten(node.props.style)
    return (
      typeof node.type === 'string' &&
      node.props.onClick !== undefined &&
      style?.left === 16 &&
      style?.bottom === 20
    )
  })
}

const clusterCalls = () => mockClusters.mock.calls.map(([options]) => options)
const lastClusterCall = () => mockClusters.mock.calls.at(-1)[0]

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

async function renderScreen(props: {onOpenAR?: () => void} = {}) {
  await render(<WasteContainers {...props} />)
  await waitFor(() => expect(map()).toBeOnTheScreen())
  await waitFor(() => expect(mockWatch).toHaveBeenCalled())
  await flush()
}

/** Pan the map and wait for the 300 ms debounced viewport fetch to settle. */
async function panTo(region: typeof ZOOMED_IN) {
  await fireEvent(map(), 'regionChangeComplete', region)
  await act(async () => {
    jest.advanceTimersByTime(300)
  })
  await flush()
}

async function openStateFilters() {
  await fireEvent.press(screen.getByText('wasteContainers.filterByState'))
}

async function openTypeFilters() {
  await fireEvent.press(screen.getByText('wasteContainers.filterByType'))
}

describe('WasteContainers map', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({
      now: new Date('2026-11-16T12:00:00.000Z'),
      doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'],
    })
    mockParams = {}
    mockMarkerDocs = containers
    mockZones.mockResolvedValue(zones)
    mockClusters.mockImplementation(async ({zoom}: {zoom: number}) =>
      zoom >= 16
        ? {type: 'markers', docs: mockMarkerDocs, zoom}
        : {type: 'clusters', docs: clusters, zoom}
    )
    mockPermission.mockResolvedValue({status: 'granted'})
    mockPosition.mockResolvedValue({coords: USER})
    mockWatch.mockImplementation(async () => ({remove: jest.fn()}))
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  describe('location permission', () => {
    it('asks for location before showing the map', async () => {
      mockPermission.mockResolvedValue({status: 'denied'})
      await render(<WasteContainers />)

      await waitFor(() => expect(screen.getByText('map.permissions.title')).toBeOnTheScreen())
      expect(screen.getByText('map.permissions.message')).toBeOnTheScreen()
      expect(screen.queryByTestId('map')).toBeNull()
    })

    it('shows the map once access is granted from the prompt', async () => {
      mockPermission.mockResolvedValue({status: 'denied'})
      await render(<WasteContainers />)
      await waitFor(() => expect(screen.getByText('map.permissions.button')).toBeOnTheScreen())
      mockPermission.mockResolvedValue({status: 'granted'})

      await fireEvent.press(screen.getByText('map.permissions.button'))

      await waitFor(() => expect(map()).toBeOnTheScreen())
      expect(mockPosition).toHaveBeenCalledWith({accuracy: Location.Accuracy.Balanced})
    })

    it('keeps the prompt when access is denied again', async () => {
      mockPermission.mockResolvedValue({status: 'denied'})
      await render(<WasteContainers />)
      await waitFor(() => expect(screen.getByText('map.permissions.button')).toBeOnTheScreen())

      await fireEvent.press(screen.getByText('map.permissions.button'))

      expect(screen.getByText('map.permissions.title')).toBeOnTheScreen()
      expect(mockPosition).not.toHaveBeenCalled()
    })

    it('warns the user when the position cannot be read', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      jest.spyOn(Alert, 'alert')
      mockPosition.mockRejectedValue(new Error('GPS off'))

      await renderScreen()

      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'map.locationError')
    })
  })

  describe('map', () => {
    it('explains which districts have data', async () => {
      await renderScreen()

      expect(
        screen.getByText('wasteContainers.triaditsaAndMladostOnlyAvailability')
      ).toBeOnTheScreen()
    })

    it('starts on the user at street level', async () => {
      await renderScreen()

      expect(map().props.initialRegion).toEqual({
        ...USER,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      })
      expect(map().props.showsUserLocation).toBe(true)
    })

    it('flies to the user once their position is known', async () => {
      await renderScreen()

      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {...USER, latitudeDelta: 0.01, longitudeDelta: 0.01},
        1000
      )
    })

    it('offers the AR view only when the parent supports it', async () => {
      const onOpenAR = jest.fn()
      await renderScreen({onOpenAR})

      await fireEvent.press(arButtons()[0])

      expect(onOpenAR).toHaveBeenCalledTimes(1)
    })

    it('has no AR button without an AR handler', async () => {
      await renderScreen()

      expect(arButtons()).toHaveLength(0)
    })
  })

  describe('clusters', () => {
    it('loads active-container clusters for the starting area in Triaditsa and Mladost', async () => {
      await renderScreen()

      expect(lastClusterCall()).toEqual({
        zoom: 15,
        minLat: expect.closeTo(USER.latitude - 0.005, 6),
        maxLat: expect.closeTo(USER.latitude + 0.005, 6),
        minLng: expect.closeTo(USER.longitude - 0.005, 6),
        maxLng: expect.closeTo(USER.longitude + 0.005, 6),
        status: 'active',
        districtId: [13, 24],
        volumeOptions: [1.1, 2.25, 3],
      })
    })

    it('loads the area around Sofia centre before the position is known', async () => {
      await renderScreen()

      expect(clusterCalls()[0]).toEqual(
        expect.objectContaining({
          minLat: expect.closeTo(SOFIA.latitude - 0.005, 6),
          maxLng: expect.closeTo(SOFIA.longitude + 0.005, 6),
        })
      )
    })

    // BUG: app/(tabs)/maps/waste-containers.tsx:204-226 — the [location] effect and the
    // [selectedStateFilters, fetchClusters] effect both run on mount, so the starting area is
    // requested twice.
    it.failing('requests the starting area only once', async () => {
      await renderScreen()

      const sofiaCalls = clusterCalls().filter(
        (call) => Math.abs(call.minLat - (SOFIA.latitude - 0.005)) < 1e-9
      )
      expect(sofiaCalls).toHaveLength(1)
    })

    it('shows a cluster marker with its count at each cluster', async () => {
      await renderScreen()

      expect(clusterCounts()).toEqual([12, 5])
      expect(screen.getAllByTestId('marker').map((m) => m.props.coordinate)).toEqual([
        {latitude: 42.67, longitude: 23.31},
        {latitude: 42.69, longitude: 23.33},
      ])
    })

    it('zooms into a cluster when it is tapped', async () => {
      await renderScreen()
      await panTo({latitude: 42.68, longitude: 23.32, latitudeDelta: 0.03, longitudeDelta: 0.06})

      await fireEvent.press(screen.getAllByTestId('marker')[1])

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        {latitude: 42.69, longitude: 23.33, latitudeDelta: 0.01, longitudeDelta: 0.02},
        300
      )
    })

    it('reloads clusters for the panned area after the map settles', async () => {
      await renderScreen()
      const callsBefore = mockClusters.mock.calls.length

      await fireEvent(map(), 'regionChangeComplete', {
        latitude: 42.7,
        longitude: 23.3,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      })
      await act(async () => {
        jest.advanceTimersByTime(299)
      })
      expect(mockClusters).toHaveBeenCalledTimes(callsBefore)

      await act(async () => {
        jest.advanceTimersByTime(1)
      })

      expect(lastClusterCall()).toEqual(
        expect.objectContaining({
          zoom: 14,
          minLat: expect.closeTo(42.69, 6),
          maxLat: expect.closeTo(42.71, 6),
          minLng: expect.closeTo(23.29, 6),
          maxLng: expect.closeTo(23.31, 6),
        })
      )
    })

    it('only loads the last of several quick pans', async () => {
      await renderScreen()
      const callsBefore = mockClusters.mock.calls.length
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
      await panTo(region(42.7))

      expect(mockClusters).toHaveBeenCalledTimes(callsBefore + 1)
      expect(lastClusterCall().minLat).toBeCloseTo(42.69, 6)
    })

    it('keeps the map usable when clusters fail to load', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockClusters.mockRejectedValue(new Error('offline'))

      await renderScreen()

      expect(error).toHaveBeenCalledWith('[fetchClusters] Error:', expect.any(Error))
      expect(screen.queryByText('wasteContainers.loadError')).toBeNull()
      expect(clusterCounts()).toEqual([])
    })

    it('refreshes the visible area every minute', async () => {
      await renderScreen()
      await panTo({latitude: 42.7, longitude: 23.3, latitudeDelta: 0.02, longitudeDelta: 0.02})
      const callsBefore = mockClusters.mock.calls.length

      await act(async () => {
        jest.advanceTimersByTime(60_000)
      })

      expect(mockClusters).toHaveBeenCalledTimes(callsBefore + 1)
      expect(lastClusterCall().minLat).toBeCloseTo(42.69, 6)
    })

    it('stops refreshing once the screen closes', async () => {
      await renderScreen()
      await screen.unmount()
      const callsBefore = mockClusters.mock.calls.length

      jest.advanceTimersByTime(120_000)

      expect(mockClusters).toHaveBeenCalledTimes(callsBefore)
    })
  })

  describe('individual containers', () => {
    it('loads individual containers without a status filter when zoomed in', async () => {
      await renderScreen()

      await panTo(ZOOMED_IN)

      expect(lastClusterCall()).toEqual({
        zoom: 16,
        minLat: expect.closeTo(42.6575, 6),
        maxLat: expect.closeTo(42.6625, 6),
        minLng: expect.closeTo(23.3675, 6),
        maxLng: expect.closeTo(23.3725, 6),
        districtId: [13, 24],
        volumeOptions: [1.1, 2.25, 3],
      })
      expect(clusterCounts()).toEqual([])
    })

    it('shows a spinner while containers load', async () => {
      await renderScreen()
      let resolve!: (value: unknown) => void
      mockClusters.mockReturnValueOnce(new Promise((r) => (resolve = r)))

      await panTo(ZOOMED_IN)
      expect(spinners()).toHaveLength(1)

      await act(async () => resolve({type: 'markers', docs: containers, zoom: 16}))
      expect(spinners()).toHaveLength(0)
    })

    it('shows only operational containers by default', async () => {
      await renderScreen()

      await panTo(ZOOMED_IN)

      expect(shownContainers()).toEqual([
        'OK-1',
        'FULL-2',
        'DAMAGED-3',
        'DIRTY-4',
        'BAGGED-7',
        'STATUSFULL-8',
      ])
    })

    it.each([
      ['OK-1', 'green'],
      ['FULL-2', 'red'],
      ['STATUSFULL-8', 'red'],
      ['DAMAGED-3', 'black'],
      ['BAGGED-7', 'black'],
      ['DIRTY-4', 'orange'],
    ])('colours %s %s', async (publicNumber, colour) => {
      await renderScreen()

      await panTo(ZOOMED_IN)

      expect(markerColour(publicNumber)).toBe(colour)
    })

    it('shows a dismissable error when containers fail to load', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      await renderScreen()
      mockClusters.mockRejectedValueOnce(new Error('offline'))

      await panTo(ZOOMED_IN)

      expect(screen.getByText('wasteContainers.loadError')).toBeOnTheScreen()
      expect(spinners()).toHaveLength(0)
      await fireEvent.press(screen.getByText('common.cancel'))
      expect(screen.queryByText('wasteContainers.loadError')).toBeNull()
    })

    it('switches back to clusters when zoomed out again', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)

      await panTo({latitude: 42.66, longitude: 23.37, latitudeDelta: 0.02, longitudeDelta: 0.02})

      expect(shownContainers()).toEqual([])
      expect(clusterCounts()).toEqual([12, 5])
    })
  })

  describe('container card', () => {
    it('opens the card when a container is tapped', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)

      await fireEvent.press(markerFor('FULL-2'))

      expect(screen.getByText('card:FULL-2:active')).toBeOnTheScreen()
    })

    it.each([
      ['the card', () => fireEvent.press(screen.getByText('card-close'))],
      ['the backdrop', () => fireEvent.press(screen.getByTestId('backdrop'))],
      [
        'the back button',
        () =>
          fireEvent(
            screen.container.queryAll((n) => n.props.onRequestClose !== undefined)[0],
            'requestClose'
          ),
      ],
    ])('closes the card from %s', async (_, close) => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await fireEvent.press(markerFor('FULL-2'))

      await close()

      expect(screen.queryByText(/^card:/)).toBeNull()
    })

    it('reloads the container after it changes and updates its marker', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await fireEvent.press(markerFor('FULL-2'))
      mockContainerById.mockResolvedValue({...byNumber('FULL-2'), state: [], status: 'maintenance'})

      await fireEvent.press(screen.getByText('card-updated'))

      expect(mockContainerById).toHaveBeenCalledWith('2')
      expect(screen.getByText('card:FULL-2:maintenance')).toBeOnTheScreen()
      expect(markerColour('FULL-2')).toBe('green')
    })

    it('reloads the visible area when the changed container cannot be fetched', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      await renderScreen()
      await panTo(ZOOMED_IN)
      await fireEvent.press(markerFor('FULL-2'))
      mockContainerById.mockRejectedValue(new Error('offline'))
      const callsBefore = mockClusters.mock.calls.length

      await fireEvent.press(screen.getByText('card-updated'))
      await flush()

      expect(mockClusters).toHaveBeenCalledTimes(callsBefore + 1)
      expect(lastClusterCall()).toEqual(
        expect.objectContaining({zoom: 16, minLat: expect.closeTo(42.6575, 6)})
      )
    })

    it('refreshes the container named in the navigation params and clears them', async () => {
      mockParams = {refreshContainerId: '4'}
      mockContainerById.mockResolvedValue(container({id: '4', publicNumber: 'DIRTY-4'}))

      await renderScreen()

      expect(mockSetParams).toHaveBeenCalledWith({refreshContainerId: undefined})
      expect(mockContainerById).toHaveBeenCalledWith('4')
    })
  })

  describe('state filter', () => {
    it('lists every state with "active" selected', async () => {
      await renderScreen()

      await openStateFilters()

      expect(screen.getByText('wasteContainers.statuses.active').parent).toHaveStyle({
        backgroundColor: PRIMARY,
      })
      for (const key of [
        'filters.all',
        'filters.full',
        'filters.dirty',
        'filters.damaged',
        'filters.leaves',
        'filters.maintenance',
        'filters.bagged',
        'filters.fallen',
        'filters.bulkyWaste',
        'filters.uncollected',
      ]) {
        expect(screen.getByText(`wasteContainers.${key}`).parent).not.toHaveStyle({
          backgroundColor: PRIMARY,
        })
      }
    })

    it('shows every container, inactive ones included, for "all"', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await openStateFilters()

      await fireEvent.press(screen.getByText('wasteContainers.filters.all'))

      expect(shownContainers()).toHaveLength(8)
    })

    it('loads clusters of every status once "active" is no longer the only filter', async () => {
      await renderScreen()
      await openStateFilters()

      await fireEvent.press(screen.getByText('wasteContainers.filters.all'))

      expect(lastClusterCall().status).toBeUndefined()
    })

    it('shows only containers in the chosen state once "active" is switched off', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await openStateFilters()

      await fireEvent.press(screen.getByText('wasteContainers.filters.full'))
      await fireEvent.press(screen.getByText('wasteContainers.statuses.active'))

      expect(shownContainers()).toEqual(['FULL-2', 'INACTIVE-5'])
    })

    it('combines several states', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await openStateFilters()

      await fireEvent.press(screen.getByText('wasteContainers.statuses.active'))
      await fireEvent.press(screen.getByText('wasteContainers.filters.damaged'))
      await fireEvent.press(screen.getByText('wasteContainers.filters.bagged'))

      expect(shownContainers()).toEqual(['DAMAGED-3', 'BAGGED-7'])
    })

    it('falls back to "all" when every filter is switched off', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await openStateFilters()

      await fireEvent.press(screen.getByText('wasteContainers.statuses.active'))

      expect(screen.getByText('wasteContainers.filters.all').parent).toHaveStyle({
        backgroundColor: PRIMARY,
      })
      expect(shownContainers()).toHaveLength(8)
    })

    it('zooms in to street level so a specific state is visible', async () => {
      await renderScreen()
      await panTo({latitude: 42.7, longitude: 23.3, latitudeDelta: 0.02, longitudeDelta: 0.02})
      await openStateFilters()

      await fireEvent.press(screen.getByText('wasteContainers.filters.dirty'))

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        {
          latitude: 42.7,
          longitude: 23.3,
          latitudeDelta: INDIVIDUAL_DELTA,
          longitudeDelta: INDIVIDUAL_DELTA,
        },
        400
      )
    })

    it('does not zoom when "all" is chosen', async () => {
      await renderScreen()
      await openStateFilters()
      mockAnimateToRegion.mockClear()

      await fireEvent.press(screen.getByText('wasteContainers.filters.all'))

      expect(mockAnimateToRegion).not.toHaveBeenCalled()
    })

    it('does not zoom when already zoomed in', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await openStateFilters()
      mockAnimateToRegion.mockClear()

      await fireEvent.press(screen.getByText('wasteContainers.filters.dirty'))

      expect(mockAnimateToRegion).not.toHaveBeenCalled()
    })

    describe('uncollected', () => {
      const hoursAgo = (hours: number) =>
        new Date(Date.now() - hours * 3_600_000).toISOString().replace('T', ' ')

      beforeEach(() => {
        mockMarkerDocs = [
          at({id: 'r1', publicNumber: 'RTR-1', lastCleaned: hoursAgo(2)}),
          at({id: 'r2', publicNumber: 'RTR-2', lastCleaned: hoursAgo(30)}),
          at({id: 'r3', publicNumber: 'RTR-3', lastCleaned: hoursAgo(40)}),
          at({id: 'r4', publicNumber: 'RTR-4', lastCleaned: undefined}),
          at({id: 'r5', publicNumber: 'TRI-5', lastCleaned: hoursAgo(100), state: ['full']}),
          at({id: 'r6', publicNumber: 'RTR-6', status: 'inactive', lastCleaned: hoursAgo(1)}),
        ]
      })

      it('shows every container', async () => {
        await renderScreen()
        await panTo(ZOOMED_IN)
        await openStateFilters()

        await fireEvent.press(screen.getByText('wasteContainers.filters.uncollected'))

        expect(shownContainers()).toHaveLength(6)
      })

      it.each([
        ['RTR-1', 'collected 2 h ago', 'green'],
        ['RTR-2', 'collected 30 h ago', 'orange'],
        ['RTR-3', 'collected 40 h ago', 'red'],
        ['RTR-4', 'never collected', 'red'],
        ['TRI-5', 'not tracked (non-RTR, full)', 'red'],
      ])('colours %s (%s) %s', async (publicNumber, _, colour) => {
        await renderScreen()
        await panTo(ZOOMED_IN)
        await openStateFilters()

        await fireEvent.press(screen.getByText('wasteContainers.filters.uncollected'))

        expect(markerColour(publicNumber)).toBe(colour)
      })
    })
  })

  describe('type filter', () => {
    it('groups container types and bulky-waste zones', async () => {
      await renderScreen()

      await openTypeFilters()

      expect(screen.getByText('wasteContainers.group.wasteContainerTypes')).toBeOnTheScreen()
      expect(screen.getByText('wasteContainers.group.zones')).toBeOnTheScreen()
      expect(screen.getByText('wasteContainers.types.bulkyWasteZones')).toBeOnTheScreen()
      expect(screen.getByText('wasteContainers.filters.all').parent).toHaveStyle({
        backgroundColor: PRIMARY,
      })
    })

    it('shows only containers of the chosen types', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await openTypeFilters()

      await fireEvent.press(screen.getByText('wasteContainers.types.glass'))
      await fireEvent.press(screen.getByText('wasteContainers.types.paper'))

      expect(shownContainers()).toEqual(['DAMAGED-3', 'DIRTY-4', 'BAGGED-7'])
    })

    it('shows every type again when "all" is chosen', async () => {
      await renderScreen()
      await panTo(ZOOMED_IN)
      await openTypeFilters()
      await fireEvent.press(screen.getByText('wasteContainers.types.glass'))

      await fireEvent.press(screen.getByText('wasteContainers.filters.all'))

      expect(shownContainers()).toHaveLength(6)
    })

    it('zooms in to street level so a specific type is visible', async () => {
      await renderScreen()
      await openTypeFilters()

      await fireEvent.press(screen.getByText('wasteContainers.types.glass'))

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        {...USER, latitudeDelta: INDIVIDUAL_DELTA, longitudeDelta: INDIVIDUAL_DELTA},
        400
      )
    })

    it('closes both filter lists when the map is tapped', async () => {
      await renderScreen()
      await openTypeFilters()

      await fireEvent.press(map())

      expect(screen.queryByText('wasteContainers.group.zones')).toBeNull()
    })

    it('closes the state list when the type list opens', async () => {
      await renderScreen()
      await openStateFilters()

      await openTypeFilters()

      expect(screen.queryByText('wasteContainers.filters.uncollected')).toBeNull()
      expect(screen.getByText('wasteContainers.group.zones')).toBeOnTheScreen()
    })
  })

  describe('bulky-waste zones', () => {
    it('loads the zones once with a cancellable request', async () => {
      await renderScreen()

      expect(mockZones).toHaveBeenCalledTimes(1)
      expect(mockZones.mock.calls[0][0]).toBeInstanceOf(AbortSignal)
    })

    it('cancels the zone request when the screen closes', async () => {
      await renderScreen()
      const signal: AbortSignal = mockZones.mock.calls[0][0]

      await screen.unmount()

      expect(signal.aborted).toBe(true)
    })

    it('hides the zones until they are chosen in the type filter', async () => {
      await renderScreen()

      expect(screen.queryAllByTestId('polygon')).toHaveLength(0)
    })

    it('draws each zone polygon with its holes, skipping rings with fewer than 3 points', async () => {
      await renderScreen()
      await openTypeFilters()

      await fireEvent.press(screen.getByText('wasteContainers.types.bulkyWasteZones'))

      const polygons = screen.getAllByTestId('polygon')
      expect(polygons.map((p) => p.props.coordinates[0])).toEqual([
        {latitude: 42.6, longitude: 23.3},
        {latitude: 42.65, longitude: 23.37},
        {latitude: 42.64, longitude: 23.39},
      ])
      expect(polygons[0].props.holes).toEqual([
        [
          {latitude: 42.601, longitude: 23.301},
          {latitude: 42.601, longitude: 23.302},
          {latitude: 42.602, longitude: 23.302},
        ],
      ])
      expect(polygons[1].props.holes).toEqual([])
    })

    it('opens the zone details when a zone is tapped and closes them again', async () => {
      await renderScreen()
      await openTypeFilters()
      await fireEvent.press(screen.getByText('wasteContainers.types.bulkyWasteZones'))

      await fireEvent.press(screen.getAllByTestId('polygon')[2])
      expect(screen.getByText('zone:Mladost')).toBeOnTheScreen()

      await fireEvent.press(screen.getByText('zone:Mladost'))
      expect(screen.queryByText(/^zone:/)).toBeNull()
    })

    it('keeps the map working when zones fail to load', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockZones.mockRejectedValue(new Error('offline'))

      await renderScreen()

      expect(error).toHaveBeenCalledWith('[fetchBulkyWasteZones] Error:', expect.any(Error))
      expect(map()).toBeOnTheScreen()
    })
  })

  describe('follow me', () => {
    it('is on at first and watches the position closely', async () => {
      await renderScreen()

      expect(actionButtons().followMe).toHaveStyle({backgroundColor: PRIMARY})
      expect(mockWatch.mock.calls[0][0]).toEqual({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 5000,
        distanceInterval: 5,
      })
    })

    it('keeps the map on the user as they move', async () => {
      await renderScreen()
      await panTo({latitude: 42.7, longitude: 23.3, latitudeDelta: 0.02, longitudeDelta: 0.03})

      const onPosition = mockWatch.mock.calls.at(-1)[1]
      await act(async () => onPosition({coords: {latitude: 42.66, longitude: 23.36}}))

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        {latitude: 42.66, longitude: 23.36, latitudeDelta: 0.02, longitudeDelta: 0.03},
        1000
      )
    })

    it('stops following when switched off', async () => {
      await renderScreen()

      await fireEvent.press(actionButtons().followMe)

      expect(actionButtons().followMe).not.toHaveStyle({backgroundColor: PRIMARY})
      const activeWatch = await mockWatch.mock.results.at(-1)!.value
      expect(activeWatch.remove).toHaveBeenCalled()
    })

    it('flies back to the user when switched on again', async () => {
      await renderScreen()
      await fireEvent.press(actionButtons().followMe)
      mockAnimateToRegion.mockClear()

      await fireEvent.press(actionButtons().followMe)

      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {...USER, latitudeDelta: 0.01, longitudeDelta: 0.01},
        500
      )
    })

    // BUG: app/(tabs)/maps/waste-containers.tsx:266-313 — on mount the watch effect asks for
    // permission itself, the permission state change re-runs the effect while the first
    // watchPositionAsync is still pending, and a second watch is started. watchRef ends up
    // holding only one of them, so the other high-accuracy GPS watch is never removed, even
    // after the screen closes. Every visit to the map leaks one.
    it.failing('stops every location watch it started when the screen closes', async () => {
      // Like the native module, the watch handle arrives on a later tick than the re-render.
      mockWatch.mockImplementation(
        () => new Promise((resolve) => setImmediate(() => resolve({remove: jest.fn()})))
      )
      await renderScreen()
      await act(async () => {
        await new Promise((resolve) => setImmediate(resolve))
      })
      await screen.unmount()

      const subscriptions = await Promise.all(mockWatch.mock.results.map((r) => r.value))
      expect(subscriptions.length).toBeGreaterThan(0)
      for (const subscription of subscriptions) {
        expect(subscription.remove).toHaveBeenCalled()
      }
    })
  })

  describe('zoom buttons', () => {
    it('zooms in around the area on screen', async () => {
      await renderScreen()
      await panTo({latitude: 42.7, longitude: 23.3, latitudeDelta: 0.02, longitudeDelta: 0.04})

      await fireEvent.press(actionButtons().zoomIn)

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        {latitude: 42.7, longitude: 23.3, latitudeDelta: 0.01, longitudeDelta: 0.02},
        300
      )
    })

    it('zooms out around the area on screen, capped at the whole globe', async () => {
      await renderScreen()
      await panTo({latitude: 10, longitude: 20, latitudeDelta: 60, longitudeDelta: 100})

      await fireEvent.press(actionButtons().zoomOut)

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        {latitude: 10, longitude: 20, latitudeDelta: 90, longitudeDelta: 180},
        300
      )
    })

    it('zooms around the user before the map has moved', async () => {
      await renderScreen()

      await fireEvent.press(actionButtons().zoomOut)

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        {...USER, latitudeDelta: 0.02, longitudeDelta: 0.02},
        300
      )
    })
  })
})
