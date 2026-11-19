import React from 'react'
import {Alert, Linking, StyleSheet} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import NewSignal from '../../../../app/(tabs)/new/new-signal'
import {createSignal} from '../../../../lib/payload'
import {loadNearbyContainers} from '../../../../lib/containerUtils'
import {getUniqueReporterId} from '../../../../lib/deviceId'
import {useAuth} from '../../../../contexts/AuthContext'
import {colors} from '../../../../styles/tokens'
import en from '../../../../translations/en'
import bg from '../../../../translations/bg'

const mockRouter = {push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn()}
let mockParams: Record<string, string> = {}
let mockRefocus: (() => void) | undefined

const mockUsedKeys = new Set<string>()

jest.mock('expo-router', () => {
  const {useEffect} = require('react')
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
    // Like the real hook: runs while focused and again whenever the callback changes.
    useFocusEffect: (effect: () => void) =>
      useEffect(() => {
        mockRefocus = effect
        effect()
      }, [effect]),
  }
})

jest.mock('react-i18next', () => {
  const t = (key: string, opts?: object) => {
    mockUsedKeys.add(key)
    return opts ? `${key}:${JSON.stringify(opts)}` : key
  }
  return {useTranslation: () => ({t})}
})

const mockTakePicture = jest.fn()
const mockRequestPermission = jest.fn()
let mockPermission: {granted: boolean} | null = {granted: true}

jest.mock('expo-camera', () => {
  const React = require('react')
  const {View} = require('react-native')
  return {
    CameraView: React.forwardRef(function CameraView(_props: object, ref: React.Ref<unknown>) {
      React.useImperativeHandle(ref, () => ({takePictureAsync: mockTakePicture}))
      return <View testID="camera" />
    }),
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  }
})

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {Balanced: 3},
}))

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))

jest.mock('react-native-maps', () => {
  const {View} = require('react-native')
  return {
    __esModule: true,
    default: ({children, onPress}: {children: React.ReactNode; onPress: unknown}) => (
      <View testID="map" onPress={onPress}>
        {children}
      </View>
    ),
    Marker: () => <View testID="marker" />,
  }
})

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const {ScrollView} = require('react-native')
  return {KeyboardAwareScrollView: ScrollView}
})

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  const icon = (name: string) => {
    const Icon = () => <View testID={`icon-${name}`} />
    Icon.displayName = name
    return Icon
  }
  return {X: icon('X'), MapPin: icon('MapPin'), Upload: icon('Upload')}
})

jest.mock('../../../../components/FullScreenPhotoViewer', () => {
  const {Pressable, Text} = require('react-native')
  return {
    FullScreenPhotoViewer: ({visible, photoUri, onClose}: any) =>
      visible ? (
        <Pressable onPress={onClose}>
          <Text>viewer:{photoUri}</Text>
        </Pressable>
      ) : null,
  }
})

jest.mock('../../../../lib/payload', () => ({createSignal: jest.fn()}))
jest.mock('../../../../lib/containerUtils', () => ({loadNearbyContainers: jest.fn()}))
jest.mock('../../../../lib/deviceId', () => ({getUniqueReporterId: jest.fn()}))
jest.mock('../../../../contexts/AuthContext', () => ({useAuth: jest.fn()}))

const mockCreateSignal = createSignal as jest.Mock
const mockLoadNearby = loadNearbyContainers as jest.Mock
const mockUseAuth = useAuth as jest.Mock
const location = Location as jest.Mocked<typeof Location>
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>

const GPS = {latitude: 42.69, longitude: 23.32}
const CONTAINER = {latitude: 42.7, longitude: 23.33}
const NEARBY = [
  {publicNumber: 'WC-1', distance: 12},
  {publicNumber: 'WC-2', distance: 45},
]
const containerName = (publicNumber: string) =>
  `newSignal.objectTypes.wasteContainer #${publicNumber}`
const SELECTED_CARD = {borderColor: colors.primary, backgroundColor: colors.primaryTint}

let alertSpy: jest.SpyInstance

function gpsAt(coords: {latitude: number; longitude: number}) {
  location.getCurrentPositionAsync.mockResolvedValue({coords} as any)
}

/** Renders the screen and waits for the nearby containers around the user. */
async function renderScreen() {
  await render(<NewSignal />)
  await screen.findByText(containerName('WC-1'))
}

/** Renders the screen opened from a container card (the container is prefilled). */
async function renderFromContainerCard(extra: Record<string, string> = {}) {
  mockParams = {
    containerPublicNumber: 'WC-7',
    containerName: 'Container #WC-7',
    containerLocation: JSON.stringify(CONTAINER),
    prefilledObjectType: 'waste-container',
    ...extra,
  }
  await render(<NewSignal />)
  await screen.findByText('Container #WC-7')
}

const press = (text: string) => fireEvent.press(screen.getByText(text))
const pressState = (state: string) => press(`signals.containerStates.${state}`)
const submit = () => press('newSignal.submit')

function captureButton() {
  // The shutter button has no label; its inner disc is the only 60x60 circle.
  const [inner] = screen.container.queryAll(
    (node) =>
      node.type === 'View' &&
      StyleSheet.flatten(node.props.style)?.width === 60 &&
      StyleSheet.flatten(node.props.style)?.borderRadius === 30
  )
  return inner
}

const thumbnails = () => screen.container.queryAll((node) => node.type === 'Image')

/** The buttons of the last alert shown. */
function lastAlertButtons() {
  const calls = alertSpy.mock.calls
  return calls[calls.length - 1][2] as {text: string; onPress?: () => unknown}[]
}

async function confirmSuccess() {
  expect(alertSpy).toHaveBeenLastCalledWith('signals.success', '', expect.any(Array))
  await act(async () => {
    await lastAlertButtons()[0].onPress!()
  })
}

describe('NewSignal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParams = {}
    mockPermission = {granted: true}
    mockUseAuth.mockReturnValue({isContainerAdmin: false, token: 'jwt'})
    ;(getUniqueReporterId as jest.Mock).mockResolvedValue('device-1')
    location.requestForegroundPermissionsAsync.mockResolvedValue({status: 'granted'} as any)
    gpsAt(GPS)
    mockLoadNearby.mockResolvedValue(NEARBY)
    mockCreateSignal.mockResolvedValue({id: 'sig-1'})
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('camera permission', () => {
    it('waits while the camera permission is still unknown', async () => {
      mockPermission = null
      await render(<NewSignal />)

      expect(screen.getByText('newSignal.loading')).toBeOnTheScreen()
      expect(screen.queryByText('newSignal.submit')).toBeNull()
    })

    it('asks for camera access when it was not granted', async () => {
      mockPermission = {granted: false}
      await render(<NewSignal />)

      expect(screen.getByText('newSignal.cameraPermissionRequired')).toBeOnTheScreen()
      expect(screen.queryByTestId('camera')).toBeNull()

      await press('newSignal.allowAccess')

      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    })
  })

  describe('location and nearby containers', () => {
    it('lists the containers within 200 m of the user with their distance', async () => {
      await renderScreen()

      expect(mockLoadNearby).toHaveBeenCalledWith(GPS, 200, {limit: 3})
      expect(screen.getByText(containerName('WC-2'))).toBeOnTheScreen()
      expect(screen.getByText('12newSignal.distance')).toBeOnTheScreen()
      expect(screen.getByText('45newSignal.distance')).toBeOnTheScreen()
    })

    it('shows the coordinates of the user over the camera', async () => {
      await renderScreen()

      expect(screen.getByText('42.690000, 23.320000')).toBeOnTheScreen()
    })

    it('says when there are no containers nearby', async () => {
      mockLoadNearby.mockResolvedValue([])
      await render(<NewSignal />)

      expect(await screen.findByText('newSignal.noNearbyObjects')).toBeOnTheScreen()
    })

    it('shows a spinner while the nearby containers load', async () => {
      mockLoadNearby.mockReturnValue(new Promise(() => {}))
      await render(<NewSignal />)

      expect(await screen.findByText('newSignal.loadingNearbyObjects')).toBeOnTheScreen()
    })

    it('sends the user to the settings when location access was denied', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue({status: 'denied'} as any)
      const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
      await render(<NewSignal />)

      expect(await screen.findByText('newSignal.locationRequiredBanner')).toBeOnTheScreen()
      expect(screen.getByText('newSignal.submit')).toBeDisabled()

      await press('newSignal.enableLocation')

      expect(openSettings).toHaveBeenCalledTimes(1)
      expect(mockLoadNearby).not.toHaveBeenCalled()
    })

    it('retries the location when it could not be read', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS off'))
      await render(<NewSignal />)
      await screen.findByText('newSignal.locationRequiredBanner')

      gpsAt(GPS)
      await press('newSignal.enableLocation')

      expect(await screen.findByText(containerName('WC-1'))).toBeOnTheScreen()
      expect(screen.queryByText('newSignal.locationRequiredBanner')).toBeNull()
      expect(screen.getByText('newSignal.submit')).toBeEnabled()
    })
  })

  describe('object type', () => {
    it('only lets the user report waste containers for now', async () => {
      await renderScreen()

      expect(screen.getByText('newSignal.objectTypes.wasteContainer')).toBeEnabled()
      for (const type of ['streetLight', 'roadDamage', 'parkBench', 'tree', 'car', 'other']) {
        expect(screen.getByText(`newSignal.objectTypes.${type}`)).toBeDisabled()
      }
    })

    it('hides the object types once an existing container is picked', async () => {
      await renderScreen()

      await press(containerName('WC-1'))

      expect(screen.queryByText('newSignal.objectType')).toBeNull()
      expect(screen.getByText(containerName('WC-1')).parent?.parent?.parent).toHaveStyle(
        SELECTED_CARD
      )
    })
  })

  describe('validation', () => {
    it('requires at least one container state', async () => {
      await renderScreen()

      await submit()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.selectContainerState')
      expect(mockCreateSignal).not.toHaveBeenCalled()
    })

    it('lets the user untoggle a state', async () => {
      await renderScreen()
      await pressState('full')
      await pressState('full')

      await submit()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.selectContainerState')
      expect(mockCreateSignal).not.toHaveBeenCalled()
    })
  })

  describe('submitting a new object', () => {
    it('reports a waste container at the user location', async () => {
      await renderScreen()
      await pressState('full')
      await pressState('dirty')
      await fireEvent.changeText(
        screen.getByPlaceholderText('newSignal.descriptionPlaceholder'),
        '  Bags on the pavement  '
      )

      await submit()

      expect(mockCreateSignal).toHaveBeenCalledWith(
        {
          title:
            'newSignal.objectTypes.wasteContainer - signals.containerStates.full, signals.containerStates.dirty',
          description: 'Bags on the pavement',
          category: 'waste-container',
          cityObject: {type: 'waste-container', name: undefined, referenceId: undefined},
          containerState: ['full', 'dirty'],
          location: GPS,
          reporterUniqueId: 'device-1',
        },
        undefined,
        'device-1',
        'jwt',
        expect.any(Function)
      )
    })

    it('reports anonymously when the user is not signed in', async () => {
      mockUseAuth.mockReturnValue({isContainerAdmin: false, token: null})
      await renderScreen()
      await pressState('full')

      await submit()

      expect(mockCreateSignal.mock.calls[0][3]).toBeUndefined()
    })

    it('does not check the distance for a new object', async () => {
      await renderScreen()
      await pressState('full')

      await submit()

      expect(mockCreateSignal).toHaveBeenCalledTimes(1)
      expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(2) // the two loads on open
    })

    it('reports the new object at the location pinned on the map', async () => {
      await renderScreen()

      await press('newSignal.newObject')
      expect(screen.getByText('newSignal.selectObjectLocation')).toBeOnTheScreen()
      expect(screen.getByText('42.69000, 23.32000')).toBeOnTheScreen()

      await fireEvent.press(screen.getByTestId('map'), {
        nativeEvent: {coordinate: {latitude: 42.701, longitude: 23.331}},
      })
      expect(screen.getByText('42.70100, 23.33100')).toBeOnTheScreen()
      expect(screen.getByTestId('marker')).toBeOnTheScreen()

      await press('newSignal.confirmObjectLocation')
      expect(screen.queryByText('newSignal.selectObjectLocation')).toBeNull()
      expect(screen.getByText('42.701000, 23.331000')).toBeOnTheScreen()

      await pressState('full')
      await submit()

      expect(mockCreateSignal.mock.calls[0][0].location).toEqual({
        latitude: 42.701,
        longitude: 23.331,
      })
    })

    it('keeps the user location when the map is closed without confirming', async () => {
      await renderScreen()
      await press('newSignal.newObject')
      await fireEvent.press(screen.getByTestId('map'), {
        nativeEvent: {coordinate: {latitude: 42.701, longitude: 23.331}},
      })

      await fireEvent.press(screen.getAllByTestId('icon-X')[0])

      expect(screen.queryByText('newSignal.selectObjectLocation')).toBeNull()
      expect(screen.getByText('42.690000, 23.320000')).toBeOnTheScreen()
    })
  })

  describe('submitting an existing nearby container', () => {
    it('references the picked container', async () => {
      await renderScreen()
      await press(containerName('WC-1'))
      await pressState('bagged')

      await submit()

      expect(mockCreateSignal.mock.calls[0][0]).toMatchObject({
        category: 'waste-container',
        cityObject: {
          type: 'waste-container',
          name: containerName('WC-1'),
          referenceId: 'WC-1',
        },
        containerState: ['bagged'],
        location: GPS,
      })
    })

    it('refuses a container more than 30 m away', async () => {
      await renderScreen()
      await press(containerName('WC-2'))
      await pressState('full')

      await submit()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'signals.proximityError')
      expect(mockCreateSignal).not.toHaveBeenCalled()
    })

    it('lets a container admin report a container far away', async () => {
      mockUseAuth.mockReturnValue({isContainerAdmin: true, token: 'jwt'})
      await renderScreen()
      await press(containerName('WC-2'))
      await pressState('full')

      await submit()

      expect(mockCreateSignal).toHaveBeenCalledTimes(1)
    })
  })

  describe('opened from a container card', () => {
    it('preselects the container and hides the new object option', async () => {
      await renderFromContainerCard()

      expect(screen.getByText('0newSignal.distance')).toBeOnTheScreen()
      expect(screen.queryByText('newSignal.newObject')).toBeNull()
      expect(screen.queryByText('newSignal.objectType')).toBeNull()
      expect(screen.getByText('42.700000, 23.330000')).toBeOnTheScreen()
      expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
      expect(mockLoadNearby).not.toHaveBeenCalled()
    })

    it('reports the container when the user stands next to it', async () => {
      gpsAt({latitude: 42.7001, longitude: 23.3301}) // ~14 m away
      await renderFromContainerCard()
      await pressState('full')

      await submit()

      expect(location.getCurrentPositionAsync).toHaveBeenCalledWith({accuracy: 3})
      expect(mockCreateSignal.mock.calls[0][0]).toMatchObject({
        cityObject: {type: 'waste-container', name: 'Container #WC-7', referenceId: 'WC-7'},
        location: CONTAINER,
      })
    })

    it('refuses the report when the user is more than 30 m from the container', async () => {
      gpsAt({latitude: 42.701, longitude: 23.33}) // ~111 m away
      await renderFromContainerCard()
      await pressState('full')

      await submit()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'signals.proximityError')
      expect(mockCreateSignal).not.toHaveBeenCalled()
    })

    it('leaves the distance check to the server when the GPS is not available', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue({status: 'denied'} as any)
      await renderFromContainerCard()
      await pressState('full')

      await submit()

      expect(location.getCurrentPositionAsync).not.toHaveBeenCalled()
      expect(mockCreateSignal).toHaveBeenCalledTimes(1)
    })

    it('does not check the distance for a container admin', async () => {
      mockUseAuth.mockReturnValue({isContainerAdmin: true, token: 'jwt'})
      await renderFromContainerCard()
      await pressState('full')

      await submit()

      expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
      expect(mockCreateSignal).toHaveBeenCalledTimes(1)
    })

    it('returns to the container card and asks it to refresh', async () => {
      gpsAt(CONTAINER)
      await renderFromContainerCard({returnTo: '/(tabs)/maps/waste-containers', containerId: '77'})
      await pressState('full')
      await submit()

      await confirmSuccess()

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/(tabs)/maps/waste-containers',
        params: {refreshContainerId: '77'},
      })
      expect(mockRouter.back).not.toHaveBeenCalled()
    })

    it('returns to the given screen when there is no container id', async () => {
      gpsAt(CONTAINER)
      await renderFromContainerCard({returnTo: '/(tabs)/maps/waste-containers'})
      await pressState('full')
      await submit()

      await confirmSuccess()

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/maps/waste-containers')
    })
  })

  describe('after a successful report', () => {
    it('clears the form and goes back', async () => {
      const ACTIVE_STATE = {color: colors.surface}
      const description = () => screen.getByPlaceholderText('newSignal.descriptionPlaceholder')
      await renderScreen()
      await pressState('full')
      await fireEvent.changeText(description(), 'Smells')
      await submit()
      expect(screen.getByText('signals.containerStates.full')).toHaveStyle(ACTIVE_STATE)

      await confirmSuccess()

      expect(mockRouter.back).toHaveBeenCalledTimes(1)
      expect(mockRouter.setParams).toHaveBeenCalledWith({
        containerPublicNumber: undefined,
        containerName: undefined,
        containerLocation: undefined,
        prefilledObjectType: undefined,
      })
      expect(screen.getByText('signals.containerStates.full')).not.toHaveStyle(ACTIVE_STATE)
      expect(description()).toHaveDisplayValue('')
    })
  })

  describe('while submitting', () => {
    it('shows the progress and blocks a second submission', async () => {
      let finish!: (value: unknown) => void
      mockCreateSignal.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await renderScreen()
      await pressState('full')

      const submitted = submit()

      await waitFor(() => expect(screen.getByText('newSignal.submitting')).toBeDisabled())
      expect(screen.getByText('newSignal.creatingSignal')).toBeOnTheScreen()
      expect(screen.getByText('newSignal.cancel')).toBeDisabled()
      expect(screen.getByText('signals.containerStates.dirty')).toBeDisabled()

      const onProgress = mockCreateSignal.mock.calls[0][4]
      await act(async () => onProgress(1, 2))
      expect(screen.getByText('newSignal.uploadingPhotos 1/2')).toBeOnTheScreen()

      await act(async () => finish({id: 'sig-1'}))
      await submitted

      expect(screen.getByText('newSignal.submit')).toBeEnabled()
      expect(screen.queryByText('newSignal.uploadingPhotos 1/2')).toBeNull()
      expect(mockCreateSignal).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the report fails', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('shows the server message', async () => {
      mockCreateSignal.mockRejectedValue(new Error('Server down'))
      await renderScreen()
      await pressState('full')

      await submit()

      expect(alertSpy).toHaveBeenCalledWith('signals.error', 'Server down')
      expect(screen.getByText('newSignal.submit')).toBeEnabled()
      expect(screen.queryByText('newSignal.creatingSignal')).toBeNull()
    })

    it('falls back to a generic message for unknown failures', async () => {
      mockCreateSignal.mockRejectedValue('boom')
      await renderScreen()
      await pressState('full')

      await submit()

      expect(alertSpy).toHaveBeenCalledWith('signals.error', 'newSignal.submitError')
    })

    it('explains the daily limit when the error carries a 429 status', async () => {
      mockCreateSignal.mockRejectedValue(Object.assign(new Error('Too many'), {status: 429}))
      await renderScreen()
      await pressState('full')

      await submit()

      expect(alertSpy).toHaveBeenCalledWith('signals.error', 'newSignal.dailyLimitReached')
    })

    // BUG: createSignal (lib/payload.ts:941-948) throws a plain Error without the HTTP status, so
    // the `status === 429` check in new-signal.tsx:418-419 is never true. A user over the daily
    // limit sees the raw server message instead of the translated daily-limit explanation.
    it.failing('explains the daily limit when the server answers 429', async () => {
      const actual = jest.requireActual('../../../../lib/payload')
      mockCreateSignal.mockImplementation(actual.createSignal)
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({message: 'Daily signal limit reached'}),
      })
      const originalFetch = globalThis.fetch
      globalThis.fetch = fetchMock as unknown as typeof fetch
      try {
        await renderScreen()
        await pressState('full')

        await submit()

        expect(fetchMock).toHaveBeenCalled()
        expect(alertSpy).toHaveBeenCalledWith('signals.error', 'newSignal.dailyLimitReached')
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  })

  describe('photos', () => {
    beforeEach(() => {
      const realNow = Date.now
      let tick = 0
      // Photo ids come from Date.now(); keep them unique.
      jest.spyOn(Date, 'now').mockImplementation(() => realNow() + tick++)
    })

    it('adds photos taken with the camera and uploads them with the report', async () => {
      mockTakePicture
        .mockResolvedValueOnce({uri: 'file:///one.jpg'})
        .mockResolvedValueOnce({uri: 'file:///two.jpg'})
      await renderScreen()

      await fireEvent.press(captureButton())
      await fireEvent.press(captureButton())

      expect(mockTakePicture).toHaveBeenCalledWith({quality: 0.8})
      expect(thumbnails().map((image) => image.props.source.uri)).toEqual([
        'file:///one.jpg',
        'file:///two.jpg',
      ])

      await pressState('full')
      await submit()

      const files = mockCreateSignal.mock.calls[0][1]
      expect(files).toEqual([
        {
          uri: 'file:///one.jpg',
          type: 'image/jpeg',
          name: expect.stringMatching(/^signal-photo-\d+\.jpg$/),
        },
        {
          uri: 'file:///two.jpg',
          type: 'image/jpeg',
          name: expect.stringMatching(/^signal-photo-\d+\.jpg$/),
        },
      ])
      expect(files[0].name).not.toBe(files[1].name)
      expect(mockCreateSignal.mock.calls[0][0].title).toBe(
        'newSignal.objectTypes.wasteContainer - signals.containerStates.full'
      )
    })

    it('removes a photo', async () => {
      mockTakePicture
        .mockResolvedValueOnce({uri: 'file:///one.jpg'})
        .mockResolvedValueOnce({uri: 'file:///two.jpg'})
      await renderScreen()
      await fireEvent.press(captureButton())
      await fireEvent.press(captureButton())

      await fireEvent.press(screen.getAllByTestId('icon-X')[0])

      expect(thumbnails().map((image) => image.props.source.uri)).toEqual(['file:///two.jpg'])
    })

    it('opens a photo full screen', async () => {
      mockTakePicture.mockResolvedValueOnce({uri: 'file:///one.jpg'})
      await renderScreen()
      await fireEvent.press(captureButton())

      await fireEvent.press(thumbnails()[0])
      expect(screen.getByText('viewer:file:///one.jpg')).toBeOnTheScreen()

      await press('viewer:file:///one.jpg')
      expect(screen.queryByText('viewer:file:///one.jpg')).toBeNull()
    })

    it('tells the user when the camera fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      mockTakePicture.mockRejectedValueOnce(new Error('camera busy'))
      await renderScreen()

      await fireEvent.press(captureButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.photoError')
      expect(thumbnails()).toHaveLength(0)
    })

    it('adds a photo from the gallery', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({granted: true} as any)
      picker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{uri: 'file:///gallery.jpg'}],
      } as any)
      await renderScreen()

      await fireEvent.press(screen.getByTestId('icon-Upload'))

      expect(thumbnails().map((image) => image.props.source.uri)).toEqual(['file:///gallery.jpg'])
    })

    it('explains that gallery access is needed when it was denied', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({granted: false} as any)
      await renderScreen()

      await fireEvent.press(screen.getByTestId('icon-Upload'))

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.galleryPermissionRequired')
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
    })
  })

  describe('opening the tab again', () => {
    beforeEach(() => {
      const realNow = Date.now
      let tick = 0
      jest.spyOn(Date, 'now').mockImplementation(() => realNow() + tick++)
    })

    it('starts a fresh report and reloads the nearby containers', async () => {
      mockTakePicture.mockResolvedValueOnce({uri: 'file:///one.jpg'})
      await renderScreen()
      await fireEvent.press(captureButton())
      await press(containerName('WC-1'))
      await pressState('full')
      mockLoadNearby.mockClear()

      await act(async () => mockRefocus!())

      await waitFor(() => expect(mockLoadNearby).toHaveBeenCalledWith(GPS, 200, {limit: 3}))
      expect(thumbnails()).toHaveLength(0)
      expect(screen.getByText('newSignal.objectType')).toBeOnTheScreen()
      expect(screen.getByText('signals.containerStates.full')).not.toHaveStyle({
        color: colors.surface,
      })
    })

    it('keeps the container picked on the container card', async () => {
      await renderFromContainerCard()
      await pressState('full')

      await act(async () => mockRefocus!())

      expect(screen.getByText('signals.containerStates.full')).toHaveStyle({color: colors.surface})
      expect(mockRouter.setParams).not.toHaveBeenCalled()
      expect(mockLoadNearby).not.toHaveBeenCalled()
    })
  })

  describe('cancel', () => {
    it('goes back', async () => {
      await renderScreen()

      await press('newSignal.cancel')

      await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1))
      expect(screen.queryByTestId('camera')).toBeNull()
    })

    it('replaces the screen with the one it was opened from', async () => {
      await renderFromContainerCard({returnTo: '/(tabs)/maps/waste-containers'})

      await press('newSignal.cancel')

      await waitFor(() =>
        expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/maps/waste-containers')
      )
      expect(mockRouter.back).not.toHaveBeenCalled()
    })
  })

  // Runs last: checks every key the tests above passed to t().
  it('has an English and a Bulgarian text for every key it uses', () => {
    const lookup = (dict: object, key: string) =>
      key.split('.').reduce<any>((node, part) => node?.[part], dict)
    const missing = [...mockUsedKeys].filter(
      (key) => typeof lookup(en, key) !== 'string' || typeof lookup(bg, key) !== 'string'
    )

    expect(mockUsedKeys.size).toBeGreaterThan(40)
    expect(missing).toEqual([])
  })
})
