import React from 'react'
import {Alert, AlertButton} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import {PhotoCaptureSlot} from '../../../components/missions/PhotoCaptureSlot'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}))

let mockIsDevice = true

jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice
  },
}))

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {
    Camera: () => <View testID="icon-Camera" />,
    Check: () => <View testID="icon-Check" />,
  }
})

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [4, 3],
  quality: 0.7,
}

function pickedAsset(uri: string) {
  return {canceled: false, assets: [{uri}]} as unknown as ImagePicker.ImagePickerResult
}

const cancelled = {canceled: true, assets: null} as ImagePicker.ImagePickerResult
const granted = {status: 'granted'} as ImagePicker.MediaLibraryPermissionResponse
const denied = {status: 'denied'} as ImagePicker.MediaLibraryPermissionResponse

function getImages() {
  return screen.container.queryAll((node) => node.type === 'Image')
}

function getSpinner() {
  return screen.container.queryAll((node) => node.type === 'ActivityIndicator')[0]
}

describe('PhotoCaptureSlot', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsDevice = true
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(granted)
    picker.requestCameraPermissionsAsync.mockResolvedValue(granted)
    picker.launchImageLibraryAsync.mockResolvedValue(pickedAsset('file:///gallery.jpg'))
    picker.launchCameraAsync.mockResolvedValue(pickedAsset('file:///camera.jpg'))
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  describe('rendering', () => {
    it('shows the label and a camera icon when empty', async () => {
      await render(<PhotoCaptureSlot label="Before" onCapture={jest.fn()} />)

      expect(screen.getByText('Before')).toBeOnTheScreen()
      expect(screen.getByTestId('icon-Camera')).toBeOnTheScreen()
      expect(screen.queryByTestId('icon-Check')).not.toBeOnTheScreen()
      expect(getImages()).toHaveLength(0)
    })

    it('shows a thumbnail and check mark for an existing photo', async () => {
      await render(
        <PhotoCaptureSlot
          label="Before"
          existingPhotoUrl="https://cdn.test/before.jpg"
          onCapture={jest.fn()}
        />
      )

      expect(getImages()[0].props.source).toEqual({uri: 'https://cdn.test/before.jpg'})
      expect(screen.getByTestId('icon-Check')).toBeOnTheScreen()
      expect(screen.queryByTestId('icon-Camera')).not.toBeOnTheScreen()
    })

    it('prefers a freshly captured photo over the existing one', async () => {
      await render(
        <PhotoCaptureSlot
          label="Before"
          existingPhotoUrl="https://cdn.test/before.jpg"
          capturedPhoto={{uri: 'file:///new.jpg', type: 'image/jpeg', name: 'new.jpg'}}
          onCapture={jest.fn()}
        />
      )

      expect(getImages()[0].props.source).toEqual({uri: 'file:///new.jpg'})
    })

    it('shows a spinner and disables the slot while uploading', async () => {
      await render(
        <PhotoCaptureSlot
          label="Before"
          existingPhotoUrl="https://cdn.test/before.jpg"
          uploading
          onCapture={jest.fn()}
        />
      )

      expect(getSpinner()).toBeDefined()
      expect(screen.queryByTestId('icon-Check')).not.toBeOnTheScreen()
      expect(screen.root).toBeDisabled()
    })

    it('is dimmed and does nothing when disabled', async () => {
      await render(<PhotoCaptureSlot label="Before" disabled onCapture={jest.fn()} />)

      expect(screen.root).toBeDisabled()
      expect(screen.root).toHaveStyle({opacity: 0.5})

      await fireEvent.press(screen.getByText('Before'))
      expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled()
      expect(alertSpy).not.toHaveBeenCalled()
    })
  })

  describe('on a simulator', () => {
    beforeEach(() => {
      mockIsDevice = false
    })

    it('goes straight to the gallery and reports the picked photo', async () => {
      const onCapture = jest.fn()
      await render(<PhotoCaptureSlot label="Before" onCapture={onCapture} />)

      await fireEvent.press(screen.getByText('Before'))

      expect(alertSpy).not.toHaveBeenCalled()
      expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(PICKER_OPTIONS)
      expect(onCapture).toHaveBeenCalledWith({
        uri: 'file:///gallery.jpg',
        type: 'image/jpeg',
        name: expect.stringMatching(/^mission-\d+\.jpg$/),
      })
    })

    it('alerts and stops when gallery permission is denied', async () => {
      picker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce(denied)
      const onCapture = jest.fn()
      await render(<PhotoCaptureSlot label="Before" onCapture={onCapture} />)

      await fireEvent.press(screen.getByText('Before'))

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'missions.galleryPermissionRequired')
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
      expect(onCapture).not.toHaveBeenCalled()
    })

    it('does not report anything when picking is cancelled', async () => {
      picker.launchImageLibraryAsync.mockResolvedValueOnce(cancelled)
      const onCapture = jest.fn()
      await render(<PhotoCaptureSlot label="Before" onCapture={onCapture} />)

      await fireEvent.press(screen.getByText('Before'))

      expect(onCapture).not.toHaveBeenCalled()
    })
  })

  describe('on a real device', () => {
    function getSourceOptions(): AlertButton[] {
      return alertSpy.mock.calls[0][2]
    }

    it('asks whether to use the camera or the gallery', async () => {
      await render(<PhotoCaptureSlot label="Before" onCapture={jest.fn()} />)

      await fireEvent.press(screen.getByText('Before'))

      expect(alertSpy).toHaveBeenCalledWith('missions.selectPhotoSource', '', expect.any(Array))
      expect(getSourceOptions().map((o) => o.text)).toEqual([
        'missions.photoSourceCamera',
        'missions.photoSourceGallery',
        'common.cancel',
      ])
      expect(getSourceOptions()[2].style).toBe('cancel')
      expect(picker.launchCameraAsync).not.toHaveBeenCalled()
      expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
    })

    it('captures a photo with the camera', async () => {
      const onCapture = jest.fn()
      await render(<PhotoCaptureSlot label="Before" onCapture={onCapture} />)
      await fireEvent.press(screen.getByText('Before'))

      await act(async () => {
        getSourceOptions()[0].onPress?.()
      })

      await waitFor(() =>
        expect(onCapture).toHaveBeenCalledWith({
          uri: 'file:///camera.jpg',
          type: 'image/jpeg',
          name: expect.stringMatching(/^mission-\d+\.jpg$/),
        })
      )
      expect(picker.launchCameraAsync).toHaveBeenCalledWith(PICKER_OPTIONS)
    })

    it('picks a photo from the gallery', async () => {
      const onCapture = jest.fn()
      await render(<PhotoCaptureSlot label="Before" onCapture={onCapture} />)
      await fireEvent.press(screen.getByText('Before'))

      await act(async () => {
        getSourceOptions()[1].onPress?.()
      })

      await waitFor(() =>
        expect(onCapture).toHaveBeenCalledWith(
          expect.objectContaining({uri: 'file:///gallery.jpg'})
        )
      )
      expect(picker.launchCameraAsync).not.toHaveBeenCalled()
    })

    it('alerts when camera permission is denied', async () => {
      picker.requestCameraPermissionsAsync.mockResolvedValueOnce(
        denied as ImagePicker.CameraPermissionResponse
      )
      const onCapture = jest.fn()
      await render(<PhotoCaptureSlot label="Before" onCapture={onCapture} />)
      await fireEvent.press(screen.getByText('Before'))

      await act(async () => {
        getSourceOptions()[0].onPress?.()
      })

      await waitFor(() =>
        expect(alertSpy).toHaveBeenLastCalledWith(
          'common.error',
          'missions.cameraPermissionRequired'
        )
      )
      expect(picker.launchCameraAsync).not.toHaveBeenCalled()
      expect(onCapture).not.toHaveBeenCalled()
    })

    it('does not report anything when the camera is cancelled', async () => {
      picker.launchCameraAsync.mockResolvedValueOnce(cancelled)
      const onCapture = jest.fn()
      await render(<PhotoCaptureSlot label="Before" onCapture={onCapture} />)
      await fireEvent.press(screen.getByText('Before'))

      await act(async () => {
        getSourceOptions()[0].onPress?.()
      })

      await waitFor(() => expect(picker.launchCameraAsync).toHaveBeenCalled())
      expect(onCapture).not.toHaveBeenCalled()
    })
  })
})
