import React from 'react'
import {Alert, StyleSheet} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import AssignmentsScreen from '../../../app/(tabs)/assignments'
import {createAssignment, fetchAssignments, fetchContainersWithSignals} from '../../../lib/payload'
import type {Assignment} from '../../../types/assignment'
import type {WasteContainer} from '../../../types/wasteContainer'
import {colors} from '../../../styles/tokens'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockT}),
}))
const mockT = (key: string, options?: object) =>
  options ? `${key}:${JSON.stringify(options)}` : key

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}))

let mockAuth: {user: {id: number} | null; isContainerAdmin: boolean; token: string | null}
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

jest.mock('../../../lib/payload', () => ({
  fetchAssignments: jest.fn(),
  fetchContainersWithSignals: jest.fn(),
  createAssignment: jest.fn(),
  calculateAssignmentProgress:
    jest.requireActual('../../../lib/payload').calculateAssignmentProgress,
}))

const mockAssignments = fetchAssignments as jest.Mock
const mockContainers = fetchContainersWithSignals as jest.Mock
const mockCreate = createAssignment as jest.Mock

type ContainerWithSignals = WasteContainer & {signalCount: number; activeSignalCount: number}

const container = (overrides: Partial<ContainerWithSignals>): ContainerWithSignals => ({
  id: 'c1',
  publicNumber: 'TRI-0001',
  location: [23.32, 42.68],
  latitude: 42.68,
  longitude: 23.32,
  capacityVolume: 1.1,
  capacitySize: 'standard',
  wasteType: 'general',
  status: 'active',
  state: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  signalCount: 0,
  activeSignalCount: 0,
  ...overrides,
})

const assignment = (overrides: Partial<Assignment>): Assignment => ({
  id: 'a1',
  title: 'Clean Triaditsa',
  description: 'Full containers near the market',
  containers: [
    container({id: 'c1', publicNumber: 'TRI-0001', state: ['full', 'dirty']}),
    container({id: 'c2', publicNumber: 'TRI-0002', state: ['full']}),
    container({id: 'c3', publicNumber: 'TRI-0003', state: []}),
    container({id: 'c4', publicNumber: 'TRI-0004', state: ['dirty', 'full']}),
  ],
  assignedTo: {id: 7, name: 'Ivan Petrov', email: 'ivan@example.com'},
  activities: ['full', 'dirty'],
  status: 'in-progress',
  dueDate: '2026-11-20T00:00:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
})

const containers = [
  container({id: 'c1', publicNumber: 'TRI-0001', signalCount: 3, activeSignalCount: 2}),
  container({id: 'c2', publicNumber: 'TRI-0002', signalCount: 1, activeSignalCount: 0}),
  container({id: 'c3', publicNumber: 'TRI-0003', signalCount: 0, activeSignalCount: 0}),
]

const spinners = () => screen.container.queryAll((n) => n.type === 'ActivityIndicator')
const refreshControl = () =>
  screen.container.queryAll((n) => n.props.refreshControl !== undefined)[0].props.refreshControl
const titleInput = () => screen.getByPlaceholderText('assignments.titlePlaceholder')
const descriptionInput = () => screen.getByPlaceholderText('assignments.descriptionPlaceholder')
const closeButtons = () =>
  screen.container.queryAll(
    (n) =>
      typeof n.type === 'string' &&
      n.props.onClick !== undefined &&
      StyleSheet.flatten(n.parent?.props.style)?.justifyContent === 'space-between' &&
      StyleSheet.flatten(n.parent?.props.style)?.borderBottomWidth === 1
  )

/** The "create" button floats above the list once containers are selected. */
const fab = () =>
  screen.container.queryAll(
    (n) =>
      typeof n.type === 'string' &&
      n.props.onClick !== undefined &&
      StyleSheet.flatten(n.props.style)?.position === 'absolute'
  )[0]

async function renderScreen() {
  await render(<AssignmentsScreen />)
  await waitFor(() => expect(spinners()).toHaveLength(0))
}

async function showContainers() {
  await fireEvent.press(screen.getByText('assignments.selectContainers'))
}

async function openCreateForm(...publicNumbers: string[]) {
  await showContainers()
  for (const publicNumber of publicNumbers) {
    await fireEvent.press(screen.getByText(publicNumber))
  }
  await fireEvent.press(fab())
}

describe('AssignmentsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Alert, 'alert')
    mockAuth = {user: {id: 7}, isContainerAdmin: true, token: 'jwt-token'}
    mockAssignments.mockResolvedValue({docs: [assignment({})]})
    mockContainers.mockResolvedValue({docs: containers})
    mockCreate.mockResolvedValue(assignment({id: 'new'}))
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('access', () => {
    it('is only for container admins', async () => {
      mockAuth = {user: {id: 3}, isContainerAdmin: false, token: 'jwt-token'}

      await render(<AssignmentsScreen />)

      expect(screen.getByText('newCityObject.adminOnly')).toBeOnTheScreen()
      expect(mockAssignments).not.toHaveBeenCalled()
      expect(mockContainers).not.toHaveBeenCalled()
    })
  })

  describe('loading', () => {
    it('shows a loading state until the data arrives', async () => {
      let resolve!: (value: unknown) => void
      mockAssignments.mockReturnValue(new Promise((r) => (resolve = r)))
      await render(<AssignmentsScreen />)

      expect(screen.getByText('common.loading')).toBeOnTheScreen()
      expect(spinners()).toHaveLength(1)

      await act(async () => resolve({docs: []}))
      expect(spinners()).toHaveLength(0)
    })

    it('loads the latest 50 assignments and every container with its signal counts', async () => {
      await renderScreen()

      expect(mockAssignments).toHaveBeenCalledWith({limit: 50})
      expect(mockContainers).toHaveBeenCalledWith({limit: 1000})
    })

    it('shows the empty state when loading fails', async () => {
      const error = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockAssignments.mockRejectedValue(new Error('offline'))

      await renderScreen()

      expect(error).toHaveBeenCalledWith('Failed to load assignments data:', expect.any(Error))
      expect(screen.getByText('assignments.noAssignments')).toBeOnTheScreen()
    })

    it('reloads when pulled to refresh, without the full-screen loader', async () => {
      await renderScreen()
      let resolve!: (value: unknown) => void
      mockAssignments.mockReturnValue(new Promise((r) => (resolve = r)))

      await act(async () => refreshControl().props.onRefresh())

      expect(mockAssignments).toHaveBeenCalledTimes(2)
      expect(refreshControl().props.refreshing).toBe(true)
      expect(screen.getByText('Clean Triaditsa')).toBeOnTheScreen()

      await act(async () => resolve({docs: [assignment({title: 'Refreshed'})]}))
      expect(refreshControl().props.refreshing).toBe(false)
      expect(screen.getByText('Refreshed')).toBeOnTheScreen()
    })
  })

  describe('assignment list', () => {
    it('counts the assignments in the tab', async () => {
      await renderScreen()

      expect(screen.getByText('assignments.title (1)')).toBeOnTheScreen()
    })

    it('summarises each assignment', async () => {
      await renderScreen()

      expect(screen.getByText('Clean Triaditsa')).toBeOnTheScreen()
      expect(screen.getByText('assignments.status.in-progress')).toBeOnTheScreen()
      expect(screen.getByText('Full containers near the market')).toBeOnTheScreen()
      expect(screen.getByText('assignments.containerCount:{"count":4}')).toBeOnTheScreen()
      expect(screen.getByText('Ivan Petrov')).toBeOnTheScreen()
      expect(
        screen.getByText(
          new Date('2026-11-20T00:00:00.000Z').toLocaleDateString('bg-BG', {
            day: 'numeric',
            month: 'short',
          })
        )
      ).toBeOnTheScreen()
    })

    it('shows how many containers have every activity done', async () => {
      await renderScreen()

      expect(screen.getByText('50%')).toBeOnTheScreen()
      const bar = screen.container.queryAll(
        (n) => StyleSheet.flatten(n.props.style)?.width === '50%'
      )
      expect(bar).toHaveLength(1)
      expect(bar[0]).toHaveStyle({backgroundColor: colors.primaryLight})
    })

    it('marks a fully done assignment', async () => {
      mockAssignments.mockResolvedValue({
        docs: [
          assignment({
            status: 'completed',
            containers: [container({state: ['full', 'dirty']})],
          }),
        ],
      })

      await renderScreen()

      expect(screen.getByText('100%')).toBeOnTheScreen()
      expect(
        screen.container.queryAll((n) => StyleSheet.flatten(n.props.style)?.width === '100%')[0]
      ).toHaveStyle({backgroundColor: colors.success})
      expect(screen.getByText('assignments.status.completed')).toHaveStyle({color: '#065F46'})
    })

    it('falls back to the assignee email when they have no name', async () => {
      mockAssignments.mockResolvedValue({
        docs: [assignment({assignedTo: {id: 7, name: '', email: 'ivan@example.com'}})],
      })

      await renderScreen()

      expect(screen.getByText('ivan@example.com')).toBeOnTheScreen()
    })

    it('leaves out the optional details and the progress bar', async () => {
      mockAssignments.mockResolvedValue({
        docs: [
          assignment({
            description: undefined,
            dueDate: undefined,
            assignedTo: 7,
            containers: [],
          }),
        ],
      })

      await renderScreen()

      expect(screen.getByText('assignments.containerCount:{"count":0}')).toBeOnTheScreen()
      expect(screen.queryByText('assignments.progress')).toBeNull()
      expect(screen.queryByText('Full containers near the market')).toBeNull()
    })

    it('says when there are no assignments', async () => {
      mockAssignments.mockResolvedValue({docs: []})

      await renderScreen()

      expect(screen.getByText('assignments.noAssignments')).toBeOnTheScreen()
      expect(screen.getByText('assignments.createNew')).toBeOnTheScreen()
    })
  })

  describe('assignment details', () => {
    it('opens the details of a tapped assignment', async () => {
      await renderScreen()

      await fireEvent.press(screen.getByText('Clean Triaditsa'))

      expect(screen.getAllByText('Clean Triaditsa')).toHaveLength(2)
      expect(screen.getByText('assignments.status.title')).toBeOnTheScreen()
      expect(screen.getByText('assignments.activities')).toBeOnTheScreen()
      expect(screen.getByText('signals.containerStates.full')).toBeOnTheScreen()
      expect(screen.getByText('signals.containerStates.dirty')).toBeOnTheScreen()
      expect(screen.getByText('assignments.assignTo')).toBeOnTheScreen()
      expect(screen.getByText('assignments.dueDate')).toBeOnTheScreen()
      expect(
        screen.getByText(new Date('2026-11-20T00:00:00.000Z').toLocaleDateString('bg-BG'))
      ).toBeOnTheScreen()
      for (const publicNumber of ['TRI-0001', 'TRI-0002', 'TRI-0003', 'TRI-0004']) {
        expect(screen.getByText(publicNumber)).toBeOnTheScreen()
      }
    })

    it('lists containers that were not expanded by their id', async () => {
      mockAssignments.mockResolvedValue({
        docs: [assignment({containers: ['c-17', 'c-18'], assignedTo: 7})],
      })
      await renderScreen()

      await fireEvent.press(screen.getByText('Clean Triaditsa'))

      expect(screen.getByText('c-17')).toBeOnTheScreen()
      expect(screen.getByText('c-18')).toBeOnTheScreen()
      expect(screen.getByText('N/A')).toBeOnTheScreen()
    })

    it('closes the details with the close button', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('Clean Triaditsa'))

      await fireEvent.press(closeButtons().at(-1)!)

      expect(screen.queryByText('assignments.activities')).toBeNull()
    })

    it('closes the details with the back button', async () => {
      await renderScreen()
      await fireEvent.press(screen.getByText('Clean Triaditsa'))

      const modals = screen.container.queryAll((n) => n.props.onRequestClose !== undefined)
      await fireEvent(modals.at(-1)!, 'requestClose')

      expect(screen.queryByText('assignments.activities')).toBeNull()
    })
  })

  describe('container selection', () => {
    it('lists every container with its total and active signal counts', async () => {
      await renderScreen()

      await showContainers()

      expect(screen.getByText('TRI-0001')).toBeOnTheScreen()
      expect(screen.getByText('3 (2)')).toBeOnTheScreen()
      expect(screen.getByText('1')).toBeOnTheScreen()
      expect(screen.getByText('3 (2)')).toHaveStyle({color: colors.error})
      expect(screen.getByText('assignments.containerSelected:{"count":0}')).toBeOnTheScreen()
    })

    it('selects and deselects containers', async () => {
      await renderScreen()
      await showContainers()

      await fireEvent.press(screen.getByText('TRI-0001'))
      await fireEvent.press(screen.getByText('TRI-0003'))
      expect(screen.getByText('assignments.containerSelected:{"count":2}')).toBeOnTheScreen()

      await fireEvent.press(screen.getByText('TRI-0001'))
      expect(screen.getByText('assignments.containerSelected:{"count":1}')).toBeOnTheScreen()
    })

    it('offers to create a task only once something is selected', async () => {
      await renderScreen()
      await showContainers()
      expect(fab()).toBeUndefined()

      await fireEvent.press(screen.getByText('TRI-0002'))

      expect(fab()).toHaveTextContent('1')
    })

    // BUG: app/(tabs)/assignments.tsx:314-318 — the containers list's empty state is the
    // "loading" text, so when there are no containers (or loading failed) the admin is told
    // the list is still loading, forever.
    it.failing('does not claim to be loading when there are no containers', async () => {
      mockContainers.mockResolvedValue({docs: []})
      await renderScreen()

      await showContainers()

      expect(screen.queryByText('common.loading')).toBeNull()
    })
  })

  describe('creating a task', () => {
    it('opens the form for the selected containers', async () => {
      await renderScreen()

      await openCreateForm('TRI-0001', 'TRI-0002')

      expect(titleInput()).toBeOnTheScreen()
      expect(screen.getAllByText('assignments.containerSelected:{"count":2}')).toHaveLength(2)
      for (const state of [
        'full',
        'dirty',
        'damaged',
        'leaves',
        'maintenance',
        'bagged',
        'fallen',
        'bulkyWaste',
      ]) {
        expect(screen.getByText(`signals.containerStates.${state}`)).toBeOnTheScreen()
      }
    })

    it('requires a title', async () => {
      await renderScreen()
      await openCreateForm('TRI-0001')
      await fireEvent.changeText(titleInput(), '   ')
      await fireEvent.press(screen.getByText('signals.containerStates.full'))

      await fireEvent.press(screen.getByText('common.new'))

      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'assignments.titleRequired')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('requires at least one activity', async () => {
      await renderScreen()
      await openCreateForm('TRI-0001')
      await fireEvent.changeText(titleInput(), 'Morning round')

      await fireEvent.press(screen.getByText('common.new'))

      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'assignments.selectActivities')
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('creates a pending task for the current admin', async () => {
      await renderScreen()
      await openCreateForm('TRI-0001', 'TRI-0003')
      await fireEvent.changeText(titleInput(), 'Morning round')
      await fireEvent.changeText(descriptionInput(), 'Start at the market')
      await fireEvent.press(screen.getByText('signals.containerStates.full'))
      await fireEvent.press(screen.getByText('signals.containerStates.bagged'))

      await fireEvent.press(screen.getByText('common.new'))

      expect(mockCreate).toHaveBeenCalledWith(
        {
          title: 'Morning round',
          description: 'Start at the market',
          containers: ['c1', 'c3'],
          activities: ['full', 'bagged'],
          assignedTo: 7,
          status: 'pending',
        },
        'jwt-token'
      )
      expect(Alert.alert).toHaveBeenCalledWith('common.success', 'assignments.created')
    })

    it('leaves out an empty description and an unticked activity', async () => {
      await renderScreen()
      await openCreateForm('TRI-0002')
      await fireEvent.changeText(titleInput(), 'Quick check')
      await fireEvent.press(screen.getByText('signals.containerStates.full'))
      await fireEvent.press(screen.getByText('signals.containerStates.dirty'))
      await fireEvent.press(screen.getByText('signals.containerStates.full'))

      await fireEvent.press(screen.getByText('common.new'))

      expect(mockCreate.mock.calls[0][0]).toEqual(
        expect.objectContaining({description: undefined, activities: ['dirty']})
      )
    })

    it('closes the form, clears the selection and reloads after creating', async () => {
      await renderScreen()
      await openCreateForm('TRI-0001')
      await fireEvent.changeText(titleInput(), 'Morning round')
      await fireEvent.press(screen.getByText('signals.containerStates.full'))

      await fireEvent.press(screen.getByText('common.new'))
      await waitFor(() => expect(spinners()).toHaveLength(0))

      expect(screen.queryByPlaceholderText('assignments.titlePlaceholder')).toBeNull()
      expect(mockAssignments).toHaveBeenCalledTimes(2)
      expect(screen.getByText('assignments.containerSelected:{"count":0}')).toBeOnTheScreen()
      expect(fab()).toBeUndefined()
    })

    it('starts the next task with an empty form', async () => {
      await renderScreen()
      await openCreateForm('TRI-0001')
      await fireEvent.changeText(titleInput(), 'Morning round')
      await fireEvent.press(screen.getByText('signals.containerStates.full'))
      await fireEvent.press(screen.getByText('common.new'))
      await waitFor(() => expect(spinners()).toHaveLength(0))

      await fireEvent.press(screen.getByText('TRI-0002'))
      await fireEvent.press(fab())

      expect(titleInput()).toHaveDisplayValue('')
      await fireEvent.changeText(titleInput(), 'Second')
      await fireEvent.press(screen.getByText('common.new'))
      expect(Alert.alert).toHaveBeenLastCalledWith('common.error', 'assignments.selectActivities')
    })

    it('keeps the form open and tells the admin when creating fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      mockCreate.mockRejectedValue(new Error('403'))
      await renderScreen()
      await openCreateForm('TRI-0001')
      await fireEvent.changeText(titleInput(), 'Morning round')
      await fireEvent.press(screen.getByText('signals.containerStates.full'))

      await fireEvent.press(screen.getByText('common.new'))

      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'assignments.createFailed')
      expect(titleInput()).toHaveDisplayValue('Morning round')
      expect(screen.getByText('common.new')).toBeOnTheScreen()
      expect(mockAssignments).toHaveBeenCalledTimes(1)
    })

    it('disables the button and shows a spinner while creating', async () => {
      let resolve!: (value: unknown) => void
      mockCreate.mockReturnValue(new Promise((r) => (resolve = r)))
      await renderScreen()
      await openCreateForm('TRI-0001')
      await fireEvent.changeText(titleInput(), 'Morning round')
      await fireEvent.press(screen.getByText('signals.containerStates.full'))
      const submitButton = screen.getByText('common.new').parent!

      const submitted = fireEvent.press(submitButton)
      await waitFor(() => expect(screen.queryByText('common.new')).toBeNull())
      expect(submitButton).toBeDisabled()
      expect(spinners()).toHaveLength(1)

      await act(async () => resolve(assignment({id: 'new'})))
      await submitted
    })

    it('keeps what was typed when the form is cancelled', async () => {
      await renderScreen()
      await openCreateForm('TRI-0001')
      await fireEvent.changeText(titleInput(), 'Draft')

      await fireEvent.press(screen.getByText('common.cancel'))
      expect(screen.queryByPlaceholderText('assignments.titlePlaceholder')).toBeNull()

      await fireEvent.press(fab())
      expect(titleInput()).toHaveDisplayValue('Draft')
    })

    it('closes the form with its close button', async () => {
      await renderScreen()
      await openCreateForm('TRI-0001')

      await fireEvent.press(closeButtons()[0])

      expect(screen.queryByPlaceholderText('assignments.titlePlaceholder')).toBeNull()
    })
  })
})
