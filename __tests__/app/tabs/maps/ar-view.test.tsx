import React from 'react'
import {Dimensions, StyleSheet} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import * as Location from 'expo-location'
import ArView from '../../../../app/(tabs)/maps/ar-view'
import {loadNearbyContainers} from '../../../../lib/containerUtils'
import type {WasteContainer} from '../../../../types/wasteContainer'
import {colors} from '../../../../styles/tokens'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockT}),
}))
const mockT = (key: string) => key

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 20, left: 0}),
}))

let mockCameraPermission: {granted: boolean} | null = {granted: true}
const mockRequestCameraPermission = jest.fn()
jest.mock('expo-camera', () => {
  const {View} = require('react-native')
  return {
    CameraView: (props: object) => <View testID="camera" {...props} />,
    useCameraPermissions: () => [mockCameraPermission, mockRequestCameraPermission],
  }
})

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {Balanced: 3, BestForNavigation: 6},
}))

let mockHeading: number | null = 0
let mockCompassAvailable = true
jest.mock('../../../../hooks/useDeviceHeading', () => ({
  useDeviceHeading: () => ({heading: mockHeading, available: mockCompassAvailable}),
}))

jest.mock('../../../../lib/containerUtils', () => ({
  loadNearbyContainers: jest.fn(),
}))

jest.mock('../../../../components/WasteContainerCard', () => {
  const {Pressable, Text} = require('react-native')
  return {
    WasteContainerCard: ({
      container,
      onClose,
    }: {
      container: {publicNumber: string}
      onClose: () => void
    }) => (
      <Pressable onPress={onClose}>
        <Text>{`card:${container.publicNumber}`}</Text>
      </Pressable>
    ),
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

const mockNearby = loadNearbyContainers as jest.Mock
const mockPermission = Location.requestForegroundPermissionsAsync as jest.Mock
const mockPosition = Location.getCurrentPositionAsync as jest.Mock
const mockWatch = Location.watchPositionAsync as jest.Mock

const NOW = new Date('2026-11-16T12:00:00.000Z')
const USER = {latitude: 42.68, longitude: 23.32}
const {width: W, height: H} = Dimensions.get('window')
const CARD_HALF = 110
const LEFT_EDGE_CENTRE = 110 + 12
const RIGHT_EDGE_CENTRE = W - 110 - 12

type Nearby = WasteContainer & {distance: number}

const nearby = (overrides: Partial<Nearby>): Nearby => ({
  id: '1',
  publicNumber: 'AR-1',
  location: [USER.longitude, USER.latitude + 0.0002],
  // Due north of the user, so its bearing is exactly 0°.
  latitude: USER.latitude + 0.0002,
  longitude: USER.longitude,
  capacityVolume: 1.1,
  capacitySize: 'standard',
  wasteType: 'general',
  status: 'active',
  state: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  distance: 20,
  ...overrides,
})

const due = {
  south: {latitude: USER.latitude - 0.0002, longitude: USER.longitude},
}

/** The absolutely positioned wrapper around a container's overlay card. */
function placementOf(publicNumber: string) {
  let node = screen.getByText(publicNumber)
  while (StyleSheet.flatten(node.props.style)?.zIndex === undefined) node = node.parent!
  const {left, top, zIndex} = StyleSheet.flatten(node.props.style)
  return {centre: (left as number) + CARD_HALF, top: top as number, zIndex: zIndex as number}
}

const shownCards = () => screen.queryAllByText(/^AR-/).map((n) => n.props.children)
const spinners = () => screen.container.queryAll((n) => n.type === 'ActivityIndicator')
const CHEVRON_LEFT = 'm15 18-6-6 6-6'
const CHEVRON_RIGHT = 'm9 18 6-6-6-6'
/** The turn hints shown on overlay cards, read from the chevron icon paths. */
const turnHints = () =>
  screen.container
    .queryAll((n) => n.props.d === CHEVRON_LEFT || n.props.d === CHEVRON_RIGHT)
    .map((n) => (n.props.d === CHEVRON_LEFT ? 'left' : 'right'))

async function renderAr(containers: Nearby[] = [nearby({})], onClose = jest.fn()) {
  mockNearby.mockResolvedValue(containers)
  await render(<ArView onClose={onClose} />)
  await waitFor(() => expect(mockWatch).toHaveBeenCalled())
  return {onClose}
}

describe('ArView', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask']})
    mockCameraPermission = {granted: true}
    mockHeading = 0
    mockCompassAvailable = true
    mockPermission.mockResolvedValue({status: 'granted'})
    mockPosition.mockResolvedValue({coords: USER})
    mockWatch.mockImplementation(async () => ({remove: jest.fn()}))
    mockNearby.mockResolvedValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('camera permission', () => {
    it('waits while the camera permission is being checked', async () => {
      mockCameraPermission = null
      await render(<ArView onClose={jest.fn()} />)

      expect(spinners()).toHaveLength(1)
      expect(screen.queryByTestId('camera')).toBeNull()
    })

    it('asks for camera access when it is not granted', async () => {
      mockCameraPermission = {granted: false}
      await render(<ArView onClose={jest.fn()} />)

      expect(screen.getByText('map.permissions.title')).toBeOnTheScreen()
      await fireEvent.press(screen.getByText('map.permissions.button'))

      expect(mockRequestCameraPermission).toHaveBeenCalled()
      expect(screen.queryByTestId('camera')).toBeNull()
    })

    it('shows the rear camera once access is granted', async () => {
      await renderAr()

      expect(screen.getByTestId('camera').props).toEqual(
        expect.objectContaining({facing: 'back', flash: 'auto'})
      )
    })
  })

  describe('location', () => {
    it('loads up to 20 containers within 50 m of the user', async () => {
      await renderAr()

      await waitFor(() => expect(mockNearby).toHaveBeenCalledWith(USER, 50, {limit: 20}))
      expect(mockPosition).toHaveBeenCalledWith({accuracy: Location.Accuracy.Balanced})
    })

    it('shows no containers without location access', async () => {
      mockPermission.mockResolvedValue({status: 'denied'})
      await render(<ArView onClose={jest.fn()} />)
      await act(async () => {})

      expect(mockPosition).not.toHaveBeenCalled()
      expect(mockWatch).not.toHaveBeenCalled()
      expect(mockNearby).not.toHaveBeenCalled()
      expect(shownCards()).toEqual([])
    })

    it('watches the position closely', async () => {
      await renderAr()

      expect(mockWatch.mock.calls[0][0]).toEqual({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 10,
      })
    })

    it('does not reload containers for moves shorter than 50 m', async () => {
      await renderAr()
      await waitFor(() => expect(mockNearby).toHaveBeenCalledTimes(1))
      const onPosition = mockWatch.mock.calls[0][1]

      // ~44 m north
      await act(async () =>
        onPosition({coords: {latitude: USER.latitude + 0.0004, longitude: USER.longitude}})
      )

      expect(mockNearby).toHaveBeenCalledTimes(1)
    })

    it('reloads containers around the new position after a 50 m move', async () => {
      await renderAr()
      await waitFor(() => expect(mockNearby).toHaveBeenCalledTimes(1))
      const onPosition = mockWatch.mock.calls[0][1]
      const moved = {latitude: USER.latitude + 0.0005, longitude: USER.longitude}

      // ~56 m north
      await act(async () => onPosition({coords: moved}))

      expect(mockNearby).toHaveBeenCalledTimes(2)
      expect(mockNearby).toHaveBeenLastCalledWith(moved, 50, {limit: 20})
    })

    it('loads containers on the first watch update when the starting position fails', async () => {
      mockPosition.mockRejectedValue(new Error('GPS off'))
      await renderAr()
      expect(mockNearby).not.toHaveBeenCalled()

      await act(async () => mockWatch.mock.calls[0][1]({coords: USER}))

      expect(mockNearby).toHaveBeenCalledWith(USER, 50, {limit: 20})
      expect(shownCards()).toEqual(['AR-1'])
    })

    it('shows a spinner while containers load', async () => {
      let resolve!: (value: Nearby[]) => void
      mockNearby.mockReturnValue(new Promise((r) => (resolve = r)))
      await render(<ArView onClose={jest.fn()} />)
      await waitFor(() => expect(mockNearby).toHaveBeenCalled())

      expect(spinners()).toHaveLength(1)
      await act(async () => resolve([nearby({})]))
      expect(spinners()).toHaveLength(0)
    })

    it('keeps the containers already shown when a reload fails', async () => {
      await renderAr()
      await waitFor(() => expect(shownCards()).toEqual(['AR-1']))
      mockNearby.mockRejectedValue(new Error('offline'))

      await act(async () =>
        mockWatch.mock.calls[0][1]({
          coords: {latitude: USER.latitude + 0.001, longitude: USER.longitude},
        })
      )

      expect(shownCards()).toEqual(['AR-1'])
      expect(spinners()).toHaveLength(0)
    })

    it('stops watching the position when closed', async () => {
      await renderAr()
      const subscription = await mockWatch.mock.results[0].value

      await screen.unmount()

      expect(subscription.remove).toHaveBeenCalled()
    })

    // BUG: app/(tabs)/maps/ar-view.tsx:179-220 — the watch handle is stored after
    // `await watchPositionAsync` without checking that the view is still open. If the view
    // closes while the watch is starting, the unmount cleanup has nothing to remove and the
    // high-accuracy GPS watch runs on.
    it.failing('stops watching when closed while the watch is starting', async () => {
      const subscription = {remove: jest.fn()}
      let startWatch!: (s: typeof subscription) => void
      mockWatch.mockReturnValue(new Promise((r) => (startWatch = r)))
      await renderAr()

      await screen.unmount()
      await act(async () => startWatch(subscription))

      expect(subscription.remove).toHaveBeenCalled()
    })
  })

  describe('placing containers', () => {
    it('centres a container straight ahead', async () => {
      await renderAr()

      await waitFor(() => expect(placementOf('AR-1').centre).toBe(W / 2))
    })

    it('treats an unknown heading as facing north', async () => {
      mockHeading = null
      await renderAr()

      await waitFor(() => expect(placementOf('AR-1').centre).toBe(W / 2))
    })

    it('places a container 15° to the right three quarters across the screen', async () => {
      mockHeading = 345
      await renderAr()

      await waitFor(() =>
        expect(placementOf('AR-1').centre).toBeCloseTo(Math.min(W * 0.75, RIGHT_EDGE_CENTRE), 6)
      )
      expect(turnHints()).toHaveLength(0)
    })

    it('places a container 15° to the left a quarter across the screen', async () => {
      mockHeading = 15
      await renderAr()

      await waitFor(() =>
        expect(placementOf('AR-1').centre).toBeCloseTo(Math.max(W * 0.25, LEFT_EDGE_CENTRE), 6)
      )
    })

    it('keeps a card at the edge of the view fully on screen', async () => {
      mockHeading = 30
      await renderAr()

      await waitFor(() => expect(placementOf('AR-1').centre).toBe(LEFT_EDGE_CENTRE))
      expect(turnHints()).toHaveLength(0)
    })

    it('pins a container outside the view to the left edge with a turn-left hint', async () => {
      mockHeading = 31
      await renderAr()

      await waitFor(() => expect(placementOf('AR-1').centre).toBe(LEFT_EDGE_CENTRE))
      expect(turnHints()).toEqual(['left'])
    })

    it('pins a container behind-right to the right edge with a turn-right hint', async () => {
      mockHeading = 270
      await renderAr()

      await waitFor(() => expect(placementOf('AR-1').centre).toBe(RIGHT_EDGE_CENTRE))
      expect(turnHints()).toEqual(['right'])
    })

    it('measures the bearing from the user, not the heading alone', async () => {
      mockHeading = 180
      await renderAr([nearby({...due.south})])

      await waitFor(() => expect(placementOf('AR-1').centre).toBe(W / 2))
    })

    it('hides containers further than 50 m', async () => {
      await renderAr([
        nearby({id: '1', publicNumber: 'AR-near', distance: 50}),
        nearby({id: '2', publicNumber: 'AR-far', distance: 50.5}),
      ])

      await waitFor(() => expect(shownCards()).toEqual(['AR-near']))
    })

    it('draws farther containers first and lower, and keeps nearer ones on top', async () => {
      mockHeading = 0
      await renderAr([
        // Same bearing as the user is facing, but spread out so the cards do not overlap.
        nearby({id: '1', publicNumber: 'AR-10m', distance: 10, longitude: USER.longitude - 0.0001}),
        nearby({id: '2', publicNumber: 'AR-50m', distance: 50, longitude: USER.longitude + 0.0001}),
      ])
      await waitFor(() => expect(shownCards()).toHaveLength(2))

      expect(shownCards()).toEqual(['AR-50m', 'AR-10m'])
      const near = placementOf('AR-10m')
      const far = placementOf('AR-50m')
      expect(near.zIndex).toBe(401)
      expect(far.zIndex).toBe(1)
      expect(near.top).toBeCloseTo(H * 0.3 + 7, 6)
      expect(far.top).toBeCloseTo(H * 0.3 + 35, 6)
    })

    it('stacks overlapping cards below each other', async () => {
      await renderAr([
        nearby({id: '1', publicNumber: 'AR-a', distance: 40}),
        nearby({id: '2', publicNumber: 'AR-b', distance: 30}),
        nearby({id: '3', publicNumber: 'AR-c', distance: 10}),
      ])
      await waitFor(() => expect(shownCards()).toHaveLength(3))

      const base = H * 0.3 + 28
      expect(placementOf('AR-a').top).toBeCloseTo(base, 6)
      expect(placementOf('AR-b').top).toBeCloseTo(base + 110, 6)
      expect(placementOf('AR-c').top).toBeCloseTo(base + 220, 6)
    })
  })

  describe('overlay card', () => {
    it('shows the container number, rounded distance and operator', async () => {
      await renderAr([nearby({distance: 23.6, servicedBy: 'Sofia Clean'})])

      await waitFor(() => expect(screen.getByText('AR-1')).toBeOnTheScreen())
      expect(screen.getByText('arView.distance:  24')).toBeOnTheScreen()
      expect(screen.getByText('arView.servicedBy: Sofia Clean')).toBeOnTheScreen()
    })

    it('leaves out the operator when unknown', async () => {
      await renderAr()

      await waitFor(() => expect(screen.getByText('AR-1')).toBeOnTheScreen())
      expect(screen.queryByText(/arView\.servicedBy/)).toBeNull()
    })

    it.each([
      [undefined, 'arView.unknown'],
      ['2026-13-45 99:99:99+00', 'arView.unknown'],
      ['2026-11-16 11:30:00+00', 'arView.lessThanHour'],
      ['2026-11-16 11:00:00+00', '1 arView.hour'],
      ['2026-11-16 07:15:00.123456+00', '4 arView.hours'],
      ['2026-11-15 11:00:00+00', '1 arView.day'],
      ['2026-11-13 10:00:00+00', '3 arView.days'],
    ])('describes a last collection at %s as "%s"', async (lastCleaned, label) => {
      await renderAr([nearby({lastCleaned})])

      await waitFor(() =>
        expect(screen.getByText(`arView.lastCleaned: ${label}`)).toBeOnTheScreen()
      )
    })

    it.each([
      ['full', {state: ['full' as const]}, colors.error],
      ['marked full by status', {status: 'full' as const}, colors.error],
      ['damaged', {state: ['damaged' as const]}, colors.textPrimary],
      ['bagged', {state: ['bagged' as const]}, colors.textPrimary],
      ['dirty', {state: ['dirty' as const]}, '#F97316'],
      ['fine', {}, colors.success],
    ])('colours a %s container', async (_, overrides, colour) => {
      await renderAr([nearby(overrides)])

      await waitFor(() => expect(screen.getByText('AR-1')).toBeOnTheScreen())
      expect(screen.getByText(/^arView\.distance/)).toHaveStyle({color: colour})
    })

    it('opens the container card when tapped', async () => {
      await renderAr()
      await waitFor(() => expect(screen.getByText('AR-1')).toBeOnTheScreen())

      await fireEvent.press(screen.getByText('AR-1'))

      expect(screen.getByText('card:AR-1')).toBeOnTheScreen()
    })

    it.each([
      ['the card', () => fireEvent.press(screen.getByText('card:AR-1'))],
      ['the backdrop', () => fireEvent.press(screen.getByTestId('backdrop'))],
      [
        'the back button',
        () =>
          fireEvent(
            screen.container.queryAll((n) => n.props.onRequestClose !== undefined)[0],
            'requestClose'
          ),
      ],
    ])('closes the container card from %s', async (_, close) => {
      await renderAr()
      await waitFor(() => expect(screen.getByText('AR-1')).toBeOnTheScreen())
      await fireEvent.press(screen.getByText('AR-1'))

      await close()

      expect(screen.queryByText('card:AR-1')).toBeNull()
    })
  })

  describe('controls', () => {
    it('turns the camera off before closing the view', async () => {
      const {onClose} = await renderAr()
      const closeButton = screen.container.queryAll((n) => {
        const style = StyleSheet.flatten(n.props.style)
        return (
          typeof n.type === 'string' && n.props.onClick !== undefined && style?.right !== undefined
        )
      })[0]

      await fireEvent.press(closeButton)

      expect(screen.queryByTestId('camera')).toBeNull()
      expect(onClose).not.toHaveBeenCalled()
      await act(async () => {
        jest.advanceTimersByTime(80)
      })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('warns when the compass is unavailable', async () => {
      mockCompassAvailable = false
      await renderAr()

      expect(screen.getByText('arView.noCompass')).toBeOnTheScreen()
    })

    it('shows no compass warning when the compass works', async () => {
      await renderAr()

      expect(screen.queryByText('arView.noCompass')).toBeNull()
    })

    it('shows the raw heading in development builds', async () => {
      mockHeading = 123.456
      await renderAr()

      expect(screen.getByText('↑ 123.5°')).toBeOnTheScreen()
    })
  })
})
