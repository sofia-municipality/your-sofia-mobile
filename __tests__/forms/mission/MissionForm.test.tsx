import React from 'react'
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import {MissionForm} from '../../../forms/mission/MissionForm'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush}),
}))

jest.mock('react-native-maps', () => {
  const {View} = require('react-native')
  return {
    __esModule: true,
    default: (props: object) => <View testID="map-view" {...props} />,
    Marker: (props: object) => <View testID="map-marker" {...props} />,
  }
})

const SELECTED = {backgroundColor: '#EEF2FF'}

const field = (placeholder: string, index = 0) =>
  screen.getAllByPlaceholderText(`missions.form.${placeholder}`)[index]

type Props = Partial<React.ComponentProps<typeof MissionForm>>

async function renderForm(props: Props = {}) {
  const onSubmit = jest.fn().mockResolvedValue(undefined)
  const onCancel = jest.fn()
  await render(<MissionForm onSubmit={onSubmit} onCancel={onCancel} {...props} />)
  return {onSubmit, onCancel}
}

async function fillTask(index: number, prefix: string) {
  await fireEvent.changeText(field('taskTitlePlaceholder', index), `${prefix} title`)
  await fireEvent.changeText(field('taskInstructionsPlaceholder', index), `${prefix} instructions`)
  await fireEvent.changeText(
    field('taskAcceptanceCriteriaPlaceholder', index),
    `${prefix} criteria`
  )
}

async function fillRequired() {
  await fireEvent.changeText(field('titlePlaceholder'), 'Clean the playground')
  await fireEvent.changeText(field('generalInstructionsPlaceholder'), 'Wear gloves')
  await fillTask(0, 'Task 1')
}

async function submit() {
  await fireEvent.press(screen.getByText('missions.form.create'))
}

describe('MissionForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('defaults', () => {
    it('starts as a draft "good first mission" worth 10 points with one task', async () => {
      await renderForm()

      expect(field('titlePlaceholder')).toHaveDisplayValue('')
      expect(field('pointsRewardPlaceholder')).toHaveDisplayValue('10')
      expect(screen.getByText('missions.levels.goodFirstMission').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('missions.status.draft').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('missions.form.task 1')).toBeOnTheScreen()
      expect(screen.queryByText('missions.form.removeTask')).not.toBeOnTheScreen()
    })

    it('requires both photos for a new task', async () => {
      await renderForm()

      expect(screen.getByText('missions.form.requiresBeforePhoto').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('missions.form.requiresAfterPhoto').parent).toHaveStyle(SELECTED)
      expect(screen.queryByText('missions.form.atLeastOnePhotoRequired')).not.toBeOnTheScreen()
    })
  })

  describe('validation', () => {
    it('shows every missing required field', async () => {
      const {onSubmit} = await renderForm()

      await submit()

      expect(await screen.findByText('missions.form.titleRequired')).toBeOnTheScreen()
      expect(screen.getByText('missions.form.generalInstructionsRequired')).toBeOnTheScreen()
      expect(screen.getByText('missions.form.taskTitleRequired')).toBeOnTheScreen()
      expect(screen.getByText('missions.form.taskInstructionsRequired')).toBeOnTheScreen()
      expect(screen.getByText('missions.form.taskAcceptanceCriteriaRequired')).toBeOnTheScreen()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('flags only the invalid task', async () => {
      await renderForm()
      await fillRequired()
      await fireEvent.press(screen.getByText('missions.form.addTask'))

      await submit()

      expect(await screen.findAllByText('missions.form.taskTitleRequired')).toHaveLength(1)
      expect(field('taskTitlePlaceholder', 0)).not.toHaveStyle({borderColor: '#DC2626'})
      expect(field('taskTitlePlaceholder', 1)).toHaveStyle({borderColor: '#DC2626'})
    })

    it('warns when a task requires no photos', async () => {
      await renderForm()

      await fireEvent.press(screen.getByText('missions.form.requiresBeforePhoto'))
      await fireEvent.press(screen.getByText('missions.form.requiresAfterPhoto'))

      expect(screen.getByText('missions.form.atLeastOnePhotoRequired')).toBeOnTheScreen()
    })

    // BUG: the form warns "at least one photo requirement should stay enabled" but the
    // schema doesn't enforce it, so the mission is still submitted with no photo requirement.
    it.failing('blocks submitting a task without any photo requirement', async () => {
      const {onSubmit} = await renderForm()
      await fillRequired()
      await fireEvent.press(screen.getByText('missions.form.requiresBeforePhoto'))
      await fireEvent.press(screen.getByText('missions.form.requiresAfterPhoto'))

      await submit()

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('submitting', () => {
    it('submits the default choices with the entered text', async () => {
      const {onSubmit} = await renderForm()
      await fillRequired()

      await submit()

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0]).toEqual({
        title: 'Clean the playground',
        description: '',
        level: 'good-first-mission',
        status: 'draft',
        pointsReward: 10,
        generalInstructions: 'Wear gloves',
        tasks: [
          {
            title: 'Task 1 title',
            instructions: 'Task 1 instructions',
            acceptanceCriteria: 'Task 1 criteria',
            requiresBeforePhoto: true,
            requiresAfterPhoto: true,
          },
        ],
      })
    })

    it('submits the chosen level, status, description and photo requirements', async () => {
      const {onSubmit} = await renderForm()
      await fillRequired()
      await fireEvent.changeText(field('descriptionPlaceholder'), 'Sandbox area')
      await fireEvent.press(screen.getByText('missions.levels.verifiedGuardian'))
      await fireEvent.press(screen.getByText('missions.status.open'))
      await fireEvent.press(screen.getByText('missions.form.requiresBeforePhoto'))

      await submit()

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        description: 'Sandbox area',
        level: 'verified-guardian',
        status: 'open',
        tasks: [{requiresBeforePhoto: false, requiresAfterPhoto: true}],
      })
      expect(screen.getByText('missions.levels.verifiedGuardian').parent).toHaveStyle(SELECTED)
      expect(screen.getByText('missions.levels.goodFirstMission').parent).not.toHaveStyle(SELECTED)
    })

    // BUG: the points input stores the raw text, but the schema requires a number, so any
    // edit to the reward makes the form fail validation and the mission can't be created.
    it.failing('submits an edited points reward', async () => {
      const {onSubmit} = await renderForm()
      await fillRequired()
      await fireEvent.changeText(field('pointsRewardPlaceholder'), '25')

      await submit()

      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0].pointsReward).toBe(25)
    })

    it('calls onCancel', async () => {
      const {onCancel} = await renderForm()

      await fireEvent.press(screen.getByText('missions.form.cancel'))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('locks the form and shows a spinner while submitting', async () => {
      const {onCancel} = await renderForm({isSubmitting: true})

      expect(screen.queryByText('missions.form.create')).not.toBeOnTheScreen()
      expect(screen.container.queryAll((node) => node.type === 'ActivityIndicator')).toHaveLength(1)
      expect(field('titlePlaceholder').props.editable).toBe(false)
      expect(field('taskTitlePlaceholder').props.editable).toBe(false)
      expect(screen.getByText('missions.form.addTask')).toBeDisabled()
      expect(screen.getByText('missions.status.open')).toBeDisabled()

      await fireEvent.press(screen.getByText('missions.form.cancel'))
      expect(onCancel).not.toHaveBeenCalled()
    })
  })

  describe('tasks', () => {
    it('adds tasks and allows removing them once there is more than one', async () => {
      await renderForm()

      await fireEvent.press(screen.getByText('missions.form.addTask'))

      expect(screen.getByText('missions.form.task 2')).toBeOnTheScreen()
      expect(screen.getAllByText('missions.form.removeTask')).toHaveLength(2)
    })

    it('removes the chosen task and renumbers the rest', async () => {
      const {onSubmit} = await renderForm()
      await fillRequired()
      await fireEvent.press(screen.getByText('missions.form.addTask'))
      await fillTask(1, 'Task 2')
      await fireEvent.press(screen.getByText('missions.form.addTask'))
      await fillTask(2, 'Task 3')

      await fireEvent.press(screen.getAllByText('missions.form.removeTask')[1])

      expect(screen.getByText('missions.form.task 2')).toBeOnTheScreen()
      expect(screen.queryByText('missions.form.task 3')).not.toBeOnTheScreen()
      expect(field('taskTitlePlaceholder', 0)).toHaveDisplayValue('Task 1 title')
      expect(field('taskTitlePlaceholder', 1)).toHaveDisplayValue('Task 3 title')

      await submit()
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
      expect(onSubmit.mock.calls[0][0].tasks).toEqual([
        expect.objectContaining({title: 'Task 1 title'}),
        expect.objectContaining({title: 'Task 3 title'}),
      ])
    })
  })

  describe('linked signal', () => {
    it('is hidden without a signal', async () => {
      await renderForm()

      expect(screen.queryByText('missions.form.linkedSignal')).not.toBeOnTheScreen()
    })

    it('links to the signal details', async () => {
      await renderForm({signalId: '42'})

      expect(screen.getByText('42')).toBeOnTheScreen()
      await fireEvent.press(screen.getByRole('link', {name: 'missions.form.openSignal'}))

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/signals/42')
    })
  })

  describe('linked object', () => {
    it('is hidden without a city object or location', async () => {
      await renderForm()

      expect(screen.queryByText('missions.form.linkedObject')).not.toBeOnTheScreen()
    })

    it('shows the city object name and address', async () => {
      await renderForm({cityObject: {name: 'WC-001'}, location: {address: 'ul. Shipka 1'}})

      expect(screen.getByText('missions.form.linkedObject')).toBeOnTheScreen()
      expect(screen.getByText('WC-001')).toBeOnTheScreen()
      expect(screen.getByText('ul. Shipka 1')).toBeOnTheScreen()
      expect(screen.queryByRole('button', {name: 'common.map'})).not.toBeOnTheScreen()
    })

    it('toggles a map centred on the location', async () => {
      await renderForm({location: {latitude: 42.69, longitude: 23.32}})
      expect(screen.queryByTestId('map-view')).not.toBeOnTheScreen()

      await fireEvent.press(screen.getByRole('button', {name: 'common.map'}))

      const region = {latitude: 42.69, longitude: 23.32, latitudeDelta: 0.01, longitudeDelta: 0.01}
      expect(screen.getByTestId('map-view').props.region).toEqual(region)
      expect(screen.getByTestId('map-marker').props.coordinate).toEqual({
        latitude: 42.69,
        longitude: 23.32,
      })
      expect(screen.getByText('common.close')).toBeOnTheScreen()

      await fireEvent.press(screen.getByRole('button', {name: 'common.map'}))
      expect(screen.queryByTestId('map-view')).not.toBeOnTheScreen()
    })

    it('treats a zero coordinate as a valid location', async () => {
      await renderForm({location: {latitude: 0, longitude: 0}})

      expect(screen.getByRole('button', {name: 'common.map'})).toBeOnTheScreen()
    })

    it('needs both coordinates to show the map', async () => {
      await renderForm({cityObject: {name: 'WC-001'}, location: {latitude: 42.69}})

      expect(screen.queryByRole('button', {name: 'common.map'})).not.toBeOnTheScreen()
    })
  })
})
