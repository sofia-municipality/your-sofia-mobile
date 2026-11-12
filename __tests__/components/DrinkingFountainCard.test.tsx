import React from 'react'
import {Alert, AlertButton, Linking} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import {DrinkingFountainCard, getFountainColor} from '../../components/DrinkingFountainCard'
import {createSignal, type DrinkingFountain} from '../../lib/payload'
import {getUniqueReporterId} from '../../lib/deviceId'
import {useContainerSignals} from '../../hooks/useContainerSignals'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  }),
}))

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush}),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 10, left: 0}),
}))

jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: {Images: 'Images'},
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))

jest.mock('../../lib/payload', () => ({
  createSignal: jest.fn(),
}))

jest.mock('../../lib/deviceId', () => ({
  getUniqueReporterId: jest.fn(),
}))

let mockAuth = {token: 'token-abc' as string | null, isAuthenticated: true}

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

jest.mock('../../hooks/useContainerSignals', () => ({
  useContainerSignals: jest.fn(),
}))

const mockCreateSignal = createSignal as jest.Mock
const mockGetReporterId = getUniqueReporterId as jest.Mock
const mockUseContainerSignals = useContainerSignals as jest.Mock
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>

const granted = {status: 'granted'} as ImagePicker.CameraPermissionResponse
const denied = {status: 'denied'} as ImagePicker.CameraPermissionResponse

function pickedAsset(uri: string) {
  return {canceled: false, assets: [{uri}]} as unknown as ImagePicker.ImagePickerResult
}

const fountain: DrinkingFountain = {
  id: 7,
  publicNumber: 'DF-RTR-0001',
  address: 'bul. Vitosha 1',
  latitude: 42.6977123,
  longitude: 23.3219456,
  isActive: true,
  protectionStatus: 'Cultural monument',
  externalLink: 'https://example.com/df-1',
  districtName: 'Triaditsa',
  sourceName: 'City water supply',
  statusName: 'Good condition',
  ownerName: 'Sofia Municipality',
  activationName: 'Push button',
  createdAt: null,
  updatedAt: null,
}

const SIGNALS_LABEL = 'wasteContainers.signalsActive:{"active":2,"count":5}'

function getImages() {
  return screen.container.queryAll((node) => node.type === 'Image')
}

function getSpinners() {
  return screen.container.queryAll((node) => node.type === 'ActivityIndicator')
}

describe('getFountainColor', () => {
  it.each([
    [true, '#0284C7'],
    [false, '#DC2626'],
    [null, '#94A3B8'],
  ])('isActive=%s maps to %s', (isActive, color) => {
    expect(getFountainColor({isActive})).toBe(color)
  })
})

describe('DrinkingFountainCard', () => {
  let alertSpy: jest.SpyInstance
  let openURLSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth = {token: 'token-abc', isAuthenticated: true}
    mockUseContainerSignals.mockReturnValue({total: 5, active: 2, loading: false, error: null})
    mockGetReporterId.mockResolvedValue('device-123')
    mockCreateSignal.mockResolvedValue({id: 'signal-1'})
    picker.requestCameraPermissionsAsync.mockResolvedValue(granted)
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(granted)
    picker.launchCameraAsync.mockResolvedValue(pickedAsset('file:///camera.jpg'))
    picker.launchImageLibraryAsync.mockResolvedValue(pickedAsset('file:///library.jpg'))
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  })

  afterEach(() => {
    alertSpy.mockRestore()
    openURLSpy.mockRestore()
  })

  describe('header', () => {
    it('shows the address as the title', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)

      expect(screen.getByText('bul. Vitosha 1')).toBeOnTheScreen()
    })

    it('falls back to a generic name when there is no address', async () => {
      await render(<DrinkingFountainCard fountain={{...fountain, address: ''}} />)

      expect(screen.getByText('fountains.name')).toBeOnTheScreen()
    })

    it.each([
      [true, 'fountains.working', '#0284C7'],
      [false, 'fountains.notWorking', '#DC2626'],
      [null, 'fountains.statusUnknown', '#94A3B8'],
    ])('isActive=%s shows "%s" with a %s dot', async (isActive, label, color) => {
      await render(<DrinkingFountainCard fountain={{...fountain, isActive}} />)

      const statusText = screen.getByText(label)
      const dot = statusText.parent!.children[0]
      expect(dot).toHaveStyle({backgroundColor: color})
    })

    it('hides the close button without onClose', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)

      expect(screen.queryByRole('button', {name: 'common.close'})).not.toBeOnTheScreen()
    })

    it('calls onClose from the close button', async () => {
      const onClose = jest.fn()
      await render(<DrinkingFountainCard fountain={fountain} onClose={onClose} />)

      await fireEvent.press(screen.getByRole('button', {name: 'common.close'}))

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('signals badge', () => {
    it('loads signal counts for the fountain public number', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)

      expect(mockUseContainerSignals).toHaveBeenCalledWith('DF-RTR-0001')
    })

    it('shows the active and total signal counts', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)

      const badge = screen.getByRole('button', {name: SIGNALS_LABEL})
      expect(badge).toBeEnabled()
      expect(screen.getByText(SIGNALS_LABEL)).toHaveStyle({textDecorationLine: 'underline'})
    })

    it('treats an unknown total as zero and does not underline without active signals', async () => {
      mockUseContainerSignals.mockReturnValue({total: null, active: 0, loading: false, error: null})
      await render(<DrinkingFountainCard fountain={fountain} />)

      const label = 'wasteContainers.signalsActive:{"active":0,"count":0}'
      expect(screen.getByText(label)).not.toHaveStyle({textDecorationLine: 'underline'})
    })

    it('opens the signals tab filtered by this fountain', async () => {
      const onClose = jest.fn()
      await render(<DrinkingFountainCard fountain={fountain} onClose={onClose} />)

      await fireEvent.press(screen.getByRole('button', {name: SIGNALS_LABEL}))

      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(tabs)/signals',
        params: {containerReferenceId: 'DF-RTR-0001'},
      })
    })

    it('shows a spinner and is disabled while loading', async () => {
      mockUseContainerSignals.mockReturnValue({total: null, active: 0, loading: true, error: null})
      await render(<DrinkingFountainCard fountain={fountain} />)

      expect(screen.getByRole('button', {name: /wasteContainers.signalsActive/})).toBeDisabled()
      expect(getSpinners()).toHaveLength(1)
    })

    it('is disabled when loading the counts failed', async () => {
      mockUseContainerSignals.mockReturnValue({total: null, active: 0, loading: false, error: 'x'})
      await render(<DrinkingFountainCard fountain={fountain} />)

      expect(screen.getByRole('button', {name: /wasteContainers.signalsActive/})).toBeDisabled()
      expect(screen.queryByText(/wasteContainers.signalsActive/)).not.toBeOnTheScreen()
    })

    it('is hidden for fountains without a public number', async () => {
      await render(<DrinkingFountainCard fountain={{...fountain, publicNumber: null}} />)

      expect(mockUseContainerSignals).toHaveBeenCalledWith(undefined)
      expect(
        screen.queryByRole('button', {name: /wasteContainers.signalsActive/})
      ).not.toBeOnTheScreen()
    })
  })

  describe('quick info', () => {
    it('always shows condition and water source', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)

      expect(screen.getByText('fountains.condition:')).toBeOnTheScreen()
      expect(screen.getByText('Good condition')).toBeOnTheScreen()
      expect(screen.getByText('fountains.source:')).toBeOnTheScreen()
      expect(screen.getByText('City water supply')).toBeOnTheScreen()
    })

    it('skips rows without data', async () => {
      await render(
        <DrinkingFountainCard fountain={{...fountain, statusName: null, sourceName: null}} />
      )

      expect(screen.queryByText('fountains.condition:')).not.toBeOnTheScreen()
      expect(screen.queryByText('fountains.source:')).not.toBeOnTheScreen()
    })
  })

  describe('full details', () => {
    const toggle = () => screen.getByRole('button', {name: 'wasteContainers.fullDetails'})

    it('is collapsed by default', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)

      expect(toggle()).toBeCollapsed()
      expect(screen.queryByText('fountains.district:')).not.toBeOnTheScreen()
      expect(screen.getByText('bul. Vitosha 1').props.numberOfLines).toBe(2)
    })

    it('expands to show every available detail', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)

      await fireEvent.press(toggle())

      expect(toggle()).toBeExpanded()
      expect(screen.getByText('Push button')).toBeOnTheScreen()
      expect(screen.getByText('Triaditsa')).toBeOnTheScreen()
      expect(screen.getByText('Cultural monument')).toBeOnTheScreen()
      expect(
        screen.getByText(`${(42.6977123).toFixed(6)}, ${(23.3219456).toFixed(6)}`)
      ).toBeOnTheScreen()
      expect(screen.getByText('bul. Vitosha 1').props.numberOfLines).toBeUndefined()
    })

    it('skips missing details but always shows coordinates', async () => {
      await render(
        <DrinkingFountainCard
          fountain={{
            ...fountain,
            activationName: null,
            districtName: null,
            protectionStatus: null,
            externalLink: null,
          }}
        />
      )

      await fireEvent.press(toggle())

      expect(screen.queryByText('fountains.activation:')).not.toBeOnTheScreen()
      expect(screen.queryByText('fountains.district:')).not.toBeOnTheScreen()
      expect(screen.queryByText('fountains.protection:')).not.toBeOnTheScreen()
      expect(screen.getByText('fountains.coordinates:')).toBeOnTheScreen()
      expect(screen.queryByRole('link')).not.toBeOnTheScreen()
    })

    it('opens the external link', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)
      await fireEvent.press(toggle())

      await fireEvent.press(screen.getByRole('link'))

      expect(openURLSpy).toHaveBeenCalledWith('https://example.com/df-1')
    })

    it('collapses again on a second press', async () => {
      await render(<DrinkingFountainCard fountain={fountain} />)

      await fireEvent.press(toggle())
      await fireEvent.press(toggle())

      expect(toggle()).toBeCollapsed()
      expect(screen.queryByText('Triaditsa')).not.toBeOnTheScreen()
    })
  })

  describe('reporting an issue', () => {
    const reportButton = () => screen.getByRole('button', {name: 'fountains.reportIssue'})

    async function openReportForm(
      props: Partial<React.ComponentProps<typeof DrinkingFountainCard>> = {}
    ) {
      await render(<DrinkingFountainCard fountain={fountain} {...props} />)
      await fireEvent.press(reportButton())
    }

    it('sends anonymous users to login and back to the map', async () => {
      mockAuth = {token: null, isAuthenticated: false}
      const onClose = jest.fn()
      await openReportForm({onClose})

      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/auth/login',
        params: {returnTo: '/(tabs)/maps'},
      })
      expect(screen.queryByText('fountains.issueType *')).not.toBeOnTheScreen()
    })

    it('opens the report form for signed-in users', async () => {
      await openReportForm()

      expect(screen.getByText('fountains.issueType *')).toBeOnTheScreen()
      for (const issue of ['notWorking', 'damaged', 'dirty', 'leaking', 'other']) {
        expect(screen.getByText(`fountains.issues.${issue}`)).toBeOnTheScreen()
      }
    })

    it('requires at least one issue before submitting', async () => {
      await openReportForm()

      expect(screen.getByText('newSignal.submit')).toBeDisabled()

      await fireEvent.press(screen.getByText('fountains.issues.dirty'))
      expect(screen.getByText('newSignal.submit')).toBeEnabled()
      expect(screen.getByText('fountains.issues.dirty').parent).toHaveStyle({
        backgroundColor: '#2F54C5',
      })

      await fireEvent.press(screen.getByText('fountains.issues.dirty'))
      expect(screen.getByText('newSignal.submit')).toBeDisabled()
    })

    it('closes the form with the cancel button', async () => {
      await openReportForm()

      await fireEvent.press(screen.getByText('common.cancel'))

      expect(screen.queryByText('fountains.issueType *')).not.toBeOnTheScreen()
    })

    it('closes the form with its close button', async () => {
      await openReportForm()

      await fireEvent.press(screen.getByRole('button', {name: 'common.close'}))

      expect(screen.queryByText('fountains.issueType *')).not.toBeOnTheScreen()
    })

    describe('photo', () => {
      it('attaches a photo from the camera and allows removing it', async () => {
        await openReportForm()

        await fireEvent.press(screen.getByText('wasteContainers.takePhoto'))

        expect(picker.launchCameraAsync).toHaveBeenCalledWith(
          expect.objectContaining({mediaTypes: 'Images', allowsEditing: true, quality: 0.7})
        )
        expect(getImages()[0].props.source).toEqual({uri: 'file:///camera.jpg'})
        expect(screen.queryByText('wasteContainers.takePhoto')).not.toBeOnTheScreen()

        await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.deletePhoto'}))

        expect(getImages()).toHaveLength(0)
        expect(screen.getByText('wasteContainers.takePhoto')).toBeOnTheScreen()
      })

      it('attaches a photo from the library', async () => {
        await openReportForm()

        await fireEvent.press(screen.getByText('wasteContainers.pickFromLibrary'))

        expect(getImages()[0].props.source).toEqual({uri: 'file:///library.jpg'})
      })

      it('alerts when camera permission is denied', async () => {
        picker.requestCameraPermissionsAsync.mockResolvedValueOnce(denied)
        await openReportForm()

        await fireEvent.press(screen.getByText('wasteContainers.takePhoto'))

        expect(alertSpy).toHaveBeenCalledWith(
          'wasteContainers.permissionDenied',
          'wasteContainers.cameraPermissionRequired'
        )
        expect(picker.launchCameraAsync).not.toHaveBeenCalled()
      })

      it('alerts when media library permission is denied', async () => {
        picker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce(
          denied as ImagePicker.MediaLibraryPermissionResponse
        )
        await openReportForm()

        await fireEvent.press(screen.getByText('wasteContainers.pickFromLibrary'))

        expect(alertSpy).toHaveBeenCalledWith(
          'wasteContainers.permissionDenied',
          'wasteContainers.mediaLibraryPermissionRequired'
        )
        expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
      })

      it('keeps the form unchanged when the camera is cancelled', async () => {
        picker.launchCameraAsync.mockResolvedValueOnce({
          canceled: true,
          assets: null,
        } as ImagePicker.ImagePickerResult)
        await openReportForm()

        await fireEvent.press(screen.getByText('wasteContainers.takePhoto'))

        expect(getImages()).toHaveLength(0)
      })
    })

    describe('submitting', () => {
      async function fillAndSubmit() {
        await fireEvent.press(screen.getByText('fountains.issues.notWorking'))
        await fireEvent.press(screen.getByText('fountains.issues.leaking'))
        await fireEvent.changeText(
          screen.getByPlaceholderText('newSignal.descriptionPlaceholder'),
          '  Water everywhere  '
        )
        await fireEvent.press(screen.getByText('newSignal.submit'))
      }

      it('creates a signal linked to the fountain', async () => {
        await openReportForm()
        await fireEvent.press(screen.getByText('wasteContainers.takePhoto'))

        await fillAndSubmit()

        expect(mockCreateSignal).toHaveBeenCalledWith(
          {
            title: 'fountains.name — fountains.issues.notWorking, fountains.issues.leaking',
            description: 'Water everywhere',
            category: 'drinking-fountain',
            cityObject: {
              type: 'drinking-fountain',
              referenceId: 'DF-RTR-0001',
              name: 'DF-RTR-0001',
            },
            fountainState: ['notWorking', 'leaking'],
            location: {latitude: 42.6977123, longitude: 23.3219456, address: 'bul. Vitosha 1'},
            reporterUniqueId: 'device-123',
          },
          [
            {
              uri: 'file:///camera.jpg',
              type: 'image/jpeg',
              name: expect.stringMatching(/^fountain-7-\d+\.jpg$/),
            },
          ],
          'device-123',
          'token-abc'
        )
      })

      it('sends no photos, falls back to the address, and omits a missing token', async () => {
        mockAuth = {token: null, isAuthenticated: true}
        await render(<DrinkingFountainCard fountain={{...fountain, publicNumber: null}} />)
        await fireEvent.press(reportButton())

        await fillAndSubmit()

        const [payload, photos, deviceId, token] = mockCreateSignal.mock.calls[0]
        expect(payload.cityObject).toEqual({
          type: 'drinking-fountain',
          referenceId: undefined,
          name: 'bul. Vitosha 1',
        })
        expect(photos).toBeUndefined()
        expect(deviceId).toBe('device-123')
        expect(token).toBeUndefined()
      })

      it('closes the form and confirms success, then closes the card on OK', async () => {
        const onClose = jest.fn()
        await openReportForm({onClose})

        await fillAndSubmit()

        expect(screen.queryByText('fountains.issueType *')).not.toBeOnTheScreen()
        expect(alertSpy).toHaveBeenCalledWith('signals.success', '', [
          expect.objectContaining({text: 'OK'}),
        ])
        expect(onClose).not.toHaveBeenCalled()

        const [ok] = alertSpy.mock.calls[0][2] as AlertButton[]
        ok.onPress?.()
        expect(onClose).toHaveBeenCalledTimes(1)
      })

      it('resets the form after a successful submit', async () => {
        await openReportForm()
        await fireEvent.press(screen.getByText('wasteContainers.takePhoto'))
        await fillAndSubmit()

        await fireEvent.press(reportButton())

        expect(screen.getByText('newSignal.submit')).toBeDisabled()
        expect(screen.getByPlaceholderText('newSignal.descriptionPlaceholder')).toHaveDisplayValue(
          ''
        )
        expect(getImages()).toHaveLength(0)
      })

      it('shows the error message and keeps the form open on failure', async () => {
        mockCreateSignal.mockRejectedValueOnce(new Error('Network down'))
        await openReportForm()

        await fillAndSubmit()

        expect(alertSpy).toHaveBeenCalledWith('signals.error', 'Network down')
        expect(screen.getByText('fountains.issueType *')).toBeOnTheScreen()
        expect(screen.getByText('newSignal.submit')).toBeEnabled()
      })

      it('shows a generic error for non-Error failures', async () => {
        mockCreateSignal.mockRejectedValueOnce('boom')
        await openReportForm()

        await fillAndSubmit()

        expect(alertSpy).toHaveBeenCalledWith('signals.error', 'newSignal.submitError')
      })

      it('shows a spinner and blocks cancelling while submitting', async () => {
        let resolveSubmit: (value: unknown) => void = () => {}
        mockCreateSignal.mockReturnValueOnce(new Promise((resolve) => (resolveSubmit = resolve)))
        await openReportForm()
        await fireEvent.press(screen.getByText('fountains.issues.dirty'))

        // fireEvent resolves with the handler's promise, so don't await it until
        // the request has been released.
        const submitted = fireEvent.press(screen.getByText('newSignal.submit'))

        await waitFor(() => expect(screen.getByText('common.cancel')).toBeDisabled())
        expect(screen.queryByText('newSignal.submit')).not.toBeOnTheScreen()
        expect(getSpinners()).toHaveLength(1)

        await act(async () => resolveSubmit({id: 'signal-1'}))
        await submitted

        expect(alertSpy).toHaveBeenCalledWith('signals.success', '', expect.any(Array))
      })
    })
  })

  it('logs when the reporter ID cannot be loaded', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockGetReporterId.mockRejectedValueOnce(new Error('secure store unavailable'))

    await render(<DrinkingFountainCard fountain={fountain} />)

    await waitFor(() =>
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get reporter ID:',
        expect.objectContaining({message: 'secure store unavailable'})
      )
    )
    consoleErrorSpy.mockRestore()
  })
})
