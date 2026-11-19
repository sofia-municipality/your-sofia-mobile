import React from 'react'
import {Alert} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'
import BulkPhotoUploadScreen from '../../../../app/(tabs)/new/bulk-photo-upload'
import {
  closeSignalsWithPhotos,
  createObjectsFromPhotos,
  createSignalsFromPhotos,
} from '../../../../lib/bulkPhotoUtils'
import {getUniqueReporterId} from '../../../../lib/deviceId'
import {useAuth} from '../../../../contexts/AuthContext'
import en from '../../../../translations/en'
import bg from '../../../../translations/bg'

const mockBack = jest.fn()

const mockUsedKeys = new Set<string>()

jest.mock('expo-router', () => ({
  useRouter: () => ({back: mockBack}),
}))

jest.mock('react-i18next', () => {
  const t = (key: string, opts?: object) => {
    mockUsedKeys.add(key)
    return opts ? `${key}:${JSON.stringify(opts)}` : key
  }
  return {useTranslation: () => ({t, i18n: {language: 'bg'}})}
})

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {Images: 'Images'},
}))

// Keep the real photo grouping; only the network-bound steps are mocked.
jest.mock('../../../../lib/bulkPhotoUtils', () => ({
  ...jest.requireActual('../../../../lib/bulkPhotoUtils'),
  createSignalsFromPhotos: jest.fn(),
  closeSignalsWithPhotos: jest.fn(),
  createObjectsFromPhotos: jest.fn(),
}))

jest.mock('../../../../lib/deviceId', () => ({getUniqueReporterId: jest.fn()}))
jest.mock('../../../../contexts/AuthContext', () => ({useAuth: jest.fn()}))

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>
const mockCreateSignals = createSignalsFromPhotos as jest.Mock
const mockCloseSignals = closeSignalsWithPhotos as jest.Mock
const mockCreateObjects = createObjectsFromPhotos as jest.Mock
const mockUseAuth = useAuth as jest.Mock

const exif = (latitude: number, longitude: number, time = '10:20:30') => ({
  GPSLatitude: latitude,
  GPSLongitude: longitude,
  GPSDateStamp: '2026:05:01',
  GPSTimeStamp: time,
})

// Two photos ~5 m apart, one ~1 km away, and one without location data.
const NEAR_A = {uri: 'file:///a.jpg', exif: exif(42.69, 23.32, '10:20:30')}
const NEAR_B = {uri: 'file:///b.jpg', exif: exif(42.69004, 23.32, '10:19:00')}
const FAR = {uri: 'file:///far.jpg', exif: exif(42.7, 23.33)}
const NO_GPS = {uri: 'file:///no-gps.jpg', exif: {}}

let alertSpy: jest.SpyInstance

async function renderScreen(auth: {user?: object | null; token?: string | null} = {}) {
  mockUseAuth.mockReturnValue({user: {id: 1}, token: 'jwt', ...auth})
  await render(<BulkPhotoUploadScreen />)
}

async function selectPhotos(assets: object[]) {
  picker.launchImageLibraryAsync.mockResolvedValueOnce({canceled: false, assets} as any)
  await fireEvent.press(screen.getByText('bulkPhotoUpload.selectPhotos'))
}

const press = (text: string) => fireEvent.press(screen.getByText(text))
const process = () => press('bulkPhotoUpload.process')
const lookup = (dict: object, key: string) =>
  key.split('.').reduce<any>((node, part) => node?.[part], dict)

const thumbnails = () => screen.container.queryAll((node) => node.type === 'Image')

function lastAlert() {
  const calls = alertSpy.mock.calls
  return calls[calls.length - 1] as [string, string, {text: string; onPress?: () => void}[]?]
}

describe('BulkPhotoUploadScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({status: 'granted'} as any)
    ;(getUniqueReporterId as jest.Mock).mockResolvedValue('device-1')
    mockCreateSignals.mockResolvedValue({created: 2, failed: 0})
    mockCloseSignals.mockResolvedValue({closedSignals: 2, cleanedContainers: 1, failed: 0})
    mockCreateObjects.mockResolvedValue({createdObjects: 2, closedSignals: 1, failed: 0})
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('selecting photos', () => {
    it('explains that gallery access is needed when it was denied', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({status: 'denied'} as any)
      await renderScreen()

      await press('bulkPhotoUpload.selectPhotos')

      expect(alertSpy).toHaveBeenCalledWith(
        'common.permissionDenied',
        'bulkPhotoUpload.mediaLibraryPermissionRequired'
      )
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
    })

    // BUG: bulk-photo-upload.tsx:45 titles this alert with t('common.permissionDenied'), a key that
    // exists in neither translation (the text lives at wasteContainers.permissionDenied), so the
    // user sees the raw key "common.permissionDenied" as the alert title.
    it.failing('titles the denied-gallery alert with a translated text', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValue({status: 'denied'} as any)
      await renderScreen()

      await press('bulkPhotoUpload.selectPhotos')

      const [title] = lastAlert()
      expect(lookup(en, title)).toEqual(expect.any(String))
      expect(lookup(bg, title)).toEqual(expect.any(String))
    })

    it('lets the user pick several photos with their EXIF data', async () => {
      await renderScreen()

      await selectPhotos([NEAR_A, NEAR_B, NO_GPS])

      expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: 'Images',
        allowsMultipleSelection: true,
        quality: 0.8,
        exif: true,
      })
      expect(thumbnails().map((image) => image.props.source.uri)).toEqual([
        'file:///a.jpg',
        'file:///b.jpg',
        'file:///no-gps.jpg',
      ])
    })

    it('counts the photos and warns about the ones without location or time', async () => {
      await renderScreen()

      await selectPhotos([NEAR_A, NEAR_B, NO_GPS])

      expect(screen.getByText('bulkPhotoUpload.photosSelected:{"count":3}')).toBeOnTheScreen()
      expect(screen.getByText('bulkPhotoUpload.validPhotos:{"count":2}')).toBeOnTheScreen()
      expect(screen.getByText('bulkPhotoUpload.missingMetadataWarning')).toBeOnTheScreen()
    })

    it('does not warn when every photo has location and time', async () => {
      await renderScreen()

      await selectPhotos([NEAR_A, FAR])

      expect(screen.queryByText('bulkPhotoUpload.missingMetadataWarning')).toBeNull()
    })

    it('treats a photo with coordinates but no GPS time as unusable', async () => {
      await renderScreen()

      await selectPhotos([{uri: 'file:///x.jpg', exif: {GPSLatitude: 42.69, GPSLongitude: 23.32}}])

      expect(screen.getByText('bulkPhotoUpload.validPhotos:{"count":0}')).toBeOnTheScreen()
    })

    it('adds to the photos picked before', async () => {
      await renderScreen()

      await selectPhotos([NEAR_A])
      await selectPhotos([FAR])

      expect(screen.getByText('bulkPhotoUpload.photosSelected:{"count":2}')).toBeOnTheScreen()
      expect(thumbnails()).toHaveLength(2)
    })

    it('keeps the selection when the picker is cancelled', async () => {
      await renderScreen()
      await selectPhotos([NEAR_A])

      picker.launchImageLibraryAsync.mockResolvedValueOnce({canceled: true, assets: null} as any)
      await press('bulkPhotoUpload.selectPhotos')

      expect(thumbnails()).toHaveLength(1)
    })

    it('removes a photo', async () => {
      await renderScreen()
      await selectPhotos([NEAR_A, NEAR_B, NO_GPS])

      await fireEvent.press(screen.getAllByText('×')[2])

      expect(thumbnails().map((image) => image.props.source.uri)).toEqual([
        'file:///a.jpg',
        'file:///b.jpg',
      ])
      expect(screen.queryByText('bulkPhotoUpload.missingMetadataWarning')).toBeNull()
    })

    it('tells the user when the gallery fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      picker.launchImageLibraryAsync.mockRejectedValue(new Error('gallery crashed'))
      await renderScreen()

      await press('bulkPhotoUpload.selectPhotos')

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'bulkPhotoUpload.selectError')
      expect(screen.getByText('bulkPhotoUpload.selectPhotos')).toBeEnabled()
    })

    it('shows that the gallery is opening', async () => {
      picker.launchImageLibraryAsync.mockReturnValue(new Promise(() => {}))
      await renderScreen()

      void press('bulkPhotoUpload.selectPhotos')

      await waitFor(() => expect(screen.getByText('common.loading')).toBeDisabled())
    })
  })

  describe('processing', () => {
    it('cannot start without photos', async () => {
      await renderScreen()

      expect(screen.getByText('bulkPhotoUpload.process')).toBeDisabled()
    })

    it('refuses photos that all lack location or time', async () => {
      await renderScreen()
      await selectPhotos([NO_GPS])

      await process()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'bulkPhotoUpload.noValidPhotos')
      expect(mockCreateSignals).not.toHaveBeenCalled()
      expect(screen.getByText('bulkPhotoUpload.process')).toBeEnabled()
    })

    it('creates one signal per group of photos taken within 10 m', async () => {
      await renderScreen()
      await selectPhotos([NEAR_A, NEAR_B, FAR, NO_GPS])

      await process()

      expect(mockCreateSignals).toHaveBeenCalledWith(
        [
          {
            centerLocation: {latitude: expect.closeTo(42.69002, 8), longitude: 23.32},
            photos: [
              expect.objectContaining({uri: 'file:///a.jpg'}),
              expect.objectContaining({uri: 'file:///b.jpg'}),
            ],
            timestamp: new Date('2026-05-01T10:19:00Z'),
          },
          {
            centerLocation: {latitude: 42.7, longitude: 23.33},
            photos: [expect.objectContaining({uri: 'file:///far.jpg'})],
            timestamp: new Date('2026-05-01T10:20:30Z'),
          },
        ],
        'device-1',
        expect.any(Function)
      )
    })

    it('reports how many signals were created and clears the photos on OK', async () => {
      await renderScreen()
      await selectPhotos([NEAR_A, FAR])

      await process()

      const [title, message, buttons] = lastAlert()
      expect(title).toBe('common.success')
      expect(message).toBe(
        'bulkPhotoUpload.createSignalsSuccess:{"created":2,"failed":0,"total":2}'
      )

      await act(async () => buttons![0].onPress!())

      expect(mockBack).toHaveBeenCalledTimes(1)
      expect(thumbnails()).toHaveLength(0)
    })

    it('lets anyone create signals, even without a session', async () => {
      await renderScreen({user: null, token: null})
      await selectPhotos([NEAR_A])

      await process()

      expect(mockCreateSignals).toHaveBeenCalledTimes(1)
    })

    it('keeps the photos and reports the failures when some groups fail', async () => {
      mockCreateSignals.mockResolvedValue({created: 1, failed: 1})
      await renderScreen()
      await selectPhotos([NEAR_A, FAR])

      await process()

      expect(alertSpy).toHaveBeenCalledWith(
        'common.error',
        'bulkPhotoUpload.processError\nbulkPhotoUpload.createSignalsSuccess:{"created":1,"failed":1,"total":2}'
      )
      expect(thumbnails()).toHaveLength(2)
      expect(mockBack).not.toHaveBeenCalled()
    })

    it('shows the error message when processing throws', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      mockCreateSignals.mockRejectedValue(new Error('Server down'))
      await renderScreen()
      await selectPhotos([NEAR_A])

      await process()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Server down')
      expect(screen.getByText('bulkPhotoUpload.process')).toBeEnabled()
    })

    it('shows the progress and blocks a second run', async () => {
      let finish!: (value: unknown) => void
      mockCreateSignals.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await renderScreen()
      await selectPhotos([NEAR_A, FAR])

      const processed = process()

      await waitFor(() => expect(mockCreateSignals).toHaveBeenCalled())
      expect(screen.getByText('0/2')).toBeDisabled()
      expect(screen.getByText('common.cancel')).toBeDisabled()

      const onProgress = mockCreateSignals.mock.calls[0][2]
      await act(async () => onProgress(1, 2))
      expect(screen.getByText('1/2')).toBeOnTheScreen()

      await act(async () => finish({created: 2, failed: 0}))
      await processed

      expect(screen.getByText('bulkPhotoUpload.process')).toBeOnTheScreen()
    })
  })

  describe('closing signals', () => {
    it('requires a signed-in user', async () => {
      await renderScreen({user: null, token: null})
      await press('bulkPhotoUpload.closeSignals')
      await selectPhotos([NEAR_A])

      await process()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'bulkPhotoUpload.authRequired')
      expect(mockCloseSignals).not.toHaveBeenCalled()
    })

    it('closes the signals near each group and reports the result', async () => {
      await renderScreen()
      await press('bulkPhotoUpload.closeSignals')
      await selectPhotos([NEAR_A, FAR])

      await process()

      expect(mockCloseSignals).toHaveBeenCalledWith(
        [expect.anything(), expect.anything()],
        'jwt',
        expect.any(Function)
      )
      expect(mockCreateSignals).not.toHaveBeenCalled()
      expect(lastAlert()[1]).toBe(
        'bulkPhotoUpload.closeSignalsSuccess:{"closedSignals":2,"cleanedContainers":1,"failed":0,"total":2}'
      )
    })
  })

  describe('creating objects', () => {
    it('requires a session token', async () => {
      await renderScreen({token: null})
      await press('bulkPhotoUpload.createObjects')
      await selectPhotos([NEAR_A])

      await process()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'bulkPhotoUpload.authRequired')
      expect(mockCreateObjects).not.toHaveBeenCalled()
    })

    it('creates the objects and reports the result', async () => {
      await renderScreen()
      await press('bulkPhotoUpload.createObjects')
      await selectPhotos([NEAR_A, FAR])

      await process()

      expect(mockCreateObjects).toHaveBeenCalledWith(
        [expect.anything(), expect.anything()],
        'jwt',
        'device-1',
        expect.any(Function)
      )
      expect(lastAlert()[1]).toBe(
        'bulkPhotoUpload.createObjectsSuccess:{"createdObjects":2,"closedSignals":1,"failed":0,"total":2}'
      )
    })
  })

  describe('cancel', () => {
    it('goes back straight away without photos', async () => {
      await renderScreen()

      await press('common.cancel')

      expect(alertSpy).not.toHaveBeenCalled()
      expect(mockBack).toHaveBeenCalledTimes(1)
    })

    it('asks before dropping the picked photos', async () => {
      await renderScreen()
      await selectPhotos([NEAR_A])

      await press('common.cancel')

      const [title, message, buttons] = lastAlert()
      expect([title, message]).toEqual(['common.confirm', 'bulkPhotoUpload.cancelConfirm'])
      expect(mockBack).not.toHaveBeenCalled()

      buttons![1].onPress!()
      expect(mockBack).toHaveBeenCalledTimes(1)
    })
  })

  // Runs last: checks every key the tests above passed to t().
  it('has an English and a Bulgarian text for every key it uses', () => {
    const knownMissing = ['common.permissionDenied'] // see the BUG test above
    const missing = [...mockUsedKeys].filter(
      (key) =>
        !knownMissing.includes(key) &&
        (typeof lookup(en, key) !== 'string' || typeof lookup(bg, key) !== 'string')
    )

    expect(mockUsedKeys.size).toBeGreaterThan(20)
    expect(missing).toEqual([])
  })
})
