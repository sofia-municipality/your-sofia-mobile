import React from 'react'
import {fireEvent, render, screen, within} from '@testing-library/react-native'
import {TaskChecklist} from '../../../components/missions/TaskChecklist'
import type {CapturedPhoto} from '../../../components/missions/PhotoCaptureSlot'
import type {MissionTask} from '../../../types/mission'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

// Render the slot as a plain host element so its props can be inspected and
// its onCapture callback fired directly.
jest.mock('../../../components/missions/PhotoCaptureSlot', () => {
  const {View} = require('react-native')
  return {
    PhotoCaptureSlot: (props: {label: string}) => (
      <View testID={`slot-${props.label}`} {...props} />
    ),
  }
})

const BEFORE = 'slot-missions.photoBefore'
const AFTER = 'slot-missions.photoAfter'

const tasks: MissionTask[] = [
  {
    id: 't-1',
    title: 'Collect litter',
    instructions: 'Pick up all visible litter',
    acceptanceCriteria: 'No litter visible in the photo',
    beforePhoto: {id: 1, url: 'https://cdn.test/before-1.jpg'},
    afterPhoto: 42,
    completedByCitizenAt: '2026-01-02T10:00:00Z',
  },
  {
    id: 't-2',
    title: 'Paint the bench',
    instructions: 'Use the provided paint',
    acceptanceCriteria: 'Bench fully painted',
    requiresBeforePhoto: false,
  },
]

const photo: CapturedPhoto = {uri: 'file:///captured.jpg', type: 'image/jpeg', name: 'x.jpg'}

function getTaskCard(title: string) {
  return screen.getByText(title).parent!
}

async function renderChecklist(
  overrides: Partial<React.ComponentProps<typeof TaskChecklist>> = {}
) {
  const onCapturePhoto = jest.fn()
  await render(
    <TaskChecklist
      tasks={tasks}
      editable
      pendingPhotos={{}}
      onCapturePhoto={onCapturePhoto}
      {...overrides}
    />
  )
  return onCapturePhoto
}

describe('TaskChecklist', () => {
  describe('task content', () => {
    it('renders a numbered card for every task', async () => {
      await renderChecklist()

      expect(screen.getByText('1. Collect litter')).toBeOnTheScreen()
      expect(screen.getByText('2. Paint the bench')).toBeOnTheScreen()
    })

    it('shows instructions and acceptance criteria', async () => {
      await renderChecklist()

      expect(screen.getByText('Pick up all visible litter')).toBeOnTheScreen()
      expect(screen.getByText('No litter visible in the photo')).toBeOnTheScreen()
      expect(screen.getAllByText('missions.acceptanceCriteria')).toHaveLength(2)
    })

    it('highlights tasks completed by the citizen', async () => {
      await renderChecklist()

      expect(getTaskCard('1. Collect litter')).toHaveStyle({borderColor: '#39FF88'})
      expect(getTaskCard('2. Paint the bench')).toHaveStyle({borderColor: '#2A3570'})
    })

    it('renders nothing for an empty task list', async () => {
      await renderChecklist({tasks: []})

      expect(screen.queryByText('missions.acceptanceCriteria')).not.toBeOnTheScreen()
    })
  })

  describe('photo slots', () => {
    it('hides photo slots when not editable', async () => {
      await renderChecklist({editable: false})

      expect(screen.queryByTestId(BEFORE)).not.toBeOnTheScreen()
      expect(screen.queryByTestId(AFTER)).not.toBeOnTheScreen()
    })

    it('shows before and after slots when both photos are required', async () => {
      await renderChecklist()

      const card = within(getTaskCard('1. Collect litter'))
      expect(card.getByTestId(BEFORE)).toBeOnTheScreen()
      expect(card.getByTestId(AFTER)).toBeOnTheScreen()
    })

    it('omits the before slot when it is not required', async () => {
      await renderChecklist()

      const card = within(getTaskCard('2. Paint the bench'))
      expect(card.queryByTestId(BEFORE)).not.toBeOnTheScreen()
      expect(card.getByTestId(AFTER)).toBeOnTheScreen()
    })

    it('omits the after slot when it is not required', async () => {
      await renderChecklist({
        tasks: [{...tasks[1], requiresBeforePhoto: true, requiresAfterPhoto: false}],
      })

      expect(screen.getByTestId(BEFORE)).toBeOnTheScreen()
      expect(screen.queryByTestId(AFTER)).not.toBeOnTheScreen()
    })

    it('renders no photo row when neither photo is required', async () => {
      await renderChecklist({
        tasks: [{...tasks[1], requiresBeforePhoto: false, requiresAfterPhoto: false}],
      })

      expect(screen.queryByTestId(BEFORE)).not.toBeOnTheScreen()
      expect(screen.queryByTestId(AFTER)).not.toBeOnTheScreen()
    })

    it('passes populated photo URLs and ignores unpopulated media IDs', async () => {
      await renderChecklist()

      const card = within(getTaskCard('1. Collect litter'))
      expect(card.getByTestId(BEFORE).props.existingPhotoUrl).toBe('https://cdn.test/before-1.jpg')
      expect(card.getByTestId(AFTER).props.existingPhotoUrl).toBeUndefined()
    })

    it('passes pending photos to the matching slot', async () => {
      await renderChecklist({pendingPhotos: {'t-1': {after: photo}}})

      const card = within(getTaskCard('1. Collect litter'))
      expect(card.getByTestId(BEFORE).props.capturedPhoto).toBeUndefined()
      expect(card.getByTestId(AFTER).props.capturedPhoto).toEqual(photo)
    })

    it('marks only the submitting task as uploading', async () => {
      await renderChecklist({submittingTaskId: 't-2'})

      expect(within(getTaskCard('1. Collect litter')).getByTestId(BEFORE).props.uploading).toBe(
        false
      )
      expect(within(getTaskCard('2. Paint the bench')).getByTestId(AFTER).props.uploading).toBe(
        true
      )
    })

    it.each([
      [BEFORE, 'before'],
      [AFTER, 'after'],
    ])('reports a capture from %s with the task id and kind', async (slotId, kind) => {
      const onCapturePhoto = await renderChecklist()

      await fireEvent(
        within(getTaskCard('1. Collect litter')).getByTestId(slotId),
        'capture',
        photo
      )

      expect(onCapturePhoto).toHaveBeenCalledWith('t-1', kind, photo)
    })
  })
})
