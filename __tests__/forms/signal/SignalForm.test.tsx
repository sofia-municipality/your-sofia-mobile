import React, {createRef} from 'react'
import {Alert} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import {SignalForm} from '../../../forms/signal'
import type {SignalFormData} from '../../../forms/signal'
import {createMission} from '../../../lib/payload'
import type {Signal} from '../../../types/signal'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key, i18n: {language: 'en'}}),
}))

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))

jest.mock('../../../lib/payload', () => ({
  createMission: jest.fn(),
}))

let mockAuth = {isAdmin: false, token: 'token-abc' as string | null}

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

const mockMissionData = {
  title: '  Clean up  ',
  description: '   ',
  level: 'verified-contributor',
  status: 'open',
  pointsReward: 15,
  generalInstructions: ' Bring gloves ',
  tasks: [
    {
      title: ' Collect ',
      instructions: ' All litter ',
      acceptanceCriteria: ' Nothing left ',
      requiresBeforePhoto: true,
      requiresAfterPhoto: false,
    },
  ],
}

// MissionForm has its own tests; a stub keeps the focus on how SignalForm drives the modal.
jest.mock('../../../forms/mission', () => {
  const {Pressable, Text, View} = require('react-native')
  return {
    MissionCreateModal: (props: {
      visible: boolean
      onSubmit: (data: unknown) => Promise<void>
      onClose: () => void
    }) =>
      props.visible ? (
        <View testID="mission-modal" {...props}>
          <Pressable onPress={() => props.onSubmit(mockMissionData)}>
            <Text>mission-submit</Text>
          </Pressable>
          <Pressable onPress={props.onClose}>
            <Text>mission-close</Text>
          </Pressable>
        </View>
      ) : null,
  }
})

const mockCreateMission = createMission as jest.Mock
const picker = ImagePicker as jest.Mocked<typeof ImagePicker>

const granted = {granted: true} as ImagePicker.CameraPermissionResponse
const denied = {granted: false} as ImagePicker.CameraPermissionResponse

function assets(...uris: string[]) {
  return {
    canceled: false,
    assets: uris.map((uri) => ({uri})),
  } as unknown as ImagePicker.ImagePickerResult
}

const signal: Signal = {
  id: 's-1',
  title: 'Overflowing container',
  description: 'Bags on the pavement',
  category: 'waste-container',
  cityObject: {type: 'waste-container', referenceId: 'WC-001', name: 'WC-001'},
  containerState: ['full'],
  location: {latitude: 42.69, longitude: 23.32, address: 'ul. Shipka 1'},
  images: [
    {id: 11, url: 'https://cdn.test/1.jpg'},
    {id: 12, url: 'https://cdn.test/2.jpg'},
  ],
  status: 'pending',
  adminNotes: 'Crew dispatched',
  createdAt: '2026-01-05T10:30:00Z',
  updatedAt: '2026-01-05T10:30:00Z',
}

type FormRef = {handleSubmit: (cb: (data: SignalFormData) => void) => () => Promise<void>}
type Props = Partial<React.ComponentProps<typeof SignalForm>>

async function renderForm(props: Props = {}) {
  const ref = createRef<FormRef>()
  await render(
    <SignalForm ref={ref} signal={signal} onSubmit={jest.fn()} onCancel={jest.fn()} {...props} />
  )
  /** Submits through the imperative handle, like the signal screen does. */
  const submit = async () => {
    const onValid = jest.fn()
    await act(async () => {
      await ref.current!.handleSubmit(onValid)()
    })
    return onValid
  }
  return {submit}
}

function imageUris() {
  return screen.container
    .queryAll((node) => node.type === 'Image')
    .map((node) => node.props.source.uri)
}

describe('SignalForm', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth = {isAdmin: false, token: 'token-abc'}
    mockCreateMission.mockResolvedValue({id: 'm-1'})
    picker.requestCameraPermissionsAsync.mockResolvedValue(granted)
    picker.requestMediaLibraryPermissionsAsync.mockResolvedValue(
      granted as ImagePicker.MediaLibraryPermissionResponse
    )
    picker.launchCameraAsync.mockResolvedValue(assets('file:///camera.jpg'))
    picker.launchImageLibraryAsync.mockResolvedValue(assets('file:///g1.jpg', 'file:///g2.jpg'))
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  describe('header', () => {
    it.each([
      ['pending', '#F59E0B'],
      ['in-progress', '#5078F0'],
      ['resolved', '#059669'],
      ['rejected', '#DC2626'],
    ] as const)('shows the "%s" status in %s', async (status, color) => {
      await renderForm({signal: {...signal, status}})

      const label = screen.getAllByText(`signals.status.${status}`)[0]
      expect(label).toHaveStyle({color})
      expect(label.parent).toHaveStyle({backgroundColor: `${color}20`})
    })

    it('shows the creation date in the current language', async () => {
      await renderForm()

      const expected = new Date(signal.createdAt).toLocaleDateString('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      expect(screen.getByText(expected)).toBeOnTheScreen()
    })

    it('shows the city object and location address', async () => {
      await renderForm()

      expect(screen.getAllByText('WC-001').length).toBeGreaterThan(0)
      expect(screen.getByText('ul. Shipka 1')).toBeOnTheScreen()
    })

    it('omits the city object and address when missing', async () => {
      await renderForm({signal: {...signal, cityObject: undefined, location: undefined}})

      expect(screen.queryByText('WC-001')).not.toBeOnTheScreen()
      expect(screen.queryByText('ul. Shipka 1')).not.toBeOnTheScreen()
    })

    it('offers mission creation to admins only', async () => {
      await renderForm()
      expect(
        screen.queryByRole('button', {name: 'missions.form.createMission'})
      ).not.toBeOnTheScreen()

      mockAuth = {isAdmin: true, token: 'token-abc'}
      await renderForm()
      expect(screen.getByRole('button', {name: 'missions.form.createMission'})).toBeOnTheScreen()
    })
  })

  describe('read-only view', () => {
    it('shows the signal details as text', async () => {
      await renderForm({isEditing: false})

      expect(screen.getByText('Overflowing container')).toBeOnTheScreen()
      expect(screen.getByText('Bags on the pavement')).toBeOnTheScreen()
      expect(screen.getByText('Crew dispatched')).toBeOnTheScreen()
      expect(screen.queryByPlaceholderText('signals.form.titlePlaceholder')).not.toBeOnTheScreen()
      expect(screen.queryByRole('button', {name: 'signals.form.takePhoto'})).not.toBeOnTheScreen()
      expect(screen.queryByRole('button', {name: 'signals.form.deletePhoto'})).not.toBeOnTheScreen()
      expect(imageUris()).toEqual(['https://cdn.test/1.jpg', 'https://cdn.test/2.jpg'])
    })

    it('falls back to a placeholder when there is no description', async () => {
      await renderForm({isEditing: false, signal: {...signal, description: ''}})

      expect(screen.getByText('signals.form.noDescription')).toBeOnTheScreen()
    })

    it('shows only the reported container states', async () => {
      await renderForm({isEditing: false})

      expect(screen.getByText('signals.containerStates.full')).toBeOnTheScreen()
      expect(screen.queryByText('signals.containerStates.dirty')).not.toBeOnTheScreen()
    })

    it.each([
      ['pending', 'signals.lifecycle.pendingMessage'],
      ['in-progress', 'signals.lifecycle.inProgressMessage'],
      ['resolved', 'signals.lifecycle.resolvedMessage'],
      ['rejected', 'signals.lifecycle.rejectedMessage'],
    ] as const)('shows the lifecycle message for "%s"', async (status, message) => {
      await renderForm({isEditing: false, signal: {...signal, status}})

      expect(screen.getByText(message)).toBeOnTheScreen()
      expect(screen.getByText('signals.lifecycle.step1')).toBeOnTheScreen()
      expect(screen.getByText('signals.lifecycle.step3')).toBeOnTheScreen()
    })

    it('labels the middle lifecycle step as rejected for rejected signals', async () => {
      await renderForm({isEditing: false, signal: {...signal, status: 'rejected'}})

      expect(screen.queryByText('signals.lifecycle.step2')).not.toBeOnTheScreen()
      // status badge + lifecycle step
      expect(screen.getAllByText('signals.status.rejected')).toHaveLength(2)
    })

    it('explains why the signal cannot be edited', async () => {
      await renderForm({isEditing: false, canEdit: false})
      expect(screen.getByText('signals.cannotEdit')).toBeOnTheScreen()

      await renderForm({isEditing: false, canEdit: true})
      expect(screen.queryByText('signals.cannotEdit')).not.toBeOnTheScreen()
    })

    it('hides the admin notes section when there are none', async () => {
      await renderForm({isEditing: false, signal: {...signal, adminNotes: undefined}})

      expect(screen.queryByText('signals.adminNotes')).not.toBeOnTheScreen()
    })
  })

  describe('editing', () => {
    it('prefills the editable fields and hides the lifecycle banner', async () => {
      await renderForm()

      expect(screen.getByPlaceholderText('signals.form.titlePlaceholder')).toHaveDisplayValue(
        'Overflowing container'
      )
      expect(screen.getByPlaceholderText('signals.form.descriptionPlaceholder')).toHaveDisplayValue(
        'Bags on the pavement'
      )
      expect(screen.queryByText('signals.lifecycle.step1')).not.toBeOnTheScreen()
    })

    it('submits the edited values through the imperative handle', async () => {
      const {submit} = await renderForm()
      await fireEvent.changeText(
        screen.getByPlaceholderText('signals.form.titlePlaceholder'),
        'Still overflowing'
      )
      await fireEvent.changeText(
        screen.getByPlaceholderText('signals.form.descriptionPlaceholder'),
        'Now with rats'
      )

      const onValid = await submit()

      expect(onValid.mock.calls[0][0]).toEqual({
        title: 'Still overflowing',
        description: 'Now with rats',
        containerState: ['full'],
        photos: [
          {id: 11, uri: 'https://cdn.test/1.jpg', isNew: false},
          {id: 12, uri: 'https://cdn.test/2.jpg', isNew: false},
        ],
      })
    })

    it('requires a title', async () => {
      const {submit} = await renderForm()
      await fireEvent.changeText(screen.getByPlaceholderText('signals.form.titlePlaceholder'), '')

      const onValid = await submit()

      expect(onValid).not.toHaveBeenCalled()
      expect(screen.getByText('signals.validation.titleRequired')).toBeOnTheScreen()
    })

    it('defaults missing optional values', async () => {
      const {submit} = await renderForm({
        signal: {...signal, description: '', containerState: undefined, images: undefined},
      })

      const onValid = await submit()

      expect(onValid.mock.calls[0][0]).toMatchObject({
        description: '',
        containerState: [],
        photos: [],
      })
    })

    describe('container states', () => {
      it('offers every container state with the reported ones selected', async () => {
        await renderForm()

        const states = ['full', 'dirty', 'damaged', 'leaves', 'maintenance', 'bagged', 'fallen']
        for (const state of [...states, 'bulkyWaste']) {
          expect(
            screen.getByRole('button', {name: `signals.containerStates.${state}`})
          ).toBeOnTheScreen()
        }
        expect(screen.getByRole('button', {name: 'signals.containerStates.full'})).toBeSelected()
        expect(
          screen.getByRole('button', {name: 'signals.containerStates.dirty'})
        ).not.toBeSelected()
      })

      it('toggles states on and off', async () => {
        const {submit} = await renderForm()

        await fireEvent.press(screen.getByRole('button', {name: 'signals.containerStates.dirty'}))
        await fireEvent.press(screen.getByRole('button', {name: 'signals.containerStates.full'}))

        expect(screen.getByRole('button', {name: 'signals.containerStates.dirty'})).toBeSelected()
        expect((await submit()).mock.calls[0][0].containerState).toEqual(['dirty'])
      })

      it('is hidden for signals that are not about waste containers', async () => {
        await renderForm({signal: {...signal, category: 'lighting'}})

        expect(screen.queryByText('signals.form.containerState')).not.toBeOnTheScreen()
      })
    })

    describe('photos', () => {
      it('removes an existing photo', async () => {
        const {submit} = await renderForm()

        await fireEvent.press(screen.getAllByRole('button', {name: 'signals.form.deletePhoto'})[0])

        expect(imageUris()).toEqual(['https://cdn.test/2.jpg'])
        expect((await submit()).mock.calls[0][0].photos).toEqual([
          {id: 12, uri: 'https://cdn.test/2.jpg', isNew: false},
        ])
      })

      it('adds a photo from the camera', async () => {
        const {submit} = await renderForm()

        await fireEvent.press(screen.getByRole('button', {name: 'signals.form.takePhoto'}))

        expect(picker.launchCameraAsync).toHaveBeenCalledWith({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
        })
        expect(imageUris()).toContain('file:///camera.jpg')
        expect((await submit()).mock.calls[0][0].photos).toContainEqual({
          uri: 'file:///camera.jpg',
          isNew: true,
        })
      })

      it('adds several photos from the gallery', async () => {
        const {submit} = await renderForm()

        await fireEvent.press(screen.getByRole('button', {name: 'signals.form.chooseFromGallery'}))

        expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
          expect.objectContaining({allowsMultipleSelection: true})
        )
        const photos = (await submit()).mock.calls[0][0].photos!
        expect(photos).toHaveLength(4)
        expect(photos.slice(2)).toEqual([
          {id: expect.any(Number), uri: 'file:///g1.jpg', isNew: true},
          {id: expect.any(Number), uri: 'file:///g2.jpg', isNew: true},
        ])
        expect(photos[2].id).not.toBe(photos[3].id)
      })

      it('removes a photo picked from the gallery', async () => {
        await renderForm()
        await fireEvent.press(screen.getByRole('button', {name: 'signals.form.chooseFromGallery'}))

        await fireEvent.press(screen.getAllByRole('button', {name: 'signals.form.deletePhoto'})[2])

        expect(imageUris()).toEqual([
          'https://cdn.test/1.jpg',
          'https://cdn.test/2.jpg',
          'file:///g2.jpg',
        ])
      })

      // BUG: camera photos are added without an `id`, and the delete button only acts when
      // `photo.id` is set, so a photo taken with the camera can never be removed.
      it.failing('removes a photo taken with the camera', async () => {
        await renderForm({signal: {...signal, images: []}})
        await fireEvent.press(screen.getByRole('button', {name: 'signals.form.takePhoto'}))

        await fireEvent.press(screen.getByRole('button', {name: 'signals.form.deletePhoto'}))

        expect(imageUris()).toEqual([])
      })

      it('ignores cancelled pickers', async () => {
        picker.launchCameraAsync.mockResolvedValueOnce({
          canceled: true,
          assets: null,
        } as ImagePicker.ImagePickerResult)
        await renderForm()

        await fireEvent.press(screen.getByRole('button', {name: 'signals.form.takePhoto'}))

        expect(imageUris()).toHaveLength(2)
      })

      it.each([
        ['takePhoto', 'requestCameraPermissionsAsync', 'newSignal.cameraPermissionRequired'],
        [
          'chooseFromGallery',
          'requestMediaLibraryPermissionsAsync',
          'newSignal.galleryPermissionRequired',
        ],
      ] as const)('alerts when %s permission is denied', async (button, permission, message) => {
        ;(picker[permission] as jest.Mock).mockResolvedValueOnce(denied)
        await renderForm()

        await fireEvent.press(screen.getByRole('button', {name: `signals.form.${button}`}))

        expect(alertSpy).toHaveBeenCalledWith('common.error', message)
        expect(picker.launchCameraAsync).not.toHaveBeenCalled()
        expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled()
      })

      it.each([
        ['takePhoto', 'launchCameraAsync', 'Error taking photo:'],
        ['chooseFromGallery', 'launchImageLibraryAsync', 'Error picking from gallery:'],
      ] as const)('reports %s failures', async (button, launcher, log) => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
        picker[launcher].mockRejectedValueOnce(new Error('camera busy'))
        await renderForm()

        await fireEvent.press(screen.getByRole('button', {name: `signals.form.${button}`}))

        expect(alertSpy).toHaveBeenCalledWith('common.error', 'newSignal.photoError')
        expect(consoleErrorSpy).toHaveBeenCalledWith(log, expect.any(Error))
        consoleErrorSpy.mockRestore()
      })
    })

    it('locks the inputs while submitting', async () => {
      await renderForm({isSubmitting: true})

      expect(screen.getByPlaceholderText('signals.form.titlePlaceholder').props.editable).toBe(
        false
      )
      expect(
        screen.getByPlaceholderText('signals.form.descriptionPlaceholder').props.editable
      ).toBe(false)
      expect(screen.getByRole('button', {name: 'signals.containerStates.dirty'})).toBeDisabled()
      expect(screen.getByRole('button', {name: 'signals.form.takePhoto'})).toBeDisabled()
      expect(screen.getAllByRole('button', {name: 'signals.form.deletePhoto'})[0]).toBeDisabled()
    })
  })

  describe('creating a mission (admins)', () => {
    beforeEach(() => {
      mockAuth = {isAdmin: true, token: 'token-abc'}
    })

    async function openMissionModal() {
      await renderForm()
      await fireEvent.press(screen.getByRole('button', {name: 'missions.form.createMission'}))
    }

    it('opens the mission modal linked to this signal', async () => {
      await openMissionModal()

      const modal = screen.getByTestId('mission-modal')
      expect(modal.props.signalId).toBe('s-1')
      expect(modal.props.cityObject).toEqual(signal.cityObject)
      expect(modal.props.location).toEqual(signal.location)
      expect(modal.props.isSubmitting).toBe(false)
    })

    it('closes the mission modal', async () => {
      await openMissionModal()

      await fireEvent.press(screen.getByText('mission-close'))

      expect(screen.queryByTestId('mission-modal')).not.toBeOnTheScreen()
    })

    it('creates a trimmed mission for the signal and confirms', async () => {
      await openMissionModal()

      await fireEvent.press(screen.getByText('mission-submit'))

      expect(mockCreateMission).toHaveBeenCalledWith(
        {
          signal: 's-1',
          title: 'Clean up',
          description: undefined,
          level: 'verified-contributor',
          status: 'open',
          pointsReward: 15,
          generalInstructions: 'Bring gloves',
          tasks: [
            {
              title: 'Collect',
              instructions: 'All litter',
              acceptanceCriteria: 'Nothing left',
              requiresBeforePhoto: true,
              requiresAfterPhoto: false,
            },
          ],
        },
        'token-abc'
      )
      expect(screen.queryByTestId('mission-modal')).not.toBeOnTheScreen()
      expect(alertSpy).toHaveBeenCalledWith('common.success', 'missions.form.createSuccess')
    })

    it('marks the modal as submitting while the mission is created', async () => {
      let resolveCreate: (value: unknown) => void = () => {}
      mockCreateMission.mockReturnValueOnce(new Promise((resolve) => (resolveCreate = resolve)))
      await openMissionModal()

      // fireEvent resolves with the handler's promise; release the request first.
      const submitted = fireEvent.press(screen.getByText('mission-submit'))
      await waitFor(() => expect(screen.getByTestId('mission-modal').props.isSubmitting).toBe(true))

      await act(async () => resolveCreate({id: 'm-1'}))
      await submitted
    })

    it('keeps the modal open and shows the error when creation fails', async () => {
      mockCreateMission.mockRejectedValueOnce(new Error('Forbidden'))
      await openMissionModal()

      await fireEvent.press(screen.getByText('mission-submit'))

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Forbidden')
      expect(screen.getByTestId('mission-modal').props.isSubmitting).toBe(false)
    })

    it('shows a generic error for non-Error failures', async () => {
      mockCreateMission.mockRejectedValueOnce('boom')
      await openMissionModal()

      await fireEvent.press(screen.getByText('mission-submit'))

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'missions.form.createError')
    })

    it('requires a session token', async () => {
      mockAuth = {isAdmin: true, token: null}
      await openMissionModal()

      await fireEvent.press(screen.getByText('mission-submit'))

      expect(mockCreateMission).not.toHaveBeenCalled()
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.notAuthenticated')
    })
  })
})
