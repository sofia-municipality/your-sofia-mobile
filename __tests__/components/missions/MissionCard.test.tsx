import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {MissionCard} from '../../../components/missions/MissionCard'
import type {Mission, MissionStatus} from '../../../types/mission'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: {count?: number}) =>
      options?.count !== undefined ? `${options.count} ${key}` : key,
  }),
}))

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {
    Lock: () => <View testID="icon-Lock" />,
    Gem: () => <View testID="icon-Gem" />,
  }
})

const mission: Mission = {
  id: 'm-1',
  signal: {id: 1},
  title: 'Clean the playground',
  description: 'Pick up litter around the sandbox',
  level: 'good-first-mission',
  status: 'open',
  pointsReward: 20,
  generalInstructions: 'Wear gloves',
  tasks: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('MissionCard', () => {
  describe('content', () => {
    it('renders title, description, level, reward and status', async () => {
      await render(<MissionCard mission={mission} onPress={jest.fn()} />)

      expect(screen.getByText('Clean the playground')).toBeOnTheScreen()
      expect(screen.getByText('Pick up litter around the sandbox')).toBeOnTheScreen()
      expect(screen.getByText('missions.levels.goodFirstMission')).toBeOnTheScreen()
      expect(screen.getByText('+20 missions.darPoints')).toBeOnTheScreen()
      expect(screen.getByText('missions.status.open')).toBeOnTheScreen()
    })

    it('omits the description when it is missing', async () => {
      await render(
        <MissionCard mission={{...mission, description: undefined}} onPress={jest.fn()} />
      )

      expect(screen.queryByText('Pick up litter around the sandbox')).not.toBeOnTheScreen()
    })

    it.each([
      ['draft', 'missions.status.draft', '#7A88B8'],
      ['open', 'missions.status.open', '#00E5FF'],
      ['in_progress', 'missions.status.inProgress', '#FFD84D'],
      ['ready_for_review', 'missions.status.readyForReview', '#7C4DFF'],
      ['returned_for_improvement', 'missions.status.returnedForImprovement', '#FF3366'],
      ['completed', 'missions.status.completed', '#39FF88'],
      ['cancelled', 'missions.status.cancelled', '#7A88B8'],
    ] as const)('shows status "%s" as "%s" in %s', async (status, label, color) => {
      await render(<MissionCard mission={{...mission, status}} onPress={jest.fn()} />)

      expect(screen.getByText(label)).toHaveStyle({color})
    })

    it('falls back to the raw status and primary color for unknown statuses', async () => {
      await render(
        <MissionCard
          mission={{...mission, status: 'archived' as MissionStatus}}
          onPress={jest.fn()}
        />
      )

      expect(screen.getByText('archived')).toHaveStyle({color: '#00E5FF'})
    })
  })

  describe('unlocked', () => {
    it('calls onPress when pressed', async () => {
      const onPress = jest.fn()
      await render(<MissionCard mission={mission} onPress={onPress} />)

      await fireEvent.press(screen.getByText('Clean the playground'))

      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('shows a status dot instead of a lock', async () => {
      await render(<MissionCard mission={mission} onPress={jest.fn()} />)

      expect(screen.queryByTestId('icon-Lock')).not.toBeOnTheScreen()
      expect(screen.root).toBeEnabled()
    })

    it('ignores the unlock requirement', async () => {
      await render(
        <MissionCard
          mission={{...mission, unlockRequirement: 'Complete 3 missions'}}
          onPress={jest.fn()}
        />
      )

      expect(screen.queryByText('Complete 3 missions')).not.toBeOnTheScreen()
    })
  })

  describe('locked', () => {
    const lockedMission: Mission = {
      ...mission,
      locked: true,
      unlockRequirement: 'Complete 3 missions',
    }

    it('is disabled and does not call onPress', async () => {
      const onPress = jest.fn()
      await render(<MissionCard mission={lockedMission} onPress={onPress} />)

      expect(screen.root).toBeDisabled()
      await fireEvent.press(screen.getByText('Clean the playground'))
      expect(onPress).not.toHaveBeenCalled()
    })

    it('shows a lock icon, dims the card and mutes the title', async () => {
      await render(<MissionCard mission={lockedMission} onPress={jest.fn()} />)

      expect(screen.getByTestId('icon-Lock')).toBeOnTheScreen()
      expect(screen.root).toHaveStyle({opacity: 0.55})
      expect(screen.getByText('Clean the playground')).toHaveStyle({color: '#7A88B8'})
    })

    it('shows the unlock requirement', async () => {
      await render(<MissionCard mission={lockedMission} onPress={jest.fn()} />)

      expect(screen.getByText('Complete 3 missions')).toBeOnTheScreen()
    })

    it('shows no requirement text when none is given', async () => {
      await render(
        <MissionCard
          mission={{...lockedMission, unlockRequirement: undefined}}
          onPress={jest.fn()}
        />
      )

      expect(screen.queryByText('Complete 3 missions')).not.toBeOnTheScreen()
    })
  })
})
