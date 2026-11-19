import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import MapsLayout from '../../../../app/(tabs)/maps/_layout'
import MapsIndex from '../../../../app/(tabs)/maps/index'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-router', () => ({
  Stack: {Screen: () => null},
}))

jest.mock('../../../../app/(tabs)/maps/waste-containers', () => {
  const {Pressable, Text} = require('react-native')
  return {
    __esModule: true,
    default: ({onOpenAR}: {onOpenAR: () => void}) => (
      <Pressable onPress={onOpenAR}>
        <Text>waste-containers-screen</Text>
      </Pressable>
    ),
  }
})

jest.mock('../../../../app/(tabs)/maps/ar-view', () => {
  const {Pressable, Text} = require('react-native')
  return {
    __esModule: true,
    default: ({onClose}: {onClose: () => void}) => (
      <Pressable onPress={onClose}>
        <Text>ar-screen</Text>
      </Pressable>
    ),
  }
})

jest.mock('../../../../app/(tabs)/maps/drinking-fountains', () => {
  const {Text} = require('react-native')
  return {__esModule: true, default: () => <Text>fountains-screen</Text>}
})

jest.mock('../../../../app/(tabs)/maps/news', () => {
  const {Text} = require('react-native')
  return {__esModule: true, default: () => <Text>news-screen</Text>}
})

jest.mock('../../../../app/(tabs)/maps/events', () => {
  const {Text} = require('react-native')
  return {__esModule: true, default: () => <Text>events-screen</Text>}
})

jest.mock('../../../../app/(tabs)/maps/bgsmet-view', () => {
  const {Text} = require('react-native')
  return {__esModule: true, default: () => <Text>bgsmet-screen</Text>}
})

jest.mock('../../../../app/(tabs)/maps/transport-bpilot', () => {
  const {Text} = require('react-native')
  return {__esModule: true, default: () => <Text>transport-screen</Text>}
})

const ACTIVE_CHIP = {backgroundColor: '#2F54C5'}

const chip = (label: string) => screen.getByText(label).parent!

const SCREENS = [
  'waste-containers-screen',
  'fountains-screen',
  'news-screen',
  'events-screen',
  'ar-screen',
  'bgsmet-screen',
  'transport-screen',
]

function shownScreens() {
  return SCREENS.filter((name) => screen.queryByText(name) !== null)
}

describe('MapsLayout', () => {
  it('re-exports the layout as the maps index route', () => {
    expect(MapsIndex).toBe(MapsLayout)
  })

  it('offers the four map filters in order', async () => {
    await render(<MapsLayout />)

    const labels = screen
      .getAllByText(/^map\.filters\./)
      .map((node) => node.props.children as string)
    expect(labels).toEqual([
      'map.filters.wasteContainers',
      'map.filters.fountains',
      'map.filters.news',
      'map.filters.events',
    ])
  })

  it('does not offer the disabled BGSMET and transport maps', async () => {
    await render(<MapsLayout />)

    expect(screen.queryByText('map.filters.bgsmetView')).toBeNull()
    expect(screen.queryByText('map.filters.transportBpilot')).toBeNull()
  })

  it('shows the waste-container map first', async () => {
    await render(<MapsLayout />)

    expect(shownScreens()).toEqual(['waste-containers-screen'])
    expect(chip('map.filters.wasteContainers')).toHaveStyle(ACTIVE_CHIP)
    expect(chip('map.filters.fountains')).not.toHaveStyle(ACTIVE_CHIP)
  })

  it.each([
    ['map.filters.fountains', 'fountains-screen'],
    ['map.filters.news', 'news-screen'],
    ['map.filters.events', 'events-screen'],
  ])('switches to the %s map', async (label, screenName) => {
    await render(<MapsLayout />)

    await fireEvent.press(screen.getByText(label))

    expect(shownScreens()).toEqual([screenName])
    expect(chip(label)).toHaveStyle(ACTIVE_CHIP)
    expect(chip('map.filters.wasteContainers')).not.toHaveStyle(ACTIVE_CHIP)
  })

  it('switches back to the waste-container map', async () => {
    await render(<MapsLayout />)
    await fireEvent.press(screen.getByText('map.filters.news'))

    await fireEvent.press(screen.getByText('map.filters.wasteContainers'))

    expect(shownScreens()).toEqual(['waste-containers-screen'])
  })

  it('opens the AR view from the waste-container map and keeps its chip highlighted', async () => {
    await render(<MapsLayout />)

    await fireEvent.press(screen.getByText('waste-containers-screen'))

    expect(shownScreens()).toEqual(['ar-screen'])
    expect(chip('map.filters.wasteContainers')).toHaveStyle(ACTIVE_CHIP)
  })

  it('returns to the waste-container map when the AR view closes', async () => {
    await render(<MapsLayout />)
    await fireEvent.press(screen.getByText('waste-containers-screen'))

    await fireEvent.press(screen.getByText('ar-screen'))

    expect(shownScreens()).toEqual(['waste-containers-screen'])
  })

  it('leaves the AR view when another filter is chosen', async () => {
    await render(<MapsLayout />)
    await fireEvent.press(screen.getByText('waste-containers-screen'))

    await fireEvent.press(screen.getByText('map.filters.events'))

    expect(shownScreens()).toEqual(['events-screen'])
    expect(chip('map.filters.wasteContainers')).not.toHaveStyle(ACTIVE_CHIP)
  })
})
