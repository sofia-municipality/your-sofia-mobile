import React from 'react'
import {Alert, AlertButton} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import SignalDetailsScreen from '../../../../app/(tabs)/signals/[id]'
import {fetchSignalById, updateSignal} from '../../../../lib/payload'
import type {Signal} from '../../../../types/signal'

// react-i18next hands out a stable `t`; the screen relies on that for its effect deps.
const mockTranslation = {t: (key: string) => key}

jest.mock('react-i18next', () => ({
  useTranslation: () => mockTranslation,
}))

let mockParams: {id?: string} = {id: '11'}
let mockHeaderRight: (() => React.ReactNode) | undefined
let mockHeaderListener: (() => void) | undefined
const mockNavigation = {
  setOptions: jest.fn((options: {headerRight?: () => React.ReactNode}) => {
    mockHeaderRight = options.headerRight
    mockHeaderListener?.()
  }),
}

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useNavigation: () => mockNavigation,
}))

jest.mock('react-native-safe-area-context', () => {
  const {View} = require('react-native')
  return {
    SafeAreaView: ({children, ...props}: {children: React.ReactNode}) => (
      <View {...props}>{children}</View>
    ),
  }
})

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  const icons: Record<string, unknown> = {}
  return new Proxy(icons, {
    get: (target, name: string) => {
      if (name === '__esModule') return false
      target[name] ??= (props: object) => <View testID={`icon-${name}`} {...props} />
      return target[name]
    },
  })
})

jest.mock('../../../../lib/payload', () => ({
  fetchSignalById: jest.fn(),
  updateSignal: jest.fn(),
}))

const mockRemoveUpdatedSignalId = jest.fn()

jest.mock('../../../../hooks/useNotifications', () => ({
  useNotifications: () => ({removeUpdatedSignalId: mockRemoveUpdatedSignalId}),
}))

let mockAuth: {
  user: {id: number} | null
  token: string | null
  isInfrastructureAdmin: boolean
  isFountainAdmin: boolean
}

jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

let mockFormValues: Record<string, unknown>

jest.mock('../../../../forms/signal', () => {
  const {forwardRef, useImperativeHandle} = require('react')
  const {View} = require('react-native')
  return {
    styles: {},
    SignalForm: forwardRef(function MockSignalForm(props: object, ref: React.Ref<unknown>) {
      useImperativeHandle(ref, () => ({
        handleSubmit: (onValid: (data: unknown) => unknown) => () => onValid(mockFormValues),
      }))
      return <View testID="signal-form" {...props} />
    }),
  }
})

const mockFetchSignalById = fetchSignalById as jest.Mock
const mockUpdateSignal = updateSignal as jest.Mock

const baseSignal: Signal = {
  id: '11',
  title: 'Overflowing container',
  description: 'Bags on the pavement',
  category: 'waste-container',
  status: 'pending',
  reporter: {id: 7},
  createdAt: '2026-11-10T08:30:00.000Z',
  updatedAt: '2026-11-10T08:30:00.000Z',
}

const fountainSignal: Signal = {
  ...baseSignal,
  id: '12',
  title: 'Broken fountain',
  category: 'drinking-fountain',
}

function HeaderHost() {
  const [, rerender] = React.useReducer((count: number) => count + 1, 0)
  React.useEffect(() => {
    mockHeaderListener = rerender
    return () => {
      mockHeaderListener = undefined
    }
  }, [])
  return <>{mockHeaderRight?.()}</>
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const flush = () => act(() => sleep(0))
const form = () => screen.getByTestId('signal-form')
const spinners = () => screen.container.queryAll((node) => node.type === 'ActivityIndicator')
const headerButton = (icon: string) => screen.getByTestId(`icon-${icon}`).parent!
const resolveButton = () => screen.queryByRole('button', {name: 'signals.markResolved'})

async function renderDetails() {
  // The header host goes first so it is listening before the screen sets its options.
  await render(
    <>
      <HeaderHost />
      <SignalDetailsScreen />
    </>
  )
  await flush()
}

let alertSpy: jest.SpyInstance
let consoleError: jest.SpyInstance

function pressAlertButton(text: string) {
  const buttons = alertSpy.mock.calls.at(-1)[2] as AlertButton[]
  return act(async () => buttons.find((button) => button.text === text)!.onPress!())
}

beforeEach(() => {
  jest.clearAllMocks()
  mockParams = {id: '11'}
  mockHeaderRight = undefined
  mockAuth = {user: {id: 7}, token: 'jwt', isInfrastructureAdmin: false, isFountainAdmin: false}
  mockFetchSignalById.mockResolvedValue(baseSignal)
  mockFormValues = {
    title: '  Overflowing container  ',
    description: '  Still full  ',
    containerState: ['full'],
    photos: [
      {id: 3, uri: 'https://cdn.test/3.jpg', isNew: false},
      {uri: 'https://cdn.test/no-id.jpg', isNew: false},
      {uri: 'file:///new.jpg', isNew: true},
    ],
  }
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  alertSpy.mockRestore()
  consoleError.mockRestore()
})

describe('SignalDetailsScreen', () => {
  describe('loading', () => {
    it('loads the signal from the route id', async () => {
      await renderDetails()

      expect(mockFetchSignalById).toHaveBeenCalledWith('11')
      expect(form().props.signal).toEqual(baseSignal)
    })

    it('shows a spinner meanwhile', async () => {
      mockFetchSignalById.mockReturnValue(new Promise(() => {}))

      await renderDetails()

      expect(spinners()).toHaveLength(1)
      expect(screen.getByText('common.loading')).toBeVisible()
    })

    it('clears the "updated" mark of this signal', async () => {
      await renderDetails()

      expect(mockRemoveUpdatedSignalId).toHaveBeenCalledWith('11')
    })

    it('shows the error and retries', async () => {
      mockFetchSignalById.mockRejectedValueOnce(new Error('Server unavailable'))
      await renderDetails()

      expect(screen.getByText('Server unavailable')).toBeVisible()

      await fireEvent.press(screen.getByText('common.retry'))
      await flush()

      expect(mockFetchSignalById).toHaveBeenCalledTimes(2)
      expect(form()).toBeTruthy()
    })

    it('falls back to a generic message for unknown errors', async () => {
      mockFetchSignalById.mockRejectedValue('boom')

      await renderDetails()

      expect(screen.getByText('signals.error')).toBeVisible()
    })

    it('says when the signal does not exist', async () => {
      mockFetchSignalById.mockResolvedValue(null)

      await renderDetails()

      expect(screen.getByText('signals.notFound')).toBeVisible()
    })
  })

  describe('form', () => {
    it('shows the signal read-only first', async () => {
      await renderDetails()

      expect(form().props).toMatchObject({isEditing: false, isSubmitting: false, canEdit: true})
    })

    it.each([
      ['as an object', {id: 7}],
      ['as an id', 7],
    ])('lets the reporter edit (reporter given %s)', async (_, reporter) => {
      mockFetchSignalById.mockResolvedValue({...baseSignal, reporter})

      await renderDetails()

      expect(form().props.canEdit).toBe(true)
      expect(screen.getByTestId('icon-Edit3')).toBeTruthy()
    })

    it.each([
      ['another user reported it', {...baseSignal, reporter: {id: 8}}, {id: 7}],
      ['nobody is signed in', baseSignal, null],
      ['the reporter is unknown', {...baseSignal, reporter: undefined}, {id: 7}],
    ])('does not offer editing when %s', async (_, signal, user) => {
      mockFetchSignalById.mockResolvedValue(signal)
      mockAuth = {...mockAuth, user}

      await renderDetails()

      expect(form().props.canEdit).toBe(false)
      expect(screen.queryByTestId('icon-Edit3')).toBeNull()
    })
  })

  describe('editing', () => {
    async function startEditing() {
      await renderDetails()
      await fireEvent.press(headerButton('Edit3'))
    }

    it('switches the form to edit mode with save and cancel buttons', async () => {
      await startEditing()

      expect(form().props.isEditing).toBe(true)
      expect(screen.getByTestId('icon-Save')).toBeTruthy()
      expect(screen.getByTestId('icon-X')).toBeTruthy()
      expect(screen.queryByTestId('icon-Edit3')).toBeNull()
    })

    it('cancels editing', async () => {
      await startEditing()

      await fireEvent.press(headerButton('X'))

      expect(form().props.isEditing).toBe(false)
      expect(screen.getByTestId('icon-Edit3')).toBeTruthy()
    })

    it('lets the form cancel editing too', async () => {
      await startEditing()

      await act(async () => form().props.onCancel())

      expect(form().props.isEditing).toBe(false)
    })

    it('saves the trimmed changes, keeping existing photos and uploading new ones', async () => {
      const updated = {...baseSignal, title: 'Overflowing container', description: 'Still full'}
      mockUpdateSignal.mockResolvedValue({doc: updated})
      await startEditing()

      await fireEvent.press(headerButton('Save'))
      await flush()

      expect(mockUpdateSignal).toHaveBeenCalledWith(
        '11',
        {
          title: 'Overflowing container',
          description: 'Still full',
          containerState: ['full'],
          newPhotos: [
            {
              uri: 'file:///new.jpg',
              type: 'image/jpeg',
              name: expect.stringMatching(/^signal-11-\d+\.jpg$/),
            },
          ],
          existingPhotoIds: [3],
        },
        'jwt'
      )
      // toHaveBeenCalledWith ignores undefined array items, so check the ids strictly:
      // an existing photo without an id must be left out, not sent as undefined.
      expect(mockUpdateSignal.mock.calls[0][1].existingPhotoIds).toStrictEqual([3])
      expect(alertSpy).toHaveBeenCalledWith('signals.success', 'signals.updateSuccess')
      expect(form().props).toMatchObject({isEditing: false, signal: updated})
    })

    it('sends empty values for the optional fields', async () => {
      mockFormValues = {title: 'Broken bench'}
      mockUpdateSignal.mockResolvedValue({doc: baseSignal})
      await startEditing()

      await fireEvent.press(headerButton('Save'))
      await flush()

      expect(mockUpdateSignal).toHaveBeenCalledWith(
        '11',
        {
          title: 'Broken bench',
          description: '',
          containerState: [],
          newPhotos: [],
          existingPhotoIds: [],
        },
        'jwt'
      )
    })

    it('shows a spinner and locks the header while saving', async () => {
      let finish: (value: unknown) => void = () => {}
      mockUpdateSignal.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await startEditing()

      await fireEvent.press(headerButton('Save'))

      expect(form().props.isSubmitting).toBe(true)
      expect(screen.queryByTestId('icon-Save')).toBeNull()
      expect(spinners()).toHaveLength(1)
      expect(headerButton('X').props.accessibilityState).toEqual({disabled: true})

      await act(async () => finish({doc: baseSignal}))

      expect(form().props.isSubmitting).toBe(false)
    })

    it('keeps editing and explains a failed save', async () => {
      mockUpdateSignal.mockRejectedValue(new Error('Photo too large'))
      await startEditing()

      await fireEvent.press(headerButton('Save'))
      await flush()

      expect(alertSpy).toHaveBeenCalledWith('signals.error', 'Photo too large')
      expect(form().props).toMatchObject({isEditing: true, isSubmitting: false})
    })

    it('falls back to a generic message when a save fails oddly', async () => {
      mockUpdateSignal.mockRejectedValue('boom')
      await startEditing()

      await fireEvent.press(headerButton('Save'))
      await flush()

      expect(alertSpy).toHaveBeenCalledWith('signals.error', 'signals.updateError')
    })

    it('does nothing without a session', async () => {
      await startEditing()
      mockAuth = {...mockAuth, token: null}
      await screen.rerender(
        <>
          <HeaderHost />
          <SignalDetailsScreen />
        </>
      )

      await fireEvent.press(headerButton('Save'))
      await flush()

      expect(mockUpdateSignal).not.toHaveBeenCalled()
    })

    // BUG: every new photo is named `signal-<id>-<Date.now()>.jpg` inside one synchronous
    // map, so photos added in the same edit almost always get the same file name.
    it.failing('gives each new photo in one update its own file name', async () => {
      // Pins the clock so the test is deterministic; a real map rarely crosses a millisecond.
      jest.spyOn(Date, 'now').mockReturnValue(1_763_300_000_000)
      mockFormValues = {
        title: 'Overflowing container',
        photos: [
          {uri: 'file:///first.jpg', isNew: true},
          {uri: 'file:///second.jpg', isNew: true},
        ],
      }
      mockUpdateSignal.mockResolvedValue({doc: baseSignal})
      await startEditing()

      await fireEvent.press(headerButton('Save'))
      await flush()
      ;(Date.now as jest.Mock).mockRestore()

      const names = mockUpdateSignal.mock.calls[0][1].newPhotos.map(
        (photo: {name: string}) => photo.name
      )
      expect(new Set(names).size).toBe(2)
    })
  })

  describe('resolving a fountain signal', () => {
    beforeEach(() => {
      mockFetchSignalById.mockResolvedValue(fountainSignal)
      mockAuth = {...mockAuth, isFountainAdmin: true}
    })

    it.each([
      ['a fountain admin', {isFountainAdmin: true, isInfrastructureAdmin: false}],
      ['an infrastructure admin', {isFountainAdmin: false, isInfrastructureAdmin: true}],
    ])('is offered to %s', async (_, roles) => {
      mockAuth = {...mockAuth, ...roles}

      await renderDetails()

      expect(resolveButton()).toBeVisible()
    })

    it('also recognises a fountain by its city object', async () => {
      mockFetchSignalById.mockResolvedValue({
        ...baseSignal,
        category: 'other',
        cityObject: {type: 'drinking-fountain'},
      })

      await renderDetails()

      expect(resolveButton()).toBeVisible()
    })

    it.each([
      ['other users', {...fountainSignal}, {isFountainAdmin: false, isInfrastructureAdmin: false}],
      ['container signals', baseSignal, {isFountainAdmin: true, isInfrastructureAdmin: true}],
      ['resolved signals', {...fountainSignal, status: 'resolved'}, {isFountainAdmin: true}],
    ])('is not offered for %s', async (_, signal, roles) => {
      mockFetchSignalById.mockResolvedValue(signal)
      mockAuth = {...mockAuth, ...roles}

      await renderDetails()

      expect(resolveButton()).toBeNull()
    })

    it('is hidden while editing', async () => {
      await renderDetails()

      await fireEvent.press(headerButton('Edit3'))

      expect(resolveButton()).toBeNull()
    })

    it('asks for confirmation first', async () => {
      await renderDetails()

      await fireEvent.press(resolveButton()!)

      expect(alertSpy).toHaveBeenCalledWith(
        'signals.resolveConfirmTitle',
        'signals.resolveConfirmMessage',
        [
          {text: 'common.cancel', style: 'cancel'},
          {text: 'signals.markResolved', onPress: expect.any(Function)},
        ]
      )
      expect(mockUpdateSignal).not.toHaveBeenCalled()
    })

    it('marks the signal resolved', async () => {
      mockUpdateSignal.mockResolvedValue({doc: {...fountainSignal, status: 'resolved'}})
      await renderDetails()

      await fireEvent.press(resolveButton()!)
      await pressAlertButton('signals.markResolved')

      expect(mockUpdateSignal).toHaveBeenCalledWith('12', {status: 'resolved'}, 'jwt')
      expect(alertSpy).toHaveBeenLastCalledWith('signals.success', 'signals.resolveSuccess')
      expect(form().props.signal.status).toBe('resolved')
      expect(resolveButton()).toBeNull()
    })

    it('assumes the change went through when the server returns no document', async () => {
      mockUpdateSignal.mockResolvedValue({})
      await renderDetails()

      await fireEvent.press(resolveButton()!)
      await pressAlertButton('signals.markResolved')

      expect(form().props.signal).toEqual({...fountainSignal, status: 'resolved'})
    })

    it('shows a spinner and blocks a second press meanwhile', async () => {
      let finish: (value: unknown) => void = () => {}
      mockUpdateSignal.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await renderDetails()

      await fireEvent.press(resolveButton()!)
      // Not wrapped in act, so the in-flight state can render before the request settles.
      const buttons = alertSpy.mock.calls.at(-1)[2] as AlertButton[]
      const resolving = buttons.find((button) => button.text === 'signals.markResolved')!.onPress!()

      await waitFor(() => expect(resolveButton()).toBeDisabled())
      expect(spinners()).toHaveLength(1)

      await act(async () => finish({doc: {...fountainSignal, status: 'resolved'}}))
      await act(async () => resolving)
      expect(resolveButton()).toBeNull()
    })

    it('explains a failure and keeps the button', async () => {
      mockUpdateSignal.mockRejectedValue(new Error('Forbidden'))
      await renderDetails()

      await fireEvent.press(resolveButton()!)
      await pressAlertButton('signals.markResolved')

      expect(alertSpy).toHaveBeenLastCalledWith('signals.error', 'Forbidden')
      expect(resolveButton()).toBeEnabled()
    })

    it('falls back to a generic message when resolving fails oddly', async () => {
      mockUpdateSignal.mockRejectedValue('boom')
      await renderDetails()

      await fireEvent.press(resolveButton()!)
      await pressAlertButton('signals.markResolved')

      expect(alertSpy).toHaveBeenLastCalledWith('signals.error', 'signals.updateError')
    })
  })
})
