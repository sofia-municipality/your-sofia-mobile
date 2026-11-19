import React from 'react'
import {Alert, StyleSheet} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import NewCityObjectScreen from '../../../../app/(tabs)/new/new-city-object'
import {
  createDrinkingFountain,
  createWasteContainer,
  fetchCityDistricts,
  fetchFountainSources,
  fetchFountainStatuses,
  fetchWasteContainerById,
  updateWasteContainer,
} from '../../../../lib/payload'
import {useAuth} from '../../../../contexts/AuthContext'
import en from '../../../../translations/en'
import bg from '../../../../translations/bg'

const mockRouter = {back: jest.fn(), push: jest.fn()}
let mockParams: Record<string, string> = {}
let mockRefocus: (() => void) | undefined

const mockUsedKeys = new Set<string>()

jest.mock('expo-router', () => {
  const {useEffect} = require('react')
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
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
  MediaTypeOptions: {Images: 'Images'},
}))

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const {ScrollView} = require('react-native')
  return {KeyboardAwareScrollView: ScrollView}
})

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  const icons: Record<string, unknown> = {}
  return new Proxy(
    {__esModule: true},
    {
      get(target: Record<string, unknown>, name: string) {
        if (name in target) return target[name]
        icons[name] ??= () => <View testID={`icon-${name}`} />
        return icons[name]
      },
    }
  )
})

jest.mock('../../../../components/FullScreenPhotoViewer', () => {
  const {Text} = require('react-native')
  return {
    FullScreenPhotoViewer: ({visible, photoUri}: any) =>
      visible ? <Text>viewer:{photoUri}</Text> : null,
  }
})

jest.mock('../../../../lib/payload', () => ({
  createWasteContainer: jest.fn(),
  createDrinkingFountain: jest.fn(),
  updateWasteContainer: jest.fn(),
  fetchWasteContainerById: jest.fn(),
  fetchCityDistricts: jest.fn(),
  fetchFountainSources: jest.fn(),
  fetchFountainStatuses: jest.fn(),
}))

jest.mock('../../../../contexts/AuthContext', () => ({useAuth: jest.fn()}))

const mockUseAuth = useAuth as jest.Mock
const mockCreateContainer = createWasteContainer as jest.Mock
const mockUpdateContainer = updateWasteContainer as jest.Mock
const mockFetchContainer = fetchWasteContainerById as jest.Mock
const mockCreateFountain = createDrinkingFountain as jest.Mock
const location = Location as jest.Mocked<typeof Location>
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>

const GPS = {latitude: 42.65, longitude: 23.38}

const CONTAINER_ADMIN = {isContainerAdmin: true, token: 'jwt'}
const INFRA_ADMIN = {isContainerAdmin: true, isInfrastructureAdmin: true, token: 'jwt'}
const FOUNTAIN_ADMIN = {isFountainAdmin: true, token: 'jwt'}

const existingContainer = {
  id: 'c1',
  publicNumber: 'WC-42',
  wasteType: 'glass',
  capacityVolume: 2,
  capacitySize: 'big',
  binCount: 3,
  latitude: 42.71,
  longitude: 23.31,
  address: 'ul. Shipka 1',
  notes: 'Behind the school',
}

let alertSpy: jest.SpyInstance

type Auth = {
  isContainerAdmin?: boolean
  isInfrastructureAdmin?: boolean
  isFountainAdmin?: boolean
  token?: string | null
}

async function renderScreen(auth: Auth = CONTAINER_ADMIN) {
  mockUseAuth.mockReturnValue({
    isContainerAdmin: false,
    isInfrastructureAdmin: false,
    isFountainAdmin: false,
    token: null,
    ...auth,
  })
  await render(<NewCityObjectScreen />)
}

/** Waits until the GPS position is shown over the camera. */
async function renderWithLocation(auth?: Auth) {
  await renderScreen(auth)
  await screen.findByText('42.650000, 23.380000')
}

/** The fountain form has no camera overlay; wait for the GPS to reach its latitude field. */
async function renderFountainAdmin() {
  await renderScreen(FOUNTAIN_ADMIN)
  await screen.findByDisplayValue('42.65')
}

async function renderEditing(auth: Auth = CONTAINER_ADMIN) {
  mockParams = {containerId: 'c1'}
  await renderScreen(auth)
  await waitFor(() => expect(screen.queryByText('common.loading')).toBeNull())
}

const press = (text: string) => fireEvent.press(screen.getByText(text))

async function enterPublicNumber(value: string) {
  await fireEvent.changeText(
    screen.getByPlaceholderText('newCityObject.publicNumberPlaceholder'),
    value
  )
}

function captureButton() {
  const [inner] = screen.container.queryAll(
    (node) =>
      node.type === 'View' &&
      StyleSheet.flatten(node.props.style)?.width === 60 &&
      StyleSheet.flatten(node.props.style)?.borderRadius === 30
  )
  return inner
}

const thumbnails = () => screen.container.queryAll((node) => node.type === 'Image')

function lastAlertButtons() {
  const calls = alertSpy.mock.calls
  return calls[calls.length - 1][2] as {text: string; onPress?: () => void}[]
}

describe('NewCityObjectScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockParams = {}
    mockPermission = {granted: true}
    location.requestForegroundPermissionsAsync.mockResolvedValue({status: 'granted'} as any)
    location.getCurrentPositionAsync.mockResolvedValue({coords: GPS} as any)
    mockCreateContainer.mockResolvedValue({id: 'new'})
    mockUpdateContainer.mockResolvedValue({id: 'c1'})
    mockCreateFountain.mockResolvedValue({id: 'f1'})
    mockFetchContainer.mockResolvedValue(existingContainer)
    ;(fetchCityDistricts as jest.Mock).mockResolvedValue([])
    ;(fetchFountainSources as jest.Mock).mockResolvedValue([])
    ;(fetchFountainStatuses as jest.Mock).mockResolvedValue([])
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const realNow = Date.now
    let tick = 0
    jest.spyOn(Date, 'now').mockImplementation(() => realNow() + tick++)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('camera permission', () => {
    it('waits while the camera permission is still unknown', async () => {
      mockPermission = null
      await renderScreen()

      expect(screen.getByText('newSignal.loading')).toBeOnTheScreen()
      expect(screen.queryByText('newCityObject.create')).toBeNull()
    })

    it('asks for camera access before adding a container', async () => {
      mockPermission = {granted: false}
      await renderScreen()

      expect(screen.getByText('newSignal.cameraPermissionRequired')).toBeOnTheScreen()
      expect(screen.queryByText('newCityObject.create')).toBeNull()

      await press('newSignal.allowAccess')

      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    })

    it('lets an admin switch to a fountain, which needs no camera', async () => {
      mockPermission = {granted: false}
      await renderScreen(INFRA_ADMIN)

      await press('newSignal.objectTypes.drinkingFountain')

      expect(screen.queryByText('newSignal.cameraPermissionRequired')).toBeNull()
      expect(screen.getByText('fountains.working')).toBeOnTheScreen()
    })

    // BUG: the camera permission gate (new-city-object.tsx:384) also applies when editing, even
    // though editing never shows the camera (line 413). An admin who denied camera access cannot
    // edit any container.
    it.failing('lets an admin edit a container without granting camera access', async () => {
      mockPermission = {granted: false}
      await renderEditing()

      expect(screen.getByText('newCityObject.update')).toBeOnTheScreen()
    })
  })

  describe('location', () => {
    it('shows the GPS position over the camera', async () => {
      await renderWithLocation()

      expect(location.getCurrentPositionAsync).toHaveBeenCalledWith({accuracy: 3})
    })

    it('falls back to the centre of Sofia when location access is denied', async () => {
      location.requestForegroundPermissionsAsync.mockResolvedValue({status: 'denied'} as any)
      await renderScreen()

      expect(await screen.findByText('42.697700, 23.321900')).toBeOnTheScreen()
      expect(location.getCurrentPositionAsync).not.toHaveBeenCalled()
    })

    it('falls back to the centre of Sofia when the GPS fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      location.getCurrentPositionAsync.mockRejectedValue(new Error('GPS off'))
      await renderScreen()

      expect(await screen.findByText('42.697700, 23.321900')).toBeOnTheScreen()
    })
  })

  describe('creating a waste container', () => {
    it('creates the container with the entered details', async () => {
      await renderWithLocation()
      await enterPublicNumber('WC-9')
      await press('wasteContainers.type.glass')

      await press('newCityObject.create')

      expect(mockCreateContainer).toHaveBeenCalledWith(
        expect.objectContaining({publicNumber: 'WC-9', wasteType: 'glass'}),
        'jwt',
        undefined
      )
      expect(alertSpy).toHaveBeenCalledWith(
        'common.success',
        'newCityObject.createSuccess',
        expect.any(Array)
      )
    })

    // BUG: the screen reads the GPS position (new-city-object.tsx:141-166) but never passes it to
    // WasteContainerForm (line 483), whose coordinates default to the centre of Sofia. Unless the
    // admin types the coordinates by hand, every new container is placed at 42.6977, 23.3219.
    // DrinkingFountainForm gets `initialLocation` and does follow the GPS.
    it.failing("creates the container at the admin's current GPS position", async () => {
      await renderWithLocation()
      await enterPublicNumber('WC-9')

      await press('newCityObject.create')

      expect(mockCreateContainer.mock.calls[0][0].location).toMatchObject(GPS)
    })

    it('goes back once the admin confirms the success message', async () => {
      await renderWithLocation()
      await enterPublicNumber('WC-9')
      await press('newCityObject.create')

      await act(async () => lastAlertButtons()[0].onPress!())

      await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1))
    })

    it('does not submit without a public number', async () => {
      await renderWithLocation()

      await press('newCityObject.create')

      expect(screen.getByText('newCityObject.publicNumberRequired')).toBeOnTheScreen()
      expect(mockCreateContainer).not.toHaveBeenCalled()
    })

    it('uploads the photo taken with the camera', async () => {
      mockTakePicture.mockResolvedValueOnce({uri: 'file:///container.jpg'})
      await renderWithLocation()
      await fireEvent.press(captureButton())
      await enterPublicNumber('WC-9')

      await press('newCityObject.create')

      expect(mockTakePicture).toHaveBeenCalledWith({quality: 0.8, exif: true})
      expect(mockCreateContainer.mock.calls[0][2]).toEqual({
        uri: 'file:///container.jpg',
        type: 'image/jpeg',
        name: expect.stringMatching(/^container-WC-9-\d+\.jpg$/),
      })
    })

    it('shows the server message when creating fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateContainer.mockRejectedValue(new Error('Public number taken'))
      await renderWithLocation()
      await enterPublicNumber('WC-9')

      await press('newCityObject.create')

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Public number taken')
      expect(screen.getByText('newCityObject.create')).toBeEnabled()
    })

    it('refuses to submit without a session token', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      await renderWithLocation({isContainerAdmin: true, token: null})
      await enterPublicNumber('WC-9')

      await press('newCityObject.create')

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Authentication required')
      expect(mockCreateContainer).not.toHaveBeenCalled()
    })

    it('disables the form while the container is being created', async () => {
      let finish!: (value: unknown) => void
      mockCreateContainer.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await renderWithLocation()
      await enterPublicNumber('WC-9')

      const submitted = press('newCityObject.create')

      await waitFor(() => expect(screen.getByText('newCityObject.submitting')).toBeDisabled())
      expect(screen.getByText('common.cancel')).toBeDisabled()

      await act(async () => finish({id: 'new'}))
      await submitted

      expect(screen.getByText('newCityObject.create')).toBeEnabled()
    })

    it('goes back when the admin cancels', async () => {
      await renderWithLocation()

      await press('common.cancel')

      await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1))
      expect(screen.queryByTestId('camera')).toBeNull()
    })
  })

  describe('photos', () => {
    it('adds, shows and removes photos', async () => {
      mockTakePicture
        .mockResolvedValueOnce({uri: 'file:///one.jpg'})
        .mockResolvedValueOnce({uri: 'file:///two.jpg'})
      await renderWithLocation()

      await fireEvent.press(captureButton())
      await fireEvent.press(captureButton())
      expect(thumbnails().map((image) => image.props.source.uri)).toEqual([
        'file:///one.jpg',
        'file:///two.jpg',
      ])

      await fireEvent.press(thumbnails()[1])
      expect(screen.getByText('viewer:file:///two.jpg')).toBeOnTheScreen()

      await fireEvent.press(screen.getAllByTestId('icon-X')[0])
      expect(thumbnails().map((image) => image.props.source.uri)).toEqual(['file:///two.jpg'])
    })

    it('drops the photos when the tab is opened again', async () => {
      mockTakePicture.mockResolvedValueOnce({uri: 'file:///one.jpg'})
      await renderWithLocation()
      await fireEvent.press(captureButton())
      expect(thumbnails()).toHaveLength(1)

      await act(async () => mockRefocus!())

      expect(thumbnails()).toHaveLength(0)
    })

    it('adds a photo from the gallery', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({status: 'granted'} as any)
      picker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{uri: 'file:///gallery.jpg'}],
      } as any)
      await renderWithLocation()

      await fireEvent.press(screen.getByTestId('icon-Upload'))

      expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 0.8,
        exif: true,
      })
      expect(thumbnails().map((image) => image.props.source.uri)).toEqual(['file:///gallery.jpg'])
    })

    it('adds nothing when the gallery is closed without a choice', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({status: 'granted'} as any)
      picker.launchImageLibraryAsync.mockResolvedValue({canceled: true, assets: null} as any)
      await renderWithLocation()

      await fireEvent.press(screen.getByTestId('icon-Upload'))

      expect(thumbnails()).toHaveLength(0)
    })

    it('explains that gallery access is needed when it was denied', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({status: 'denied'} as any)
      await renderWithLocation()

      await fireEvent.press(screen.getByTestId('icon-Upload'))

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.galleryPermissionRequired')
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
    })

    it('tells the admin when the camera fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      mockTakePicture.mockRejectedValueOnce(new Error('camera busy'))
      await renderWithLocation()

      await fireEvent.press(captureButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.photoError')
    })
  })

  describe('roles', () => {
    it('shows a citizen the container details read-only, without a create button', async () => {
      await renderWithLocation({token: 'jwt'})

      expect(screen.queryByPlaceholderText('newCityObject.publicNumberPlaceholder')).toBeNull()
      expect(screen.queryByText('newCityObject.create')).toBeNull()
      expect(screen.queryByText('newCityObject.objectType')).toBeNull()
    })

    it('does not offer fountains to a container-only admin', async () => {
      await renderWithLocation(CONTAINER_ADMIN)

      expect(screen.queryByText('newSignal.objectTypes.drinkingFountain')).toBeNull()
    })

    it('lets an infrastructure admin choose between a container and a fountain', async () => {
      await renderWithLocation(INFRA_ADMIN)

      expect(screen.getByText('newCityObject.objectType')).toBeOnTheScreen()
      expect(
        screen.getByRole('button', {name: 'newSignal.objectTypes.wasteContainer'})
      ).toBeSelected()
      expect(
        screen.getByRole('button', {name: 'newSignal.objectTypes.drinkingFountain'})
      ).not.toBeSelected()
    })

    it('starts a fountain-only admin on the fountain form', async () => {
      await renderFountainAdmin()

      expect(
        screen.getByRole('button', {name: 'newSignal.objectTypes.drinkingFountain'})
      ).toBeSelected()
      expect(screen.getByText('fountains.working')).toBeOnTheScreen()
      expect(screen.queryByTestId('camera')).toBeNull()
    })

    it('blocks a container submission from an admin who is not a container admin', async () => {
      // A fountain admin can still switch the form to a container.
      await renderFountainAdmin()
      await press('newSignal.objectTypes.wasteContainer')

      expect(screen.queryByText('newCityObject.create')).toBeNull()
    })
  })

  describe('creating a drinking fountain', () => {
    it('creates the fountain at the GPS position', async () => {
      await renderWithLocation(INFRA_ADMIN)
      await press('newSignal.objectTypes.drinkingFountain')
      await fireEvent.changeText(
        screen.getByPlaceholderText('newCityObject.addressPlaceholder'),
        'bul. Vitosha 1'
      )

      await press('newCityObject.create')

      expect(mockCreateFountain).toHaveBeenCalledWith(
        expect.objectContaining({address: 'bul. Vitosha 1', isActive: true, location: GPS}),
        'jwt'
      )
      expect(alertSpy).toHaveBeenCalledWith(
        'common.success',
        'newCityObject.createSuccess',
        expect.any(Array)
      )

      await act(async () => lastAlertButtons()[0].onPress!())
      await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1))
    })

    it('shows the server message when creating the fountain fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateFountain.mockRejectedValue(new Error('Duplicate fountain'))
      await renderFountainAdmin()
      await fireEvent.changeText(
        screen.getByPlaceholderText('newCityObject.addressPlaceholder'),
        'bul. Vitosha 1'
      )

      await press('newCityObject.create')

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Duplicate fountain')
    })

    it('falls back to the container form when the fountain role is lost', async () => {
      await renderWithLocation(INFRA_ADMIN)
      await press('newSignal.objectTypes.drinkingFountain')
      expect(screen.getByText('fountains.working')).toBeOnTheScreen()

      mockUseAuth.mockReturnValue({...CONTAINER_ADMIN, isInfrastructureAdmin: false})
      await screen.rerender(<NewCityObjectScreen />)

      expect(screen.queryByText('fountains.working')).toBeNull()
      expect(screen.getByPlaceholderText('newCityObject.publicNumberPlaceholder')).toBeOnTheScreen()
    })
  })

  describe('editing a container', () => {
    it('shows a spinner while the container loads', async () => {
      mockFetchContainer.mockReturnValue(new Promise(() => {}))
      mockParams = {containerId: 'c1'}
      await renderScreen()

      expect(screen.getByText('common.loading')).toBeOnTheScreen()
      expect(mockFetchContainer).toHaveBeenCalledWith('c1')
    })

    it('prefills the form and shows the container position', async () => {
      await renderEditing()

      expect(
        screen.getByPlaceholderText('newCityObject.publicNumberPlaceholder')
      ).toHaveDisplayValue('WC-42')
      expect(screen.getByText('42.710000, 23.310000')).toBeOnTheScreen()
      expect(screen.getByText('newCityObject.update')).toBeOnTheScreen()
    })

    it('does not show the camera or read the GPS', async () => {
      await renderEditing()

      expect(screen.queryByTestId('camera')).toBeNull()
      expect(captureButton()).toBeUndefined()
      expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
    })

    it('saves the changes and goes back', async () => {
      await renderEditing()
      await enterPublicNumber('WC-43')

      await press('newCityObject.update')

      expect(mockUpdateContainer).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({publicNumber: 'WC-43', wasteType: 'glass'}),
        'jwt',
        undefined
      )
      expect(mockCreateContainer).not.toHaveBeenCalled()
      expect(alertSpy).toHaveBeenCalledWith(
        'common.success',
        'newCityObject.updateSuccess',
        expect.any(Array)
      )

      await act(async () => lastAlertButtons()[0].onPress!())
      await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1))
    })

    it('goes back when the container cannot be loaded', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      mockFetchContainer.mockRejectedValue(new Error('Not found'))
      mockParams = {containerId: 'c1'}
      await renderScreen()

      await waitFor(() =>
        expect(alertSpy).toHaveBeenCalledWith(
          'common.error',
          'newCityObject.loadError',
          expect.any(Array)
        )
      )
      lastAlertButtons()[0].onPress!()

      expect(mockRouter.back).toHaveBeenCalledTimes(1)
    })

    it('sends a non-admin back', async () => {
      await renderEditing({token: 'jwt'})

      expect(alertSpy).toHaveBeenCalledWith(
        'common.error',
        'newCityObject.adminOnly',
        expect.any(Array)
      )
      lastAlertButtons()[0].onPress!()

      expect(mockRouter.back).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('newCityObject.update')).toBeNull()
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
