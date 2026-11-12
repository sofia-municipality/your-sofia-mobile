import React from 'react'
import {Alert, AlertButton} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import {WasteContainerCard} from '../../components/WasteContainerCard'
import {cleanContainer, updateWasteContainer} from '../../lib/payload'
import {useContainerSignals} from '../../hooks/useContainerSignals'
import type {WasteContainer} from '../../types/wasteContainer'

let mockLanguage = 'en'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
    i18n: {language: mockLanguage},
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
  cleanContainer: jest.fn(),
  updateWasteContainer: jest.fn(),
}))

jest.mock('../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

let mockAuth = {
  isContainerAdmin: false,
  token: 'token-abc' as string | null,
  isAuthenticated: true,
}

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

jest.mock('../../hooks/useContainerSignals', () => ({
  useContainerSignals: jest.fn(),
}))

jest.mock('../../components/BottomSheetBackdrop', () => {
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

const mockFormData = {publicNumber: 'WC-001', wasteType: 'glass'}

jest.mock('../../forms/waste-container', () => {
  const {Pressable, Text, View} = require('react-native')
  return {
    WasteContainerForm: (props: {
      onSubmit: (data: unknown) => void
      onCancel: () => void
      isSubmitting: boolean
    }) => (
      <View testID="waste-container-form" {...props}>
        <Pressable onPress={() => props.onSubmit(mockFormData)}>
          <Text>form-submit</Text>
        </Pressable>
        <Pressable onPress={props.onCancel}>
          <Text>form-cancel</Text>
        </Pressable>
      </View>
    ),
  }
})

const mockCleanContainer = cleanContainer as jest.Mock
const mockUpdateWasteContainer = updateWasteContainer as jest.Mock
const mockUseContainerSignals = useContainerSignals as jest.Mock
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>

const granted = {status: 'granted'} as ImagePicker.CameraPermissionResponse
const denied = {status: 'denied'} as ImagePicker.CameraPermissionResponse

function pickedAsset(uri: string) {
  return {canceled: false, assets: [{uri}]} as unknown as ImagePicker.ImagePickerResult
}

const container: WasteContainer = {
  id: 'c-1',
  publicNumber: 'WC-001',
  location: [23.3219456, 42.6977123],
  latitude: 42.6977123,
  longitude: 23.3219456,
  address: 'ul. Shipka 1',
  capacityVolume: 1.1,
  capacitySize: 'standard',
  binCount: 2,
  servicedBy: 'Sofia Waste Co',
  wasteType: 'general',
  status: 'active',
  state: ['full', 'dirty'],
  lastCleaned: '2026-01-10T12:00:00Z',
  collectionDaysOfWeek: ['1', '4'],
  collectionTimesPerDay: 2,
  signalCount: 3,
  activeSignalCount: 1,
  createdAt: '2025-06-01T12:00:00Z',
  updatedAt: '2026-01-10T12:00:00Z',
}

interface ApiData {
  observations?: object[]
  signals?: object[]
}

function mockApi({observations = [], signals = []}: ApiData = {}) {
  global.fetch = jest.fn((url: string) =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          docs: url.includes('waste-container-observations') ? observations : signals,
        }),
    })
  ) as unknown as typeof fetch
}

function formatDateTime(date: string, locale = 'en-US') {
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** ISO weekday (1 = Monday … 7 = Sunday) `offset` days from today. */
function isoWeekday(offset: number): string {
  const today = new Date().getDay() || 7
  return String(((today - 1 + offset) % 7) + 1)
}

function getImages() {
  return screen.container.queryAll((node) => node.type === 'Image')
}

function getSpinners() {
  return screen.container.queryAll((node) => node.type === 'ActivityIndicator')
}

async function renderCard(props: Partial<React.ComponentProps<typeof WasteContainerCard>> = {}) {
  await render(<WasteContainerCard container={container} {...props} />)
  // Let the recent-photos request settle.
  await waitFor(() => expect(getSpinners()).toHaveLength(0))
}

const originalFetch = global.fetch

describe('WasteContainerCard', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockLanguage = 'en'
    mockAuth = {isContainerAdmin: false, token: 'token-abc', isAuthenticated: true}
    mockApi()
    mockUseContainerSignals.mockReturnValue({total: 3, active: 1, loading: false, error: null})
    mockCleanContainer.mockResolvedValue(undefined)
    mockUpdateWasteContainer.mockResolvedValue(undefined)
    picker.requestCameraPermissionsAsync.mockResolvedValue(granted)
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(granted)
    picker.launchCameraAsync.mockResolvedValue(pickedAsset('file:///camera.jpg'))
    picker.launchImageLibraryAsync.mockResolvedValue(pickedAsset('file:///library.jpg'))
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  describe('header', () => {
    it('shows the container number, type and capacity', async () => {
      await renderCard()

      expect(screen.getByText('wasteContainers.name: WC-001')).toBeOnTheScreen()
      expect(
        screen.getByText('wasteContainers.type.general • wasteContainers.size.standard (1.1m³)')
      ).toBeOnTheScreen()
    })

    it('shows unknown waste types and sizes as-is', async () => {
      await render(
        <WasteContainerCard
          container={{
            ...container,
            wasteType: 'bulky-waste-zones',
            capacitySize: 'huge' as WasteContainer['capacitySize'],
          }}
        />
      )

      expect(screen.getByText('bulky-waste-zones • huge (1.1m³)')).toBeOnTheScreen()
    })

    it.each([
      ['active', '#059669'],
      ['full', '#DC2626'],
      ['maintenance', '#F59E0B'],
      ['inactive', '#475569'],
      ['pending', '#475569'],
    ] as const)('shows status "%s" with a %s dot', async (status, color) => {
      await render(<WasteContainerCard container={{...container, status}} />)

      const statusText = screen.getByText(`wasteContainers.statuses.${status}`)
      expect(statusText.parent!.children[0]).toHaveStyle({backgroundColor: color})
    })

    it('shows the edit button only to container admins', async () => {
      await renderCard()
      expect(screen.queryByRole('button', {name: 'common.edit'})).not.toBeOnTheScreen()

      mockAuth = {...mockAuth, isContainerAdmin: true}
      await renderCard()
      expect(screen.getByRole('button', {name: 'common.edit'})).toBeOnTheScreen()
    })

    it('calls onClose from the close button', async () => {
      const onClose = jest.fn()
      await renderCard({onClose})

      await fireEvent.press(screen.getAllByRole('button', {name: 'common.close'})[0])

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('signals badge', () => {
    const SIGNALS_LABEL = 'wasteContainers.signalsActive:{"active":1,"count":3}'

    it('seeds the signal counts from the container', async () => {
      await renderCard()

      expect(mockUseContainerSignals).toHaveBeenCalledWith('WC-001', {
        initialTotal: 3,
        initialActive: 1,
      })
      expect(screen.getByRole('button', {name: SIGNALS_LABEL})).toBeEnabled()
    })

    it('opens the signals tab filtered by this container', async () => {
      const onClose = jest.fn()
      await renderCard({onClose})

      await fireEvent.press(screen.getByRole('button', {name: SIGNALS_LABEL}))

      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(tabs)/signals',
        params: {containerReferenceId: 'WC-001'},
      })
    })

    it.each([
      ['loading', {loading: true, error: null}],
      ['failed', {loading: false, error: 'x'}],
    ])('is disabled while %s', async (_state, status) => {
      mockUseContainerSignals.mockReturnValue({total: null, active: 0, ...status})
      await render(<WasteContainerCard container={container} />)
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))

      expect(screen.getByRole('button', {name: /wasteContainers.signalsActive/})).toBeDisabled()
    })
  })

  describe('recent photos', () => {
    it('requests recent observations and signals for the container', async () => {
      await renderCard()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test/api/waste-container-observations?where[container][equals]=c-1&depth=2&sort=-cleanedAt&limit=3'
      )
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test/api/signals?where[cityObject.referenceId][equals]=WC-001&depth=2&sort=-createdAt&limit=3'
      )
    })

    it('shows a spinner while loading', async () => {
      global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
      await render(<WasteContainerCard container={container} />)

      expect(getSpinners()).toHaveLength(1)
    })

    it('shows the three newest photos from observations and signals', async () => {
      mockApi({
        observations: [
          {id: 1, photo: {url: '/media/o1.jpg'}, cleanedAt: '2026-01-05T12:00:00Z'},
          {id: 2, photo: null, cleanedAt: '2026-01-06T12:00:00Z'},
          {id: 3, photo: {url: 'https://cdn.test/o3.jpg'}, cleanedAt: '2026-01-01T12:00:00Z'},
        ],
        signals: [
          {
            id: 's1',
            createdAt: '2026-01-07T12:00:00Z',
            images: [{id: 'i1', url: '/media/s1.jpg'}],
          },
          {id: 's2', createdAt: '2026-01-08T12:00:00Z', images: []},
        ],
      })
      await renderCard()

      expect(await screen.findByText('wasteContainers.lastObservations:')).toBeOnTheScreen()
      const photos = screen.getAllByRole('button', {name: /^wasteContainers\.(signal|cleaning): /})
      expect(photos.map((p) => p.props.accessibilityLabel)).toEqual([
        'wasteContainers.signal: January 7, 2026',
        'wasteContainers.cleaning: January 5, 2026',
        'wasteContainers.cleaning: January 1, 2026',
      ])
      expect(getImages().map((img) => img.props.source.uri)).toEqual([
        'https://api.test/media/s1.jpg',
        'https://api.test/media/o1.jpg',
        'https://cdn.test/o3.jpg',
      ])
    })

    it('opens a photo full screen and closes it again', async () => {
      mockApi({
        observations: [{id: 1, photo: {url: '/media/o1.jpg'}, cleanedAt: '2026-01-05T12:00:00Z'}],
      })
      await renderCard()

      await fireEvent.press(
        await screen.findByRole('button', {name: 'wasteContainers.cleaning: January 5, 2026'})
      )

      expect(screen.getByLabelText('wasteContainers.photo').props.source).toEqual({
        uri: 'https://api.test/media/o1.jpg',
      })

      const closeButtons = screen.getAllByRole('button', {name: 'common.close'})
      await fireEvent.press(closeButtons[closeButtons.length - 1])

      expect(screen.queryByLabelText('wasteContainers.photo')).not.toBeOnTheScreen()
    })

    it('falls back to the container image when there are no recent photos', async () => {
      await renderCard()

      await waitFor(() => expect(getSpinners()).toHaveLength(0))
      expect(getImages()).toHaveLength(0)

      await render(
        <WasteContainerCard
          container={{...container, image: {url: 'https://cdn.test/container.jpg'}}}
        />
      )
      await waitFor(() => expect(getImages()).toHaveLength(1))
      expect(getImages()[0].props.source).toEqual({uri: 'https://cdn.test/container.jpg'})
    })

    it('logs and stops loading when the request fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      global.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch
      await render(<WasteContainerCard container={container} />)

      await waitFor(() => expect(getSpinners()).toHaveLength(0))
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching last observation photos:',
        expect.objectContaining({message: 'offline'})
      )
      consoleErrorSpy.mockRestore()
    })
  })

  describe('full details', () => {
    const toggle = () => screen.getByRole('button', {name: 'wasteContainers.fullDetails'})

    it('is collapsed by default', async () => {
      await renderCard()

      expect(toggle()).toBeCollapsed()
      expect(screen.queryByText('wasteContainers.publicNumber:')).not.toBeOnTheScreen()
    })

    it('shows every container detail when expanded', async () => {
      await renderCard()

      await fireEvent.press(toggle())

      expect(toggle()).toBeExpanded()
      expect(screen.getByText('WC-001')).toBeOnTheScreen()
      expect(screen.getByText('wasteContainers.type.general')).toBeOnTheScreen()
      expect(screen.getByText('wasteContainers.size.standard')).toBeOnTheScreen()
      expect(screen.getByText('1.1m³')).toBeOnTheScreen()
      expect(screen.getByText('2')).toBeOnTheScreen()
      expect(
        screen.getByText(`${(42.6977123).toFixed(6)}, ${(23.3219456).toFixed(6)}`)
      ).toBeOnTheScreen()
      expect(screen.getByText('ul. Shipka 1')).toBeOnTheScreen()
      expect(screen.getByText('Sofia Waste Co')).toBeOnTheScreen()
      expect(screen.getByText('• full')).toBeOnTheScreen()
      expect(screen.getByText('• dirty')).toBeOnTheScreen()
      expect(screen.getByText(formatDateTime('2025-06-01T12:00:00Z'))).toBeOnTheScreen()
      expect(screen.getAllByText(formatDateTime('2026-01-10T12:00:00Z'))).toHaveLength(2)
    })

    it('formats dates with the Bulgarian locale when the app is in Bulgarian', async () => {
      mockLanguage = 'bg'
      await renderCard()

      await fireEvent.press(toggle())

      expect(screen.getByText(formatDateTime('2025-06-01T12:00:00Z', 'bg-BG'))).toBeOnTheScreen()
    })

    it('omits optional rows that have no data', async () => {
      await render(
        <WasteContainerCard
          container={{
            ...container,
            address: undefined,
            lastCleaned: undefined,
            state: [],
            collectionDaysOfWeek: [],
          }}
        />
      )

      await fireEvent.press(toggle())

      expect(screen.queryByText('wasteContainers.address:')).not.toBeOnTheScreen()
      expect(screen.queryByText('wasteContainers.lastCleaned:')).not.toBeOnTheScreen()
      expect(screen.queryByText('wasteContainers.containerStates:')).not.toBeOnTheScreen()
      expect(screen.queryByText('wasteContainers.nextCollection:')).not.toBeOnTheScreen()
      expect(screen.queryByText('wasteContainers.collectionFrequencyLabel:')).not.toBeOnTheScreen()
    })

    describe('collection schedule', () => {
      async function expandWithDays(days: string[], timesPerDay?: number) {
        await render(
          <WasteContainerCard
            container={{
              ...container,
              collectionDaysOfWeek: days,
              collectionTimesPerDay: timesPerDay,
            }}
          />
        )
        await fireEvent.press(toggle())
      }

      it('shows "today" when collection is today', async () => {
        await expandWithDays([isoWeekday(0)])
        expect(screen.getByText('wasteContainers.collectionToday')).toBeOnTheScreen()
      })

      it('shows "tomorrow" when collection is tomorrow', async () => {
        await expandWithDays([isoWeekday(1)])
        expect(screen.getByText('wasteContainers.collectionTomorrow')).toBeOnTheScreen()
      })

      it('shows the weekday for later collections', async () => {
        const day = isoWeekday(3)
        await expandWithDays([day])
        expect(screen.getByText(`wasteContainers.collectionDay.${day}`)).toBeOnTheScreen()
      })

      it('picks the nearest upcoming collection day', async () => {
        await expandWithDays([isoWeekday(5), isoWeekday(1), isoWeekday(3)])
        expect(screen.getByText('wasteContainers.collectionTomorrow')).toBeOnTheScreen()
      })

      it('computes the weekly frequency from days and times per day', async () => {
        await expandWithDays(['1', '3', '5'], 2)
        expect(
          screen.getByText('wasteContainers.collectionFrequency:{"count":6}')
        ).toBeOnTheScreen()
      })

      it('assumes one collection per day when unspecified', async () => {
        await expandWithDays(['1', '3', '5'])
        expect(
          screen.getByText('wasteContainers.collectionFrequency:{"count":3}')
        ).toBeOnTheScreen()
      })
    })

    describe('cleaning history', () => {
      async function openHistory(observations: object[]) {
        mockApi({observations})
        await renderCard()
        await fireEvent.press(toggle())
        await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.lastCleaned'}))
      }

      it('shows an empty state when there is no history', async () => {
        await openHistory([])

        expect(screen.getByText('wasteContainers.noHistory')).toBeOnTheScreen()
      })

      it('lists recent cleanings with photo thumbnails or placeholders', async () => {
        await openHistory([
          {id: 1, photo: {url: '/media/o1.jpg'}, cleanedAt: '2026-01-05T12:00:00Z'},
          {id: 2, photo: null, cleanedAt: '2026-01-03T12:00:00Z'},
        ])

        expect(
          screen.getByRole('imagebutton', {name: formatDateTime('2026-01-05T12:00:00Z')})
        ).toBeOnTheScreen()
        expect(screen.getAllByText(formatDateTime('2026-01-03T12:00:00Z'))).toHaveLength(1)
        expect(screen.getAllByRole('imagebutton')).toHaveLength(1)
      })

      it('opens a history photo full screen', async () => {
        await openHistory([
          {id: 1, photo: {url: '/media/o1.jpg'}, cleanedAt: '2026-01-05T12:00:00Z'},
        ])

        await fireEvent.press(
          screen.getByRole('imagebutton', {name: formatDateTime('2026-01-05T12:00:00Z')})
        )

        expect(screen.queryByText('wasteContainers.noHistory')).not.toBeOnTheScreen()
        expect(screen.getByLabelText('wasteContainers.photo').props.source).toEqual({
          uri: 'https://api.test/media/o1.jpg',
        })
      })

      it('closes from the backdrop', async () => {
        await openHistory([])

        await fireEvent.press(screen.getByTestId('backdrop'))

        expect(screen.queryByText('wasteContainers.noHistory')).not.toBeOnTheScreen()
      })
    })
  })

  describe('reporting an issue', () => {
    const reportButton = () => screen.getByRole('button', {name: 'wasteContainers.reportIssue'})

    it('opens a prefilled signal form for signed-in users', async () => {
      const onClose = jest.fn()
      await renderCard({onClose})

      await fireEvent.press(reportButton())

      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(tabs)/new/new-signal',
        params: {
          containerId: 'c-1',
          containerPublicNumber: 'WC-001',
          containerName: 'WC-001',
          containerLocation: JSON.stringify({latitude: 42.6977123, longitude: 23.3219456}),
          prefilledObjectType: 'waste-container',
          returnTo: '/(tabs)/maps/waste-containers',
        },
      })
    })

    it('sends anonymous users to login and then on to the prefilled form', async () => {
      mockAuth = {isContainerAdmin: false, token: null, isAuthenticated: false}
      const onClose = jest.fn()
      await renderCard({onClose})

      await fireEvent.press(reportButton())

      const location = JSON.stringify({latitude: 42.6977123, longitude: 23.3219456})
      expect(onClose).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/auth/login',
        params: {
          returnTo:
            '/(tabs)/new/new-signal?containerId=c-1' +
            '&containerPublicNumber=WC-001' +
            '&containerName=WC-001' +
            `&containerLocation=${encodeURIComponent(location)}` +
            '&prefilledObjectType=waste-container' +
            `&returnTo=${encodeURIComponent('/(tabs)/maps/waste-containers')}`,
        },
      })
    })
  })

  describe('cleaning a container (admins)', () => {
    const cleanButton = () => screen.getByRole('button', {name: 'wasteContainers.cleanContainer'})
    const confirmButton = () => screen.getByRole('button', {name: 'common.confirm'})

    beforeEach(() => {
      mockAuth = {isContainerAdmin: true, token: 'token-abc', isAuthenticated: true}
    })

    async function openCleanForm(
      props: Partial<React.ComponentProps<typeof WasteContainerCard>> = {}
    ) {
      await render(<WasteContainerCard container={{...container, status: 'full'}} {...props} />)
      await fireEvent.press(cleanButton())
    }

    it.each([
      ['a non-active container', {status: 'full' as const}, true],
      ['a never-cleaned container', {lastCleaned: undefined}, true],
      ['an active, cleaned container', {}, false],
    ])('is offered for %s: %s', async (_label, overrides, visible) => {
      await render(<WasteContainerCard container={{...container, ...overrides}} />)

      expect(screen.queryByRole('button', {name: 'wasteContainers.cleanContainer'}) !== null).toBe(
        visible
      )
    })

    it('is not offered to regular users', async () => {
      mockAuth = {isContainerAdmin: false, token: 'token-abc', isAuthenticated: true}
      await render(<WasteContainerCard container={{...container, status: 'full'}} />)

      expect(
        screen.queryByRole('button', {name: 'wasteContainers.cleanContainer'})
      ).not.toBeOnTheScreen()
    })

    it('requires a session token', async () => {
      mockAuth = {isContainerAdmin: true, token: null, isAuthenticated: true}
      await openCleanForm()

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.notAuthenticated')
      expect(screen.queryByText('wasteContainers.cleanDescription')).not.toBeOnTheScreen()
    })

    it('requires a photo before confirming', async () => {
      await openCleanForm()

      expect(screen.getByText('wasteContainers.cleanDescription')).toBeOnTheScreen()
      expect(confirmButton()).toBeDisabled()
    })

    it('takes a photo with the camera', async () => {
      await openCleanForm()

      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.takePhoto'}))

      expect(picker.launchCameraAsync).toHaveBeenCalledWith(
        expect.objectContaining({mediaTypes: 'Images', aspect: [4, 3], quality: 0.7})
      )
      expect(getImages().map((img) => img.props.source)).toContainEqual({
        uri: 'file:///camera.jpg',
      })
      expect(confirmButton()).toBeEnabled()
    })

    it('picks a photo from the library', async () => {
      await openCleanForm()

      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.pickFromLibrary'}))

      expect(getImages().map((img) => img.props.source)).toContainEqual({
        uri: 'file:///library.jpg',
      })
    })

    it('alerts when camera permission is denied', async () => {
      picker.requestCameraPermissionsAsync.mockResolvedValueOnce(denied)
      await openCleanForm()

      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.takePhoto'}))

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
      await openCleanForm()

      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.pickFromLibrary'}))

      expect(alertSpy).toHaveBeenCalledWith(
        'wasteContainers.permissionDenied',
        'wasteContainers.mediaLibraryPermissionRequired'
      )
    })

    it('removes the selected photo', async () => {
      await openCleanForm()
      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.takePhoto'}))

      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.deletePhoto'}))

      expect(confirmButton()).toBeDisabled()
      expect(screen.getByRole('button', {name: 'wasteContainers.takePhoto'})).toBeOnTheScreen()
    })

    it('submits the observation and notifies the parent after confirmation', async () => {
      const onClose = jest.fn()
      const onContainerUpdated = jest.fn()
      await openCleanForm({onClose, onContainerUpdated})
      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.takePhoto'}))
      await fireEvent.changeText(
        screen.getByLabelText('wasteContainers.addNotes'),
        'Emptied and washed'
      )

      await fireEvent.press(confirmButton())

      expect(mockCleanContainer).toHaveBeenCalledWith(
        'c-1',
        'token-abc',
        {
          uri: 'file:///camera.jpg',
          type: 'image/jpeg',
          name: expect.stringMatching(/^observation-c-1-\d+\.jpg$/),
        },
        'Emptied and washed'
      )
      expect(screen.queryByText('wasteContainers.cleanDescription')).not.toBeOnTheScreen()
      expect(alertSpy).toHaveBeenCalledWith('common.success', 'wasteContainers.cleanSuccess', [
        expect.objectContaining({text: 'OK'}),
      ])
      expect(onContainerUpdated).not.toHaveBeenCalled()

      const [ok] = alertSpy.mock.calls[0][2] as AlertButton[]
      ok.onPress?.()
      expect(onContainerUpdated).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('shows the error and keeps the form open when cleaning fails', async () => {
      mockCleanContainer.mockRejectedValueOnce(new Error('Upload failed'))
      await openCleanForm()
      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.takePhoto'}))

      await fireEvent.press(confirmButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Upload failed')
      expect(screen.getByText('wasteContainers.cleanDescription')).toBeOnTheScreen()
      expect(confirmButton()).toBeEnabled()
    })

    it('shows a generic error for non-Error failures', async () => {
      mockCleanContainer.mockRejectedValueOnce('boom')
      await openCleanForm()
      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.takePhoto'}))

      await fireEvent.press(confirmButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'wasteContainers.cleanError')
    })

    it('blocks the form while the request is in flight', async () => {
      let resolveClean: (value: unknown) => void = () => {}
      mockCleanContainer.mockReturnValueOnce(new Promise((resolve) => (resolveClean = resolve)))
      await openCleanForm()
      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.takePhoto'}))

      // fireEvent resolves with the handler's promise; release the request first.
      const submitted = fireEvent.press(confirmButton())

      await waitFor(() => expect(confirmButton()).toBeDisabled())
      expect(screen.getByRole('button', {name: 'common.cancel'})).toBeDisabled()

      await act(async () => resolveClean(undefined))
      await submitted
    })

    it.each([
      ['cancel button', () => screen.getByRole('button', {name: 'common.cancel'})],
      ['backdrop', () => screen.getByTestId('backdrop')],
      [
        'close button',
        () => {
          const buttons = screen.getAllByRole('button', {name: 'common.close'})
          return buttons[buttons.length - 1]
        },
      ],
    ])('discards the photo and notes when closed via the %s', async (_label, getCloser) => {
      await openCleanForm()
      await fireEvent.press(screen.getByRole('button', {name: 'wasteContainers.takePhoto'}))
      await fireEvent.changeText(screen.getByLabelText('wasteContainers.addNotes'), 'Draft')

      await fireEvent.press(getCloser())
      expect(screen.queryByText('wasteContainers.cleanDescription')).not.toBeOnTheScreen()

      await fireEvent.press(cleanButton())
      expect(confirmButton()).toBeDisabled()
      expect(screen.getByLabelText('wasteContainers.addNotes')).toHaveDisplayValue('')
    })
  })

  describe('editing a container (admins)', () => {
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
      mockAuth = {isContainerAdmin: true, token: 'token-abc', isAuthenticated: true}
      // Failed updates are logged by the component.
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    async function openEditForm(
      props: Partial<React.ComponentProps<typeof WasteContainerCard>> = {}
    ) {
      await renderCard(props)
      await fireEvent.press(screen.getByRole('button', {name: 'common.edit'}))
    }

    it('opens the edit form for this container', async () => {
      await openEditForm()

      expect(screen.getByText('common.edit wasteContainers.name')).toBeOnTheScreen()
      const form = screen.getByTestId('waste-container-form')
      expect(form.props.container).toBe(container)
      expect(form.props.isEditing).toBe(true)
      expect(form.props.canEdit).toBe(true)
      expect(form.props.isSubmitting).toBe(false)
    })

    it('saves changes, closes the form and notifies the parent', async () => {
      const onContainerUpdated = jest.fn()
      await openEditForm({onContainerUpdated})

      await fireEvent.press(screen.getByText('form-submit'))

      expect(mockUpdateWasteContainer).toHaveBeenCalledWith('c-1', mockFormData, 'token-abc')
      expect(alertSpy).toHaveBeenCalledWith('common.success', 'newCityObject.updateSuccess')
      expect(onContainerUpdated).toHaveBeenCalledTimes(1)
      expect(screen.queryByTestId('waste-container-form')).not.toBeOnTheScreen()
    })

    it('marks the form as submitting while saving', async () => {
      let resolveUpdate: (value: unknown) => void = () => {}
      mockUpdateWasteContainer.mockReturnValueOnce(
        new Promise((resolve) => (resolveUpdate = resolve))
      )
      await openEditForm()

      const submitted = fireEvent.press(screen.getByText('form-submit'))

      await waitFor(() =>
        expect(screen.getByTestId('waste-container-form').props.isSubmitting).toBe(true)
      )

      await act(async () => resolveUpdate(undefined))
      await submitted
    })

    it('shows an error and keeps the form open when saving fails', async () => {
      const onContainerUpdated = jest.fn()
      mockUpdateWasteContainer.mockRejectedValueOnce(new Error('Validation failed'))
      await openEditForm({onContainerUpdated})

      await fireEvent.press(screen.getByText('form-submit'))

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newCityObject.createError')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update container:',
        expect.objectContaining({message: 'Validation failed'})
      )
      expect(onContainerUpdated).not.toHaveBeenCalled()
      expect(screen.getByTestId('waste-container-form')).toBeOnTheScreen()
      expect(screen.getByTestId('waste-container-form').props.isSubmitting).toBe(false)
    })

    it('refuses to save without a session token', async () => {
      mockAuth = {isContainerAdmin: true, token: null, isAuthenticated: true}
      await openEditForm()

      await fireEvent.press(screen.getByText('form-submit'))

      expect(mockUpdateWasteContainer).not.toHaveBeenCalled()
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'newCityObject.createError')
    })

    it('closes from the form cancel action', async () => {
      await openEditForm()

      await fireEvent.press(screen.getByText('form-cancel'))

      expect(screen.queryByTestId('waste-container-form')).not.toBeOnTheScreen()
    })

    it('closes from the backdrop', async () => {
      await openEditForm()

      await fireEvent.press(screen.getByTestId('backdrop'))

      expect(screen.queryByTestId('waste-container-form')).not.toBeOnTheScreen()
    })
  })
})
