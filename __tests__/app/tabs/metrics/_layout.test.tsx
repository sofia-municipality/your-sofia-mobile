import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import MetricsLayout from '../../../../app/(tabs)/metrics/_layout'
import MetricsIndex from '../../../../app/(tabs)/metrics/index'
import {colors} from '../../../../styles/tokens'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('../../../../app/(tabs)/metrics/waste-collection', () => {
  const {Text} = require('react-native')
  return function WasteCollectionDashboard() {
    return <Text>Waste collection dashboard</Text>
  }
})

const BANNER = 'ℹ️ Метриките са активирани тестово само за район Триадица.'

describe('MetricsLayout', () => {
  it('is the metrics tab entry point', () => {
    expect(MetricsIndex).toBe(MetricsLayout)
  })

  it('shows a tab for every dashboard', async () => {
    await render(<MetricsLayout />)

    expect(screen.getByText('metrics.tabWaste')).toBeOnTheScreen()
    expect(screen.getByText('metrics.tabCars')).toBeOnTheScreen()
    expect(screen.getByText('metrics.tabPotholes')).toBeOnTheScreen()
  })

  it('opens the waste collection dashboard with the pilot notice', async () => {
    await render(<MetricsLayout />)

    expect(screen.getByText('Waste collection dashboard')).toBeOnTheScreen()
    expect(screen.getByText(BANNER)).toBeOnTheScreen()
    expect(screen.queryByText('metrics.comingSoonSubtitle')).toBeNull()
  })

  it('highlights the selected tab', async () => {
    await render(<MetricsLayout />)

    expect(screen.getByText('metrics.tabWaste')).toHaveStyle({color: colors.primary})
    expect(screen.getByText('metrics.tabCars')).toHaveStyle({color: colors.textSecondary})
    expect(screen.getByText('metrics.tabWaste').parent).toHaveStyle({
      borderBottomColor: colors.primary,
    })

    await fireEvent.press(screen.getByText('metrics.tabPotholes'))

    // The first match is the tab label, the second the dashboard title.
    expect(screen.getAllByText('metrics.tabPotholes')[0]).toHaveStyle({color: colors.primary})
    expect(screen.getByText('metrics.tabWaste')).toHaveStyle({color: colors.textSecondary})
  })

  it.each([
    ['metrics.tabCars', 'abandoned cars'],
    ['metrics.tabPotholes', 'potholes'],
  ])('shows the coming soon %s dashboard', async (tab) => {
    await render(<MetricsLayout />)

    await fireEvent.press(screen.getByText(tab))

    // The tab label and the dashboard title use the same key.
    expect(screen.getAllByText(tab)).toHaveLength(2)
    expect(screen.getByText('metrics.comingSoonSubtitle')).toBeOnTheScreen()
    expect(screen.queryByText('Waste collection dashboard')).toBeNull()
    expect(screen.queryByText(BANNER)).toBeNull()
  })

  it('goes back to the waste collection dashboard', async () => {
    await render(<MetricsLayout />)
    await fireEvent.press(screen.getByText('metrics.tabPotholes'))

    await fireEvent.press(screen.getByText('metrics.tabWaste'))

    expect(screen.getByText('Waste collection dashboard')).toBeOnTheScreen()
    expect(screen.getByText(BANNER)).toBeOnTheScreen()
  })
})
