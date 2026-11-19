import React from 'react'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import * as Location from 'expo-location'
import DrinkingFountains from '../../../../app/(tabs)/maps/drinking-fountains'
import {fetchDrinkingFountains, type DrinkingFountain} from '../../../../lib/payload'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockT}),
}))
// Stable across renders: the screen reloads fountains whenever `t` changes.
const mockT = (key: string) => key

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 20, left: 0}),
}))

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {Balanced: 3},
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
    PROVIDER_DEFAULT: 'default',
  }
})

jest.mock('../../../../lib/payload', () => ({
  fetchDrinkingFountains: jest.fn(),
}))

jest.mock('../../../../components/DrinkingFountainMarker', () => {
  const {View} = require('react-native')
  return {
    DrinkingFountainMarker: ({color}: {color: string}) => (
      <View testID="fountain-marker" accessibilityHint={color} />
    ),
  }
})

jest.mock('../../../../components/DrinkingFountainCard', () => {
  const {Pressable, Text} = require('react-native')
  return {
    getFountainColor: (fountain: {isActive: boolean | null}) =>
      fountain.isActive === false ? 'broken-colour' : 'working-colour',
    DrinkingFountainCard: ({
      fountain,
      onClose,
    }: {
      fountain: {address: string}
      onClose: () => void
    }) => (
      <Pressable onPress={onClose}>
        <Text>{`card:${fountain.address}`}</Text>
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

const mockFetch = fetchDrinkingFountains as jest.Mock
const mockPermission = Location.requestForegroundPermissionsAsync as jest.Mock
const mockPosition = Location.getCurrentPositionAsync as jest.Mock
const mockWatch = Location.watchPositionAsync as jest.Mock

const SOFIA = {latitude: 42.6977, longitude: 23.3219}

const fountain = (overrides: Partial<DrinkingFountain>): DrinkingFountain => ({
  id: 1,
  publicNumber: 'DF-RTR-0001',
  address: 'bul. Vitosha 1',
  latitude: 42.69,
  longitude: 23.32,
  isActive: true,
  protectionStatus: null,
  externalLink: null,
  districtName: 'Sredets',
  sourceName: 'City water supply',
  statusName: 'Good condition',
  ownerName: null,
  activationName: null,
  createdAt: null,
  updatedAt: null,
  ...overrides,
})

const fountains = [
  fountain({id: 1, address: 'bul. Vitosha 1'}),
  fountain({
    id: 2,
    address: 'Borisova gradina',
    latitude: 42.68,
    longitude: 23.34,
    isActive: false,
    sourceName: 'Mineral spring',
    statusName: 'Broken',
  }),
  fountain({id: 3, address: 'Zaimov park', sourceName: null, statusName: 'Broken'}),
  fountain({id: 4, address: 'Lozenets', sourceName: 'Mineral spring', statusName: null}),
]

const map = () => screen.getByTestId('map')
const markers = () => screen.queryAllByTestId('marker')
const shownAddresses = async () => {
  const shown: string[] = []
  for (const marker of markers()) {
    await fireEvent.press(marker)
    shown.push(screen.getByText(/^card:/).props.children.replace('card:', ''))
    await fireEvent.press(screen.getByText(/^card:/))
  }
  return shown
}
const markerCoordinates = () => markers().map((m) => m.props.coordinate)
const spinners = () => screen.container.queryAll((node) => node.type === 'ActivityIndicator')

/** The action buttons are, in order: follow-me, zoom in, zoom out. */
function actionButtons() {
  const buttons = screen.container.queryAll(
    (node) =>
      typeof node.type === 'string' &&
      node.props.onClick !== undefined &&
      node.props.accessibilityRole !== 'text' &&
      node.parent?.props.style?.position === 'absolute' &&
      node.parent?.props.style?.bottom === 20
  )
  return {followMe: buttons[0], zoomIn: buttons[1], zoomOut: buttons[2]}
}

function subscription() {
  return {remove: jest.fn()}
}

async function renderScreen() {
  await render(<DrinkingFountains />)
  await waitFor(() => expect(spinners()).toHaveLength(0))
}

describe('DrinkingFountains', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue(fountains)
    mockPermission.mockResolvedValue({status: 'granted'})
    mockPosition.mockResolvedValue({coords: {latitude: 42.65, longitude: 23.38}})
    mockWatch.mockImplementation(async () => subscription())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('loading', () => {
    it('loads every fountain once and shows a marker for each', async () => {
      await renderScreen()

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(markerCoordinates()).toEqual([
        {latitude: 42.69, longitude: 23.32},
        {latitude: 42.68, longitude: 23.34},
        {latitude: 42.69, longitude: 23.32},
        {latitude: 42.69, longitude: 23.32},
      ])
    })

    it('colours each marker by whether the fountain works', async () => {
      await renderScreen()

      expect(
        screen.getAllByTestId('fountain-marker').map((m) => m.props.accessibilityHint)
      ).toEqual(['working-colour', 'broken-colour', 'working-colour', 'working-colour'])
    })

    it('shows a spinner while fountains load', async () => {
      let resolve!: (data: DrinkingFountain[]) => void
      mockFetch.mockReturnValue(new Promise((r) => (resolve = r)))
      await render(<DrinkingFountains />)

      expect(spinners()).toHaveLength(1)

      await act(async () => resolve(fountains))
      expect(spinners()).toHaveLength(0)
      expect(markers()).toHaveLength(4)
    })

    it('shows a dismissable error when fountains fail to load', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockRejectedValue(new Error('offline'))
      await renderScreen()

      expect(screen.getByText('fountains.loadError')).toBeOnTheScreen()
      expect(error).toHaveBeenCalledWith('[fetchDrinkingFountains] Error:', expect.any(Error))
      expect(markers()).toHaveLength(0)

      await fireEvent.press(screen.getByText('common.cancel'))
      expect(screen.queryByText('fountains.loadError')).toBeNull()
    })
  })

  describe('location', () => {
    it('starts on Sofia and shows the user position once location is allowed', async () => {
      await renderScreen()

      expect(map().props.initialRegion).toEqual({
        latitude: 42.65,
        longitude: 23.38,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      })
      expect(map().props.showsUserLocation).toBe(true)
      expect(mockPosition).toHaveBeenCalledWith({accuracy: Location.Accuracy.Balanced})
    })

    it('stays on Sofia without the user dot when location is denied', async () => {
      mockPermission.mockResolvedValue({status: 'denied'})
      await renderScreen()

      expect(map().props.initialRegion).toEqual({
        ...SOFIA,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      })
      expect(map().props.showsUserLocation).toBe(false)
      expect(mockPosition).not.toHaveBeenCalled()
    })

    it('stays on Sofia when the position cannot be read', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockPosition.mockRejectedValue(new Error('GPS off'))
      await renderScreen()

      await waitFor(() =>
        expect(error).toHaveBeenCalledWith('Error getting location:', expect.any(Error))
      )
      expect(map().props.initialRegion).toEqual({
        ...SOFIA,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      })
    })
  })

  describe('fountain details', () => {
    it('opens the fountain card when a marker is tapped', async () => {
      await renderScreen()
      expect(screen.queryByText(/^card:/)).toBeNull()

      await fireEvent.press(markers()[1])

      expect(screen.getByText('card:Borisova gradina')).toBeOnTheScreen()
    })

    it('closes the card from the card itself', async () => {
      await renderScreen()
      await fireEvent.press(markers()[0])

      await fireEvent.press(screen.getByText('card:bul. Vitosha 1'))

      expect(screen.queryByText(/^card:/)).toBeNull()
    })

    it('closes the card when the backdrop is tapped', async () => {
      await renderScreen()
      await fireEvent.press(markers()[0])

      await fireEvent.press(screen.getByTestId('backdrop'))

      expect(screen.queryByText(/^card:/)).toBeNull()
    })

    it('closes the card with the hardware back button', async () => {
      await renderScreen()
      await fireEvent.press(markers()[0])

      const modal = screen.container.queryAll((n) => n.props.onRequestClose !== undefined)[0]
      await fireEvent(modal, 'requestClose')

      expect(screen.queryByText(/^card:/)).toBeNull()
    })
  })

  describe('filters', () => {
    it('lists each condition once, sorted, after "all"', async () => {
      await renderScreen()

      await fireEvent.press(screen.getByText('fountains.filterByCondition'))

      expect(screen.getByText('fountains.filterAll')).toBeOnTheScreen()
      expect(screen.getAllByText(/^(Broken|Good condition)$/).map((n) => n.props.children)).toEqual(
        ['Broken', 'Good condition']
      )
    })

    it('lists each water source once, sorted, after "all"', async () => {
      await renderScreen()

      await fireEvent.press(screen.getByText('fountains.filterBySource'))

      expect(
        screen.getAllByText(/^(City water supply|Mineral spring)$/).map((n) => n.props.children)
      ).toEqual(['City water supply', 'Mineral spring'])
    })

    it('shows only fountains in the chosen condition and closes the list', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('fountains.filterByCondition'))

      await fireEvent.press(screen.getByText('Broken'))

      expect(await shownAddresses()).toEqual(['Borisova gradina', 'Zaimov park'])
      expect(screen.queryByText('fountains.filterAll')).toBeNull()
    })

    it('shows only fountains with the chosen water source', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('fountains.filterBySource'))

      await fireEvent.press(screen.getByText('Mineral spring'))

      expect(await shownAddresses()).toEqual(['Borisova gradina', 'Lozenets'])
    })

    it('combines the condition and source filters', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('fountains.filterByCondition'))
      await fireEvent.press(screen.getByText('Broken'))
      await fireEvent.press(screen.getByText('fountains.filterBySource'))

      await fireEvent.press(screen.getByText('Mineral spring'))

      expect(await shownAddresses()).toEqual(['Borisova gradina'])
    })

    it('shows every fountain again when "all" is chosen', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('fountains.filterByCondition'))
      await fireEvent.press(screen.getByText('Broken'))
      await fireEvent.press(screen.getByText('fountains.filterByCondition'))

      await fireEvent.press(screen.getByText('fountains.filterAll'))

      expect(markers()).toHaveLength(4)
    })

    it('highlights the chosen option', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('fountains.filterByCondition'))
      await fireEvent.press(screen.getByText('Broken'))

      await fireEvent.press(screen.getByText('fountains.filterByCondition'))

      expect(screen.getByText('Broken').parent).toHaveStyle({backgroundColor: '#2F54C5'})
      expect(screen.getByText('fountains.filterAll').parent).not.toHaveStyle({
        backgroundColor: '#2F54C5',
      })
    })

    it('closes the other list when one is opened', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('fountains.filterByCondition'))

      await fireEvent.press(screen.getByText('fountains.filterBySource'))

      expect(screen.queryByText('Good condition')).toBeNull()
      expect(screen.getByText('City water supply')).toBeOnTheScreen()
    })

    it('collapses a list when its header is tapped again', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('fountains.filterByCondition'))

      await fireEvent.press(screen.getByText('fountains.filterByCondition'))

      expect(screen.queryByText('fountains.filterAll')).toBeNull()
    })
  })

  describe('follow me', () => {
    it('is off at first', async () => {
      await renderScreen()

      expect(mockWatch).not.toHaveBeenCalled()
      expect(actionButtons().followMe).not.toHaveStyle({backgroundColor: '#2F54C5'})
    })

    it('watches the position and keeps the map on the user', async () => {
      await renderScreen()
      await fireEvent(map(), 'regionChangeComplete', {
        latitude: 42.7,
        longitude: 23.3,
        latitudeDelta: 0.02,
        longitudeDelta: 0.03,
      })

      await fireEvent.press(actionButtons().followMe)
      await waitFor(() => expect(mockWatch).toHaveBeenCalledTimes(1))
      expect(actionButtons().followMe).toHaveStyle({backgroundColor: '#2F54C5'})
      expect(mockWatch.mock.calls[0][0]).toEqual({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      })

      const onPosition = mockWatch.mock.calls[0][1]
      await act(async () => onPosition({coords: {latitude: 42.66, longitude: 23.36}}))

      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {latitude: 42.66, longitude: 23.36, latitudeDelta: 0.02, longitudeDelta: 0.03},
        500
      )
    })

    it('stops watching when switched off', async () => {
      const sub = subscription()
      mockWatch.mockResolvedValue(sub)
      await renderScreen()
      await fireEvent.press(actionButtons().followMe)
      await waitFor(() => expect(mockWatch).toHaveBeenCalled())

      await fireEvent.press(actionButtons().followMe)

      expect(sub.remove).toHaveBeenCalled()
      expect(actionButtons().followMe).not.toHaveStyle({backgroundColor: '#2F54C5'})
    })

    it('stops watching when the screen closes', async () => {
      const sub = subscription()
      mockWatch.mockResolvedValue(sub)
      await renderScreen()
      await fireEvent.press(actionButtons().followMe)
      await waitFor(() => expect(mockWatch).toHaveBeenCalled())

      await screen.unmount()

      expect(sub.remove).toHaveBeenCalled()
    })

    it('does not watch the position without location permission', async () => {
      mockPermission.mockResolvedValue({status: 'denied'})
      await renderScreen()

      await fireEvent.press(actionButtons().followMe)

      expect(mockWatch).not.toHaveBeenCalled()
    })

    // BUG: app/(tabs)/maps/drinking-fountains.tsx:92-119 — the watch is assigned to watchRef after
    // `await watchPositionAsync`, without checking whether follow-me was switched off meanwhile. The
    // effect cleanup already ran (with nothing to remove), so the subscription keeps the GPS running
    // while follow-me is off.
    it.failing(
      'stops watching when follow-me is switched off while the watch is starting',
      async () => {
        const sub = subscription()
        let startWatch!: (s: typeof sub) => void
        mockWatch.mockReturnValue(new Promise((r) => (startWatch = r)))
        await renderScreen()
        await fireEvent.press(actionButtons().followMe)
        await waitFor(() => expect(mockWatch).toHaveBeenCalled())

        await fireEvent.press(actionButtons().followMe)
        await act(async () => startWatch(sub))

        expect(sub.remove).toHaveBeenCalled()
      }
    )
  })

  describe('zoom', () => {
    it('zooms in by halving the visible span', async () => {
      await renderScreen()

      await fireEvent.press(actionButtons().zoomIn)

      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {latitude: 42.65, longitude: 23.38, latitudeDelta: 0.025, longitudeDelta: 0.025},
        300
      )
    })

    it('zooms out by doubling the visible span, capped at the whole globe', async () => {
      await renderScreen()
      await fireEvent(map(), 'regionChangeComplete', {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 60,
        longitudeDelta: 100,
      })

      await fireEvent.press(actionButtons().zoomOut)

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        expect.objectContaining({latitudeDelta: 90, longitudeDelta: 180}),
        300
      )
    })

    it('zooms around Sofia when the user position is unknown', async () => {
      mockPermission.mockResolvedValue({status: 'denied'})
      await renderScreen()

      await fireEvent.press(actionButtons().zoomOut)

      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {...SOFIA, latitudeDelta: 0.1, longitudeDelta: 0.1},
        300
      )
    })

    // BUG: app/(tabs)/maps/drinking-fountains.tsx:121-134 — zoomBy centres on the user's position
    // (or Sofia) instead of the map's current centre, so after panning to another area the zoom
    // buttons jump the map back. The waste-container map tracks the centre and zooms in place.
    it.failing('zooms around the area on screen, not the user position', async () => {
      await renderScreen()
      await fireEvent(map(), 'regionChangeComplete', {
        latitude: 42.71,
        longitude: 23.25,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      })

      await fireEvent.press(actionButtons().zoomIn)

      expect(mockAnimateToRegion).toHaveBeenLastCalledWith(
        {latitude: 42.71, longitude: 23.25, latitudeDelta: 0.02, longitudeDelta: 0.02},
        300
      )
    })
  })
})
