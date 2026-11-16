import React from 'react'
import {View} from 'react-native'
import type {LucideIcon} from 'lucide-react-native'
import {fireEvent, render, screen} from '@testing-library/react-native'
import {TabHeader} from '../../components/TabHeader'

const mockClearUnreadCount = jest.fn()
const mockTriggerBellAction = jest.fn()
let mockUnreadCount = 0

jest.mock('../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    unreadCount: mockUnreadCount,
    clearUnreadCount: mockClearUnreadCount,
  }),
}))

jest.mock('../../contexts/BellActionContext', () => ({
  useBellAction: () => ({triggerBellAction: mockTriggerBellAction}),
}))

jest.mock('lucide-react-native', () => {
  const {View: MockView} = require('react-native')
  return {
    Bell: (props: object) => <MockView testID="icon-Bell" {...props} />,
  }
})

const SettingsIcon = ((props: object) => (
  <View testID="icon-Settings" {...props} />
)) as unknown as LucideIcon

describe('TabHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUnreadCount = 0
  })

  it('renders the title', async () => {
    await render(<TabHeader title="Новини" />)

    expect(screen.getByText('Новини')).toBeOnTheScreen()
  })

  it('hides the action button by default', async () => {
    await render(<TabHeader title="Новини" />)

    expect(screen.queryByRole('button')).not.toBeOnTheScreen()
  })

  describe('default bell action', () => {
    it('renders a notifications button without a badge when nothing is unread', async () => {
      await render(<TabHeader title="Новини" showActionIcon />)

      expect(screen.getByRole('button', {name: 'Известия'})).toBeOnTheScreen()
      expect(screen.getByTestId('icon-Bell').props.color).toBe('#94A3B8')
      expect(screen.queryByText('0')).not.toBeOnTheScreen()
    })

    it('shows the unread count in the badge and label', async () => {
      mockUnreadCount = 5
      await render(<TabHeader title="Новини" showActionIcon />)

      expect(screen.getByRole('button', {name: 'Известия, 5 непрочетени'})).toBeOnTheScreen()
      expect(screen.getByText('5')).toBeOnTheScreen()
    })

    it('caps the badge at 99+', async () => {
      mockUnreadCount = 150
      await render(<TabHeader title="Новини" showActionIcon />)

      expect(screen.getByText('99+')).toBeOnTheScreen()
      expect(screen.getByRole('button', {name: 'Известия, 150 непрочетени'})).toBeOnTheScreen()
    })

    it('shows exactly 99 without capping', async () => {
      mockUnreadCount = 99
      await render(<TabHeader title="Новини" showActionIcon />)

      expect(screen.getByText('99')).toBeOnTheScreen()
    })

    it('clears unread notifications and triggers the bell action on press', async () => {
      mockUnreadCount = 3
      await render(<TabHeader title="Новини" showActionIcon />)

      await fireEvent.press(screen.getByRole('button', {name: 'Известия, 3 непрочетени'}))

      expect(mockClearUnreadCount).toHaveBeenCalledTimes(1)
      expect(mockTriggerBellAction).toHaveBeenCalledTimes(1)
    })

    it('prefers a custom onActionPress over the default bell behavior', async () => {
      const onActionPress = jest.fn()
      await render(<TabHeader title="Новини" showActionIcon onActionPress={onActionPress} />)

      await fireEvent.press(screen.getByRole('button', {name: 'Известия'}))

      expect(onActionPress).toHaveBeenCalledTimes(1)
      expect(mockClearUnreadCount).not.toHaveBeenCalled()
      expect(mockTriggerBellAction).not.toHaveBeenCalled()
    })
  })

  describe('custom action icon', () => {
    it('renders the custom icon with a generic label and no badge', async () => {
      mockUnreadCount = 4
      await render(<TabHeader title="Карта" showActionIcon ActionIcon={SettingsIcon} />)

      expect(screen.getByRole('button', {name: 'Действие'})).toBeOnTheScreen()
      expect(screen.getByTestId('icon-Settings')).toBeOnTheScreen()
      expect(screen.queryByTestId('icon-Bell')).not.toBeOnTheScreen()
      expect(screen.queryByText('4')).not.toBeOnTheScreen()
    })

    it('calls onActionPress when pressed', async () => {
      const onActionPress = jest.fn()
      await render(
        <TabHeader
          title="Карта"
          showActionIcon
          ActionIcon={SettingsIcon}
          onActionPress={onActionPress}
        />
      )

      await fireEvent.press(screen.getByRole('button', {name: 'Действие'}))

      expect(onActionPress).toHaveBeenCalledTimes(1)
    })

    it('does nothing on press without onActionPress', async () => {
      await render(<TabHeader title="Карта" showActionIcon ActionIcon={SettingsIcon} />)

      await fireEvent.press(screen.getByRole('button', {name: 'Действие'}))

      expect(mockClearUnreadCount).not.toHaveBeenCalled()
      expect(mockTriggerBellAction).not.toHaveBeenCalled()
    })
  })
})
