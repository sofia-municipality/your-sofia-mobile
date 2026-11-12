import React from 'react'
import {Alert, AlertButton} from 'react-native'
import * as Notifications from 'expo-notifications'
import {act, fireEvent, render, screen} from '@testing-library/react-native'
import {EnvironmentSwitcher} from '../../components/EnvironmentSwitcher'
import type {EnvironmentConfig} from '../../lib/environment'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  }),
}))

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
}))

const development: EnvironmentConfig = {
  name: 'development',
  apiUrl: 'http://localhost:3000',
  displayName: 'Development (Local)',
}
const staging: EnvironmentConfig = {
  name: 'staging',
  apiUrl: 'https://staging-your.sofia.bg',
  displayName: 'Staging',
}
const production: EnvironmentConfig = {
  name: 'production',
  apiUrl: 'https://your.sofia.bg',
  displayName: 'Production',
}

const mockSetEnvironment = jest.fn()
let mockCanSwitch = true

jest.mock('../../contexts/EnvironmentContext', () => ({
  useEnvironment: () => ({
    environment: 'development',
    config: development,
    setEnvironment: mockSetEnvironment,
    canSwitch: mockCanSwitch,
    allEnvironments: [development, staging, production],
  }),
}))

const scheduleNotification = Notifications.scheduleNotificationAsync as jest.Mock

describe('EnvironmentSwitcher', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockCanSwitch = true
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  it('renders nothing when switching is not allowed', async () => {
    mockCanSwitch = false
    await render(<EnvironmentSwitcher />)

    expect(screen.toJSON()).toBeNull()
  })

  it('shows the current environment and API URL', async () => {
    await render(<EnvironmentSwitcher />)

    expect(screen.getByText('settings.current: Development (Local)')).toBeOnTheScreen()
    expect(screen.getByText('URL: http://localhost:3000')).toBeOnTheScreen()
  })

  it('renders a button for every environment and highlights the active one', async () => {
    await render(<EnvironmentSwitcher />)

    expect(screen.getByText('Development (Local)').parent).toHaveStyle({
      backgroundColor: '#2F54C5',
    })
    expect(screen.getByText('Staging').parent).toHaveStyle({backgroundColor: '#FFF'})
    expect(screen.getByText('Production')).toBeOnTheScreen()
  })

  describe('switching environments', () => {
    function getConfirmButtons(): AlertButton[] {
      return alertSpy.mock.calls[0][2]
    }

    it('does nothing when the active environment is pressed', async () => {
      await render(<EnvironmentSwitcher />)

      await fireEvent.press(screen.getByText('Development (Local)'))

      expect(alertSpy).not.toHaveBeenCalled()
    })

    it('asks for confirmation before switching', async () => {
      await render(<EnvironmentSwitcher />)

      await fireEvent.press(screen.getByText('Staging'))

      expect(alertSpy).toHaveBeenCalledWith(
        'settings.changeEnvironment',
        'settings.changeEnvironmentWarning:{"env":"staging"}',
        expect.any(Array)
      )
      const [cancel, confirm] = getConfirmButtons()
      expect(cancel).toMatchObject({text: 'common.cancel', style: 'cancel'})
      expect(confirm).toMatchObject({text: 'common.confirm'})
      expect(mockSetEnvironment).not.toHaveBeenCalled()
    })

    it('switches and reports success once confirmed', async () => {
      mockSetEnvironment.mockResolvedValueOnce(undefined)
      await render(<EnvironmentSwitcher />)

      await fireEvent.press(screen.getByText('Production'))
      await act(async () => {
        await getConfirmButtons()[1].onPress?.()
      })

      expect(mockSetEnvironment).toHaveBeenCalledWith('production')
      expect(alertSpy).toHaveBeenLastCalledWith(
        'common.success',
        'settings.environmentChanged:{"env":"production"}'
      )
    })

    it('reports an error when switching fails', async () => {
      mockSetEnvironment.mockRejectedValueOnce(new Error('storage failure'))
      await render(<EnvironmentSwitcher />)

      await fireEvent.press(screen.getByText('Staging'))
      await act(async () => {
        await getConfirmButtons()[1].onPress?.()
      })

      expect(alertSpy).toHaveBeenLastCalledWith('common.error', 'settings.environmentChangeFailed')
    })
  })

  describe('test notifications', () => {
    it('sends a "resolved" signal update for signal #999 by default', async () => {
      await render(<EnvironmentSwitcher />)

      await fireEvent.press(screen.getByText('Signal update'))

      expect(scheduleNotification).toHaveBeenCalledWith({
        content: {
          title: 'Сигналът ви беше приключен',
          body: 'Статус на сигнал #999: resolved',
          data: {type: 'signal-status-update', signalId: '999', status: 'resolved'},
        },
        trigger: null,
      })
    })

    it('uses the trimmed signal ID and selected status', async () => {
      await render(<EnvironmentSwitcher />)

      await fireEvent.changeText(
        screen.getByPlaceholderText('e.g. 507f1f77bcf86cd799439011'),
        '  abc123  '
      )
      await fireEvent.press(screen.getByText('❌ Отхвърлен'))
      await fireEvent.press(screen.getByText('Signal update'))

      expect(scheduleNotification).toHaveBeenCalledWith({
        content: {
          title: 'Сигналът ви беше отхвърлен',
          body: 'Статус на сигнал #abc123: rejected',
          data: {type: 'signal-status-update', signalId: 'abc123', status: 'rejected'},
        },
        trigger: null,
      })
    })

    it('sends an "in progress" signal update when that status is selected', async () => {
      await render(<EnvironmentSwitcher />)

      await fireEvent.press(screen.getByText('🔧 В изпълнение'))
      await fireEvent.press(screen.getByText('Signal update'))

      expect(scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Сигналът ви е в процес на обработка',
            data: {type: 'signal-status-update', signalId: '999', status: 'in-progress'},
          }),
        })
      )
    })

    it('highlights the selected status chip', async () => {
      await render(<EnvironmentSwitcher />)

      expect(screen.getByText('✅ Приключен').parent).toHaveStyle({backgroundColor: '#6366F1'})

      await fireEvent.press(screen.getByText('❌ Отхвърлен'))

      expect(screen.getByText('❌ Отхвърлен').parent).toHaveStyle({backgroundColor: '#6366F1'})
      expect(screen.getByText('✅ Приключен').parent).toHaveStyle({backgroundColor: '#FFF'})
    })

    it('sends a city update notification', async () => {
      await render(<EnvironmentSwitcher />)

      await fireEvent.press(screen.getByText('City update'))

      expect(scheduleNotification).toHaveBeenCalledWith({
        content: {
          title: 'Ново градско съобщение',
          body: 'Тестово съобщение от града.',
          data: {type: 'update'},
        },
        trigger: null,
      })
    })
  })
})
