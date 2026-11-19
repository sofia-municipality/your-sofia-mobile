import React from 'react'
import {Alert} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import MissionDetailScreen from '../../../../app/(tabs)/missions/[id]'
import {useMission, useMissions} from '../../../../hooks/useMissions'
import type {Mission, MissionTask} from '../../../../types/mission'

const mockTranslation = {t: (key: string) => key}

jest.mock('react-i18next', () => ({
  useTranslation: () => mockTranslation,
}))

const mockRouter = {push: jest.fn()}
let mockParams: {id?: string} = {id: 'm-1'}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}))

jest.mock('react-native-maps', () => {
  const {View} = require('react-native')
  return {
    __esModule: true,
    default: (props: object) => <View testID="map" {...props} />,
    Marker: (props: object) => <View testID="marker" {...props} />,
  }
})

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {ExternalLink: () => <View testID="icon-ExternalLink" />}
})

jest.mock('../../../../components/missions/MissionLevelBadge', () => {
  const {Text} = require('react-native')
  return {MissionLevelBadge: ({level}: {level: string}) => <Text testID="level">{level}</Text>}
})

jest.mock('../../../../components/missions/DarPointsBadge', () => {
  const {Text} = require('react-native')
  return {DarPointsBadge: ({amount}: {amount: number}) => <Text testID="points">{amount}</Text>}
})

jest.mock('../../../../components/missions/TaskChecklist', () => {
  const {View} = require('react-native')
  return {TaskChecklist: (props: object) => <View testID="task-checklist" {...props} />}
})

jest.mock('../../../../components/missions/PhotoCaptureSlot', () => {
  const {View} = require('react-native')
  return {PhotoCaptureSlot: (props: object) => <View testID="photo-slot" {...props} />}
})

let mockAuth: {user: {id: number} | null}

jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

jest.mock('../../../../hooks/useMissions', () => ({
  useMission: jest.fn(),
  useMissions: jest.fn(),
}))

const mockUseMission = useMission as jest.Mock
const mockUseMissions = useMissions as jest.Mock
const mockRefresh = jest.fn()
const mockClaim = jest.fn()
const mockSubmitTask = jest.fn()
const mockSubmitOverallPhotos = jest.fn()
const mockSubmitForReview = jest.fn()
const mockRefreshDarPoints = jest.fn()

const task = (overrides: Partial<MissionTask> = {}): MissionTask => ({
  id: 't-1',
  title: 'Photograph the bins',
  instructions: '',
  acceptanceCriteria: '',
  ...overrides,
})

const doneTask = (id: string) =>
  task({
    id,
    beforePhoto: {url: 'https://cdn.test/b.jpg'},
    afterPhoto: {url: 'https://cdn.test/a.jpg'},
  })

const baseMission: Mission = {
  id: 'm-1',
  signal: {
    id: 55,
    location: [23.3219, 42.6977],
    cityObject: {type: 'waste-container', referenceId: 'WC-001'},
  },
  title: 'Clean the bins',
  description: 'Around the playground',
  level: 'good-first-mission',
  status: 'open',
  pointsReward: 10,
  generalInstructions: 'Wear gloves',
  tasks: [task()],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}

/** A mission the signed-in user (id 7) is working on and could submit. */
const ownMission = (overrides: Partial<Mission> = {}): Mission => ({
  ...baseMission,
  status: 'in_progress',
  citizen: {id: 7},
  tasks: [doneTask('t-1'), doneTask('t-2')],
  missionBeforePhotos: [{url: 'https://cdn.test/before.jpg'}],
  missionAfterPhotos: [{url: 'https://cdn.test/after.jpg'}],
  ...overrides,
})

function withMission(
  mission: Mission | null,
  state: {loading?: boolean; error?: string | null} = {}
) {
  mockUseMission.mockReturnValue({
    mission,
    loading: false,
    error: null,
    refresh: mockRefresh,
    ...state,
  })
}

const photo = {uri: 'file:///p.jpg', type: 'image/jpeg', name: 'mission-1.jpg'}
const spinners = () => screen.container.queryAll((node) => node.type === 'ActivityIndicator')
const slots = () => screen.queryAllByTestId('photo-slot')
const checklist = () => screen.getByTestId('task-checklist')
const submitButton = () => screen.getByText('missions.submitForReview').parent!

let alertSpy: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockParams = {id: 'm-1'}
  mockAuth = {user: {id: 7}}
  withMission(baseMission)
  mockUseMissions.mockReturnValue({
    claim: mockClaim,
    submitTask: mockSubmitTask,
    submitOverallPhotos: mockSubmitOverallPhotos,
    submitForReview: mockSubmitForReview,
    refreshDarPoints: mockRefreshDarPoints,
  })
  mockRefresh.mockResolvedValue(undefined)
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
})

afterEach(() => alertSpy.mockRestore())

describe('MissionDetailScreen', () => {
  describe('loading', () => {
    it('loads the mission from the route id', async () => {
      mockParams = {id: 'm-42'}

      await render(<MissionDetailScreen />)

      expect(mockUseMission).toHaveBeenCalledWith('m-42')
    })

    it('shows a spinner before the mission arrives', async () => {
      withMission(null, {loading: true})

      await render(<MissionDetailScreen />)

      expect(spinners()).toHaveLength(1)
      expect(screen.queryByText('missions.notFound')).toBeNull()
    })

    it('keeps the mission on screen while reloading', async () => {
      withMission(baseMission, {loading: true})

      await render(<MissionDetailScreen />)

      expect(screen.getByText('Clean the bins')).toBeVisible()
    })

    it('shows the error', async () => {
      withMission(null, {error: 'Mission not found'})

      await render(<MissionDetailScreen />)

      expect(screen.getByText('Mission not found')).toBeVisible()
    })

    it('says when the mission is missing', async () => {
      withMission(null)

      await render(<MissionDetailScreen />)

      expect(screen.getByText('missions.notFound')).toBeVisible()
    })
  })

  describe('overview', () => {
    it('shows the level, reward, status, title, description and instructions', async () => {
      await render(<MissionDetailScreen />)

      expect(screen.getByTestId('level')).toHaveTextContent('good-first-mission')
      expect(screen.getByTestId('points')).toHaveTextContent('10')
      expect(screen.getByText('missions.status.open')).toBeVisible()
      expect(screen.getByText('Clean the bins')).toBeVisible()
      expect(screen.getByText('Around the playground')).toBeVisible()
      expect(screen.getByText('missions.instructions')).toBeVisible()
      expect(screen.getByText('Wear gloves')).toBeVisible()
    })

    it('shows the points actually awarded once there are any', async () => {
      withMission({...baseMission, status: 'completed', pointsAwarded: 7})

      await render(<MissionDetailScreen />)

      expect(screen.getByTestId('points')).toHaveTextContent('7')
    })

    it.each([
      ['draft', 'missions.status.draft'],
      ['in_progress', 'missions.status.inProgress'],
      ['ready_for_review', 'missions.status.readyForReview'],
      ['returned_for_improvement', 'missions.status.returnedForImprovement'],
      ['completed', 'missions.status.completed'],
      ['cancelled', 'missions.status.cancelled'],
    ] as const)('labels the %s status', async (status, label) => {
      withMission({...baseMission, status})

      await render(<MissionDetailScreen />)

      expect(screen.getByText(label)).toBeVisible()
    })

    it('falls back to the raw status name', async () => {
      withMission({...baseMission, status: 'archived' as Mission['status']})

      await render(<MissionDetailScreen />)

      expect(screen.getByText('archived')).toBeVisible()
    })

    it('leaves out a missing description', async () => {
      withMission({...baseMission, description: undefined})

      await render(<MissionDetailScreen />)

      expect(screen.queryByText('Around the playground')).toBeNull()
    })

    it('shows the inspector notes on a returned mission', async () => {
      withMission({
        ...baseMission,
        status: 'returned_for_improvement',
        inspectorReviewNotes: 'The after photo is blurry',
      })

      await render(<MissionDetailScreen />)

      expect(screen.getByText('missions.reviewNotes')).toBeVisible()
      expect(screen.getByText('The after photo is blurry')).toBeVisible()
    })

    it('hides old inspector notes once the mission moved on', async () => {
      withMission({...baseMission, status: 'in_progress', inspectorReviewNotes: 'Old notes'})

      await render(<MissionDetailScreen />)

      expect(screen.queryByText('Old notes')).toBeNull()
    })

    it('shows the signal location on the map', async () => {
      await render(<MissionDetailScreen />)

      const region = {
        latitude: 42.6977,
        longitude: 23.3219,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
      expect(screen.getByTestId('map').props).toMatchObject({initialRegion: region, region})
      expect(screen.getByTestId('marker').props.coordinate).toEqual({
        latitude: 42.6977,
        longitude: 23.3219,
      })
    })

    it('leaves out the map when the signal has no location', async () => {
      withMission({...baseMission, signal: {id: 55}})

      await render(<MissionDetailScreen />)

      expect(screen.queryByTestId('map')).toBeNull()
    })

    it('links to the signal behind the mission', async () => {
      await render(<MissionDetailScreen />)

      expect(screen.getByText('missions.form.linkedSignal 55')).toBeVisible()
      expect(screen.getByText('waste-container • WC-001')).toBeVisible()

      await fireEvent.press(screen.getByText('missions.form.linkedSignal 55'))

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/signals/55')
    })

    it('leaves out the signal link when there is no signal id', async () => {
      withMission({...baseMission, signal: {id: 0}})

      await render(<MissionDetailScreen />)

      expect(screen.queryByText(/missions.form.linkedSignal/)).toBeNull()
    })

    it('shows the inspector', async () => {
      withMission({...baseMission, inspector: {name: 'Maria', email: 'maria@sofia.bg'}})

      await render(<MissionDetailScreen />)

      expect(screen.getByText('missions.form.inspector: Maria')).toBeVisible()
      expect(screen.getByText('maria@sofia.bg')).toBeVisible()
    })

    it('leaves out an unknown inspector', async () => {
      withMission({...baseMission, inspector: {id: 3}})

      await render(<MissionDetailScreen />)

      expect(screen.queryByText(/missions.form.inspector/)).toBeNull()
    })

    // BUG: the card is shown when the inspector has only an email, but the label always
    // appends `inspector.name`, so it reads "Inspector: undefined".
    it.failing('does not print "undefined" for an inspector without a name', async () => {
      withMission({...baseMission, inspector: {email: 'maria@sofia.bg'}})

      await render(<MissionDetailScreen />)

      expect(screen.getByText('maria@sofia.bg')).toBeVisible()
      expect(screen.queryByText(/undefined/)).toBeNull()
    })
  })

  describe('claiming', () => {
    const claimButton = () => screen.queryByText('missions.claim')

    it('is offered for an open mission', async () => {
      await render(<MissionDetailScreen />)

      expect(claimButton()).toBeVisible()
    })

    it.each([
      ['a locked mission', {locked: true}],
      ['a mission in progress', {status: 'in_progress' as const}],
    ])('is not offered for %s', async (_, overrides) => {
      withMission({...baseMission, ...overrides})

      await render(<MissionDetailScreen />)

      expect(claimButton()).toBeNull()
    })

    it('claims the mission and reloads it', async () => {
      mockClaim.mockResolvedValue({})

      await render(<MissionDetailScreen />)
      await fireEvent.press(claimButton()!)

      expect(mockClaim).toHaveBeenCalledWith('m-1')
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(alertSpy).not.toHaveBeenCalled()
    })

    it('shows a spinner and blocks a second claim meanwhile', async () => {
      let finish: (value: unknown) => void = () => {}
      mockClaim.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await render(<MissionDetailScreen />)
      const button = claimButton()!.parent!

      const claiming = fireEvent.press(button)

      await waitFor(() => expect(spinners()).toHaveLength(1))
      expect(screen.queryByText('missions.claim')).toBeNull()
      await act(async () => finish({}))
      await claiming
      expect(claimButton()).toBeVisible()
    })

    it.each([
      [new Error('Mission already claimed'), 'Mission already claimed'],
      ['boom', 'missions.claimError'],
    ])('explains a failed claim (%s)', async (failure, message) => {
      mockClaim.mockRejectedValue(failure)

      await render(<MissionDetailScreen />)
      await fireEvent.press(claimButton()!)

      expect(alertSpy).toHaveBeenCalledWith('common.error', message)
      expect(mockRefresh).not.toHaveBeenCalled()
      expect(claimButton()).toBeVisible()
    })
  })

  describe('owner tools', () => {
    it('are hidden from other users', async () => {
      withMission({...ownMission(), citizen: {id: 8}})

      await render(<MissionDetailScreen />)

      expect(slots()).toHaveLength(0)
      expect(screen.queryByText('missions.submitForReview')).toBeNull()
      expect(checklist().props.editable).toBe(false)
    })

    it('recognise the owner by a bare citizen id', async () => {
      withMission(ownMission({citizen: 7}))

      await render(<MissionDetailScreen />)

      expect(slots()).toHaveLength(2)
    })

    it('show the overall before and after photos', async () => {
      withMission(ownMission())

      await render(<MissionDetailScreen />)

      expect(screen.getByText('missions.overallPhotos')).toBeVisible()
      expect(slots().map((slot) => slot.props)).toEqual([
        expect.objectContaining({
          label: 'missions.photoBefore',
          existingPhotoUrl: 'https://cdn.test/before.jpg',
          uploading: false,
          disabled: false,
        }),
        expect.objectContaining({
          label: 'missions.photoAfter',
          existingPhotoUrl: 'https://cdn.test/after.jpg',
          uploading: false,
          disabled: false,
        }),
      ])
    })

    it.each(['in_progress', 'returned_for_improvement'] as const)(
      'can be used while the mission is %s',
      async (status) => {
        withMission(ownMission({status}))

        await render(<MissionDetailScreen />)

        expect(slots().every((slot) => slot.props.disabled === false)).toBe(true)
        expect(checklist().props.editable).toBe(true)
        expect(submitButton()).toBeEnabled()
      }
    )

    it.each(['ready_for_review', 'completed'] as const)(
      'are read-only once the mission is %s',
      async (status) => {
        withMission(ownMission({status}))

        await render(<MissionDetailScreen />)

        expect(slots().every((slot) => slot.props.disabled === true)).toBe(true)
        expect(checklist().props.editable).toBe(false)
        expect(screen.queryByText('missions.submitForReview')).toBeNull()
      }
    )

    it('passes the tasks to the checklist', async () => {
      const mission = ownMission()
      withMission(mission)

      await render(<MissionDetailScreen />)

      expect(checklist().props).toMatchObject({
        tasks: mission.tasks,
        pendingPhotos: {},
        submittingTaskId: null,
      })
    })
  })

  describe('overall photos', () => {
    beforeEach(() => withMission(ownMission()))

    it.each([
      [0, 'before', {before: [photo]}],
      [1, 'after', {after: [photo]}],
    ] as const)('uploads the %s photo and reloads', async (slot, _, payload) => {
      mockSubmitOverallPhotos.mockResolvedValue({})
      await render(<MissionDetailScreen />)

      await act(async () => slots()[slot].props.onCapture(photo))

      expect(mockSubmitOverallPhotos).toHaveBeenCalledWith('m-1', payload)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('marks both slots as uploading meanwhile', async () => {
      let finish: (value: unknown) => void = () => {}
      mockSubmitOverallPhotos.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await render(<MissionDetailScreen />)

      const uploading = slots()[0].props.onCapture(photo)

      await waitFor(() => expect(slots().map((slot) => slot.props.uploading)).toEqual([true, true]))
      await act(async () => finish({}))
      await act(async () => uploading)
      expect(slots().map((slot) => slot.props.uploading)).toEqual([false, false])
    })

    it.each([
      [new Error('Upload failed'), 'Upload failed'],
      ['boom', 'missions.overallPhotoError'],
    ])('explains a failed upload (%s)', async (failure, message) => {
      mockSubmitOverallPhotos.mockRejectedValue(failure)
      await render(<MissionDetailScreen />)

      await act(async () => slots()[0].props.onCapture(photo))

      expect(alertSpy).toHaveBeenCalledWith('common.error', message)
      expect(mockRefresh).not.toHaveBeenCalled()
      expect(slots()[0].props.uploading).toBe(false)
    })
  })

  describe('task photos', () => {
    beforeEach(() => withMission(ownMission()))

    it.each([
      ['before', {before: photo}],
      ['after', {after: photo}],
    ] as const)('uploads the %s photo of a task and reloads', async (kind, payload) => {
      mockSubmitTask.mockResolvedValue({})
      await render(<MissionDetailScreen />)

      await act(async () => checklist().props.onCapturePhoto('t-2', kind, photo))

      expect(mockSubmitTask).toHaveBeenCalledWith('m-1', 't-2', payload)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('marks the task as uploading meanwhile', async () => {
      let finish: (value: unknown) => void = () => {}
      mockSubmitTask.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await render(<MissionDetailScreen />)

      const uploading = checklist().props.onCapturePhoto('t-2', 'after', photo)

      await waitFor(() => expect(checklist().props.submittingTaskId).toBe('t-2'))
      await act(async () => finish({}))
      await act(async () => uploading)
      expect(checklist().props.submittingTaskId).toBeNull()
    })

    it.each([
      [new Error('Too dark'), 'Too dark'],
      ['boom', 'missions.taskPhotoError'],
    ])('explains a failed upload (%s)', async (failure, message) => {
      mockSubmitTask.mockRejectedValue(failure)
      await render(<MissionDetailScreen />)

      await act(async () => checklist().props.onCapturePhoto('t-1', 'before', photo))

      expect(alertSpy).toHaveBeenCalledWith('common.error', message)
      expect(checklist().props.submittingTaskId).toBeNull()
    })
  })

  describe('submitting for review', () => {
    it('is possible once every task and both overall photos are done', async () => {
      withMission(ownMission())

      await render(<MissionDetailScreen />)

      expect(submitButton()).toBeEnabled()
    })

    it.each([
      [
        'a task lacks its before photo',
        {tasks: [doneTask('t-1'), task({id: 't-2', afterPhoto: 4})]},
      ],
      ['a task lacks its after photo', {tasks: [task({beforePhoto: 3})]}],
      ['the overall before photo is missing', {missionBeforePhotos: []}],
      ['the overall after photo is missing', {missionAfterPhotos: undefined}],
    ])('is blocked while %s', async (_, overrides) => {
      withMission(ownMission(overrides))

      await render(<MissionDetailScreen />)

      expect(submitButton()).toBeDisabled()
    })

    it('does not wait for photos a task does not require', async () => {
      withMission(
        ownMission({
          tasks: [
            task({id: 't-1', requiresBeforePhoto: false, afterPhoto: 4}),
            task({id: 't-2', requiresBeforePhoto: false, requiresAfterPhoto: false}),
          ],
        })
      )

      await render(<MissionDetailScreen />)

      expect(submitButton()).toBeEnabled()
    })

    it('submits, reloads the mission and the points, and confirms', async () => {
      withMission(ownMission())
      mockSubmitForReview.mockResolvedValue({})
      mockRefreshDarPoints.mockResolvedValue(undefined)

      await render(<MissionDetailScreen />)
      await fireEvent.press(submitButton())

      expect(mockSubmitForReview).toHaveBeenCalledWith('m-1')
      expect(mockRefresh).toHaveBeenCalledTimes(1)
      expect(mockRefreshDarPoints).toHaveBeenCalledTimes(1)
      expect(alertSpy).toHaveBeenCalledWith('common.success', 'missions.submittedForReview')
    })

    it('shows a spinner meanwhile', async () => {
      withMission(ownMission())
      let finish: (value: unknown) => void = () => {}
      mockSubmitForReview.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await render(<MissionDetailScreen />)
      const button = submitButton()

      const submitting = fireEvent.press(button)

      await waitFor(() => expect(screen.queryByText('missions.submitForReview')).toBeNull())
      expect(spinners()).toHaveLength(1)
      await act(async () => finish({}))
      await submitting
      expect(submitButton()).toBeEnabled()
    })

    it.each([
      [new Error('Photos missing'), 'Photos missing'],
      ['boom', 'missions.submitReviewError'],
    ])('explains a failed submission (%s)', async (failure, message) => {
      withMission(ownMission())
      mockSubmitForReview.mockRejectedValue(failure)

      await render(<MissionDetailScreen />)
      await fireEvent.press(submitButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', message)
      expect(mockRefreshDarPoints).not.toHaveBeenCalled()
    })
  })
})
