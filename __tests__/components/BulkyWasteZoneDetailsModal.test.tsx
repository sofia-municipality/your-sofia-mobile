import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {BulkyWasteZoneDetailsModal} from '../../components/BulkyWasteZoneDetailsModal'
import type {BulkyWasteZone} from '../../types/bulkyWasteZone'

const mockTranslations: Record<string, string> = {
  'wasteContainers.collectionDay.1': 'Mon',
  'wasteContainers.collectionDay.3': 'Wed',
  'wasteContainers.collectionDay.5': 'Fri',
}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => mockTranslations[key] ?? key}),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 20, left: 0}),
}))

jest.mock('../../components/BottomSheetBackdrop', () => {
  const {Pressable, View} = require('react-native')
  return {
    BottomSheetBackdrop: ({
      children,
      onPress,
    }: {
      children: React.ReactNode
      onPress: () => void
    }) => (
      <View>
        <Pressable testID="backdrop" onPress={onPress} />
        {children}
      </View>
    ),
  }
})

const zone: BulkyWasteZone = {
  id: 'zone-1',
  name: 'Lozenets zone',
  info: '  Leave items by the curb  ',
  collectionDaysOfWeek: ['5', '1', '3'],
  geometry: {type: 'Polygon', coordinates: []},
}

const NOT_AVAILABLE = 'wasteContainers.bulkyWasteZone.notAvailable'

describe('BulkyWasteZoneDetailsModal', () => {
  it('renders nothing when there is no zone', async () => {
    await render(<BulkyWasteZoneDetailsModal visible zone={null} onClose={jest.fn()} />)

    expect(screen.toJSON()).toBeNull()
  })

  it('renders nothing visible when the modal is hidden', async () => {
    await render(<BulkyWasteZoneDetailsModal visible={false} zone={zone} onClose={jest.fn()} />)

    expect(screen.queryByText('Lozenets zone')).not.toBeOnTheScreen()
  })

  it('shows the zone name and field labels', async () => {
    await render(<BulkyWasteZoneDetailsModal visible zone={zone} onClose={jest.fn()} />)

    expect(screen.getByText('Lozenets zone')).toBeOnTheScreen()
    expect(screen.getByText('wasteContainers.bulkyWasteZone.collectionDays')).toBeOnTheScreen()
    expect(screen.getByText('wasteContainers.bulkyWasteZone.info')).toBeOnTheScreen()
  })

  describe('collection days', () => {
    it('sorts and translates the collection days', async () => {
      await render(<BulkyWasteZoneDetailsModal visible zone={zone} onClose={jest.fn()} />)

      expect(screen.getByText('Mon, Wed, Fri')).toBeOnTheScreen()
    })

    it('sorts days numerically and keeps untranslated days as-is', async () => {
      await render(
        <BulkyWasteZoneDetailsModal
          visible
          zone={{...zone, collectionDaysOfWeek: ['10', '1', '2']}}
          onClose={jest.fn()}
        />
      )

      expect(screen.getByText('Mon, 2, 10')).toBeOnTheScreen()
    })

    it('does not reorder the zone data it was given', async () => {
      const days = ['5', '1', '3']
      await render(
        <BulkyWasteZoneDetailsModal
          visible
          zone={{...zone, collectionDaysOfWeek: days}}
          onClose={jest.fn()}
        />
      )

      expect(days).toEqual(['5', '1', '3'])
    })

    it('shows "not available" when there are no collection days', async () => {
      await render(
        <BulkyWasteZoneDetailsModal
          visible
          zone={{...zone, collectionDaysOfWeek: []}}
          onClose={jest.fn()}
        />
      )

      expect(screen.getByText(NOT_AVAILABLE)).toBeOnTheScreen()
    })
  })

  describe('info', () => {
    it('shows the trimmed info text', async () => {
      await render(<BulkyWasteZoneDetailsModal visible zone={zone} onClose={jest.fn()} />)

      expect(screen.getByText('Leave items by the curb')).toBeOnTheScreen()
    })

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['whitespace-only', '   '],
    ])('shows "not available" when info is %s', async (_label, info) => {
      await render(
        <BulkyWasteZoneDetailsModal visible zone={{...zone, info}} onClose={jest.fn()} />
      )

      expect(screen.getByText(NOT_AVAILABLE)).toBeOnTheScreen()
    })
  })

  describe('closing', () => {
    it('closes via the close button', async () => {
      const onClose = jest.fn()
      await render(<BulkyWasteZoneDetailsModal visible zone={zone} onClose={onClose} />)

      await fireEvent.press(screen.getByRole('button', {name: 'common.close'}))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes when the backdrop is pressed', async () => {
      const onClose = jest.fn()
      await render(<BulkyWasteZoneDetailsModal visible zone={zone} onClose={onClose} />)

      await fireEvent.press(screen.getByTestId('backdrop'))

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('closes on the hardware back button', async () => {
      const onClose = jest.fn()
      await render(<BulkyWasteZoneDetailsModal visible zone={zone} onClose={onClose} />)

      const [modal] = screen.container.queryAll((node) => node.props.onRequestClose !== undefined)
      await fireEvent(modal, 'requestClose')

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('pads the sheet by the bottom safe-area inset', async () => {
    await render(<BulkyWasteZoneDetailsModal visible zone={zone} onClose={jest.fn()} />)

    // title -> header -> sheet
    const sheet = screen.getByText('Lozenets zone').parent!.parent!
    expect(sheet).toHaveStyle({paddingBottom: 20 + 16})
  })
})
