import React from 'react'
import {render, screen} from '@testing-library/react-native'
import {MissionLevelBadge} from '../../../components/missions/MissionLevelBadge'
import type {MissionLevel} from '../../../types/mission'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

describe('MissionLevelBadge', () => {
  it.each([
    ['good-first-mission', 'missions.levels.goodFirstMission', '#39FF88'],
    ['verified-contributor', 'missions.levels.verifiedContributor', '#00E5FF'],
    ['verified-guardian', 'missions.levels.verifiedGuardian', '#7C4DFF'],
  ] as const)('renders level "%s" as "%s" in %s', async (level, label, color) => {
    await render(<MissionLevelBadge level={level} />)

    const text = screen.getByText(label)
    expect(text).toHaveStyle({color})
    expect(screen.root).toHaveStyle({borderColor: color})
  })

  it('falls back to the primary neon color for an unknown level', async () => {
    await render(<MissionLevelBadge level={'legendary' as MissionLevel} />)

    expect(screen.root).toHaveStyle({borderColor: '#00E5FF'})
  })
})
