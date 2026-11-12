import type {RefObject} from 'react'
import {Alert, AlertButton, type ScrollViewInstance} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import type {CameraView} from 'expo-camera'
import {act, renderHook} from '@testing-library/react-native'
import {useSignalForm} from '../../hooks/useSignalForm'

const mockRouter = {setParams: jest.fn(), push: jest.fn(), back: jest.fn()}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-camera', () => ({CameraView: function CameraView() {}}))

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>

type Props = Parameters<typeof useSignalForm>[0]

const mapObject = {id: 'WC-1', name: 'Container #WC-1', type: 'waste-container', distance: 5}

function makeCamera(takePictureAsync: jest.Mock) {
  return {current: {takePictureAsync}} as unknown as RefObject<CameraView | null>
}

function galleryResult(asset: Partial<ImagePicker.ImagePickerAsset>) {
  return {
    canceled: false,
    assets: [{uri: 'file:///gallery.jpg', ...asset}],
  } as ImagePicker.ImagePickerResult
}

describe('useSignalForm', () => {
  let props: Props
  let alertSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance
  const scrollTo = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    props = {
      prefilledMapObject: null,
      prefilledObjectType: null,
      scrollViewRef: {current: {scrollTo} as unknown as ScrollViewInstance},
      setCurrentLocation: jest.fn(),
      setCurrentDateTime: jest.fn(),
      setNearbyObjects: jest.fn(),
    }
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    } as ImagePicker.MediaLibraryPermissionResponse)
    picker.launchImageLibraryAsync.mockResolvedValue(galleryResult({}))
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    alertSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  async function renderForm(overrides: Partial<Props> = {}) {
    return renderHook(() => useSignalForm({...props, ...overrides}))
  }

  describe('initial state', () => {
    it('starts empty with waste containers as the default object type', async () => {
      const {result} = await renderForm()

      expect(result.current).toMatchObject({
        photos: [],
        selectedObjectType: 'waste-container',
        selectedStates: [],
        description: '',
        loading: false,
      })
    })

    it('uses the prefilled object type', async () => {
      const {result} = await renderForm({prefilledObjectType: 'drinking-fountain'})

      expect(result.current.selectedObjectType).toBe('drinking-fountain')
    })
  })

  describe('taking photos', () => {
    it('does nothing without a camera', async () => {
      const {result} = await renderForm()

      await act(() => result.current.takePhoto({current: null}))

      expect(result.current.photos).toEqual([])
    })

    it('adds the captured photo', async () => {
      const takePictureAsync = jest.fn().mockResolvedValue({uri: 'file:///shot.jpg'})
      const {result} = await renderForm()

      await act(() => result.current.takePhoto(makeCamera(takePictureAsync)))

      expect(takePictureAsync).toHaveBeenCalledWith({quality: 0.8})
      expect(result.current.photos).toEqual([{uri: 'file:///shot.jpg', id: expect.any(String)}])
    })

    it('ignores an empty capture', async () => {
      const {result} = await renderForm()

      await act(() => result.current.takePhoto(makeCamera(jest.fn().mockResolvedValue(undefined))))

      expect(result.current.photos).toEqual([])
    })

    it('alerts when the camera fails', async () => {
      const {result} = await renderForm()

      await act(() =>
        result.current.takePhoto(makeCamera(jest.fn().mockRejectedValue(new Error('busy'))))
      )

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.photoError')
    })

    it('removes a photo by id', async () => {
      const now = jest.spyOn(Date, 'now')
      const takePictureAsync = jest
        .fn()
        .mockResolvedValueOnce({uri: 'file:///1.jpg'})
        .mockResolvedValueOnce({uri: 'file:///2.jpg'})
      const {result} = await renderForm()
      now.mockReturnValueOnce(1000)
      await act(() => result.current.takePhoto(makeCamera(takePictureAsync)))
      now.mockReturnValueOnce(2000)
      await act(() => result.current.takePhoto(makeCamera(takePictureAsync)))
      now.mockRestore()

      await act(async () => result.current.removePhoto('1000'))

      expect(result.current.photos).toEqual([{uri: 'file:///2.jpg', id: '2000'}])
    })
  })

  describe('picking from the gallery', () => {
    it('alerts and stops when gallery permission is denied', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({
        granted: false,
      } as ImagePicker.MediaLibraryPermissionResponse)
      const {result} = await renderForm()

      await act(() => result.current.pickImageFromGallery())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.galleryPermissionRequired')
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
    })

    it('adds the picked image, requesting its EXIF metadata', async () => {
      const {result} = await renderForm()

      await act(() => result.current.pickImageFromGallery())

      expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        exif: true,
      })
      expect(result.current.photos).toEqual([{uri: 'file:///gallery.jpg', id: expect.any(String)}])
      expect(props.setCurrentLocation).not.toHaveBeenCalled()
    })

    it('ignores a cancelled pick', async () => {
      picker.launchImageLibraryAsync.mockResolvedValueOnce({
        canceled: true,
        assets: null,
      } as ImagePicker.ImagePickerResult)
      const {result} = await renderForm()

      await act(() => result.current.pickImageFromGallery())

      expect(result.current.photos).toEqual([])
    })

    it('uses the GPS position from the EXIF data', async () => {
      picker.launchImageLibraryAsync.mockResolvedValueOnce(
        galleryResult({
          exif: {
            GPSLatitude: [42, 41, 51.72],
            GPSLatitudeRef: 'N',
            GPSLongitude: [23, 19, 18.84],
            GPSLongitudeRef: 'E',
          },
        })
      )
      const {result} = await renderForm()

      await act(() => result.current.pickImageFromGallery())

      const [location] = (props.setCurrentLocation as jest.Mock).mock.calls[0]
      expect(location.latitude).toBeCloseTo(42.6977, 4)
      expect(location.longitude).toBeCloseTo(23.3219, 4)
      expect(alertSpy).toHaveBeenCalledWith(
        'newSignal.metadataFound',
        'newSignal.metadataLocationUpdated'
      )
    })

    it.each([
      [
        'DateTimeOriginal',
        {DateTimeOriginal: '2026:01:05 14:30:00', DateTime: '2020:01:01 00:00:00'},
      ],
      ['DateTime as a fallback', {DateTime: '2026:01:05 14:30:00'}],
    ])('uses the capture time from %s', async (_label, exif) => {
      picker.launchImageLibraryAsync.mockResolvedValueOnce(galleryResult({exif}))
      const {result} = await renderForm()

      await act(() => result.current.pickImageFromGallery())

      expect(props.setCurrentDateTime).toHaveBeenCalledWith(new Date(2026, 0, 5, 14, 30, 0))
      expect(alertSpy).toHaveBeenCalledWith(
        'newSignal.metadataFound',
        'newSignal.metadataDateTimeUpdated'
      )
    })

    it('ignores unparseable EXIF metadata', async () => {
      picker.launchImageLibraryAsync.mockResolvedValueOnce(
        galleryResult({
          exif: {GPSLatitude: [42, 41], GPSLongitude: [23, 19], DateTime: 'yesterday'},
        })
      )
      const {result} = await renderForm()

      await act(() => result.current.pickImageFromGallery())

      expect(props.setCurrentLocation).not.toHaveBeenCalled()
      expect(props.setCurrentDateTime).not.toHaveBeenCalled()
      expect(alertSpy).not.toHaveBeenCalled()
      expect(result.current.photos).toHaveLength(1)
    })

    it('alerts when the gallery fails', async () => {
      picker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('gallery crashed'))
      const {result} = await renderForm()

      await act(() => result.current.pickImageFromGallery())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.photoError')
    })
  })

  describe('form fields', () => {
    it('toggles container states on and off', async () => {
      const {result} = await renderForm()

      await act(async () => result.current.toggleState('full'))
      await act(async () => result.current.toggleState('dirty'))
      expect(result.current.selectedStates).toEqual(['full', 'dirty'])

      await act(async () => result.current.toggleState('full'))
      expect(result.current.selectedStates).toEqual(['dirty'])
    })

    it('exposes setters for description, object type and loading', async () => {
      const {result} = await renderForm()

      await act(async () => {
        result.current.setDescription('Overflowing')
        result.current.setSelectedObjectType('drinking-fountain')
        result.current.setLoading(true)
      })

      expect(result.current).toMatchObject({
        description: 'Overflowing',
        selectedObjectType: 'drinking-fountain',
        loading: true,
      })
    })
  })

  describe('resetFormState', () => {
    it('clears the form, the route params and scrolls to the top', async () => {
      const takePictureAsync = jest.fn().mockResolvedValue({uri: 'file:///shot.jpg'})
      const {result} = await renderForm()
      await act(() => result.current.takePhoto(makeCamera(takePictureAsync)))
      await act(async () => {
        result.current.toggleState('full')
        result.current.setDescription('Overflowing')
      })

      await act(async () => result.current.resetFormState())

      expect(result.current).toMatchObject({
        photos: [],
        selectedObjectType: null,
        selectedStates: [],
        description: '',
      })
      expect(props.setNearbyObjects).toHaveBeenCalledWith([])
      expect(props.setCurrentLocation).toHaveBeenCalledWith(null)
      expect(mockRouter.setParams).toHaveBeenCalledWith({
        containerPublicNumber: undefined,
        containerName: undefined,
        containerLocation: undefined,
        prefilledObjectType: undefined,
      })
      expect(scrollTo).toHaveBeenCalledWith({y: 0, animated: true})
    })
  })

  describe('handleCancel', () => {
    it('leaves immediately when nothing was entered', async () => {
      const {result} = await renderForm()

      await act(async () => result.current.handleCancel(null))

      expect(alertSpy).not.toHaveBeenCalled()
      expect(mockRouter.back).toHaveBeenCalled()
      expect(props.setCurrentLocation).toHaveBeenCalledWith(null)
    })

    it('returns to the given route instead of going back', async () => {
      const {result} = await renderForm()

      await act(async () => result.current.handleCancel(null, '/(tabs)/maps/waste-containers'))

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/maps/waste-containers')
      expect(mockRouter.back).not.toHaveBeenCalled()
    })

    it('treats a whitespace-only description as empty', async () => {
      const {result} = await renderForm()
      await act(async () => result.current.setDescription('   '))

      await act(async () => result.current.handleCancel(null))

      expect(alertSpy).not.toHaveBeenCalled()
    })

    it.each([
      [
        'a description',
        async (r: {current: ReturnType<typeof useSignalForm>}) =>
          act(async () => r.current.setDescription('Overflowing')),
        null,
      ],
      [
        'a photo',
        async (r: {current: ReturnType<typeof useSignalForm>}) =>
          act(() => r.current.takePhoto(makeCamera(jest.fn().mockResolvedValue({uri: 'f'})))),
        null,
      ],
      ['a selected object', async () => {}, mapObject],
    ])('asks for confirmation when the form has %s', async (_label, fill, selected) => {
      const {result} = await renderForm()
      await fill(result)

      await act(async () => result.current.handleCancel(selected))

      expect(alertSpy).toHaveBeenCalledWith('common.confirm', 'newSignal.cancelConfirm', [
        {text: 'common.no', style: 'cancel'},
        expect.objectContaining({text: 'common.yes'}),
      ])
      expect(mockRouter.back).not.toHaveBeenCalled()
    })

    it('discards the form and leaves once confirmed', async () => {
      const {result} = await renderForm()
      await act(async () => result.current.setDescription('Overflowing'))
      await act(async () => result.current.handleCancel(null, '/(tabs)/home'))

      const [, yes] = alertSpy.mock.calls[0][2] as AlertButton[]
      await act(async () => yes.onPress?.())

      expect(result.current.description).toBe('')
      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/home')
    })

    it('goes back once confirmed without a return route', async () => {
      const {result} = await renderForm()
      await act(async () => result.current.setDescription('Overflowing'))
      await act(async () => result.current.handleCancel(null))

      const [, yes] = alertSpy.mock.calls[0][2] as AlertButton[]
      await act(async () => yes.onPress?.())

      expect(mockRouter.back).toHaveBeenCalled()
    })
  })
})
