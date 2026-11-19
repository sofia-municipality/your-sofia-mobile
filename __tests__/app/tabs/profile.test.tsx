import React from 'react'
import {Alert, Linking} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import ProfileScreen from '../../../app/(tabs)/profile'
import {fetchSignalStats} from '../../../lib/payload'
import {getUniqueReporterId} from '../../../lib/deviceId'
import {useAuth} from '../../../contexts/AuthContext'
import {useNotifications} from '../../../hooks/useNotifications'
import en from '../../../translations/en'
import bg from '../../../translations/bg'

const mockPush = jest.fn()
let mockLanguage = 'bg'
let mockRefocus: (() => void) | undefined
const mockUsedKeys = new Set<string>()

jest.mock('expo-router', () => {
  const {useEffect} = require('react')
  return {
    useRouter: () => ({push: mockPush}),
    // Like the real hook: runs while focused and again whenever the callback changes.
    useFocusEffect: (effect: () => void) =>
      useEffect(() => {
        mockRefocus = effect
        effect()
      }, [effect]),
  }
})

jest.mock('react-i18next', () => {
  const t = (key: string) => {
    mockUsedKeys.add(key)
    return key
  }
  return {useTranslation: () => ({t, i18n: {language: mockLanguage}})}
})

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {expoConfig: {version: '1.2.3'}},
}))

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  const icons: Record<string, unknown> = {}
  return new Proxy(
    {__esModule: true},
    {
      get(target: Record<string, unknown>, name: string) {
        if (name in target) return target[name]
        icons[name] ??= () => <View testID={`icon-${name}`} />
        return icons[name]
      },
    }
  )
})

jest.mock('../../../components/EnvironmentSwitcher', () => ({EnvironmentSwitcher: () => null}))
jest.mock('../../../components/LanguageSwitch', () => ({LanguageSwitch: () => null}))
jest.mock('../../../components/GitHubIcon', () => ({GitHubIcon: () => null}))
jest.mock('../../../lib/payload', () => ({fetchSignalStats: jest.fn()}))
jest.mock('../../../lib/deviceId', () => ({getUniqueReporterId: jest.fn()}))
jest.mock('../../../contexts/AuthContext', () => ({useAuth: jest.fn()}))
jest.mock('../../../hooks/useNotifications', () => ({useNotifications: jest.fn()}))

const mockStats = fetchSignalStats as jest.Mock
const mockUseAuth = useAuth as jest.Mock
const mockUseNotifications = useNotifications as jest.Mock

const auth = {
  logout: jest.fn(),
  deleteAccount: jest.fn(),
  refreshUser: jest.fn(),
}

const CITIZEN = {
  user: {id: 1, name: 'Maria Ivanova', email: 'maria@example.com', darPoints: 120},
  isAuthenticated: true,
}

let alertSpy: jest.SpyInstance
let openURL: jest.SpyInstance

type Auth = {
  user?: object | null
  isAuthenticated?: boolean
  isContainerAdmin?: boolean
  isFountainAdmin?: boolean
  isAdmin?: boolean
}

async function renderScreen(state: Auth = {}) {
  mockUseAuth.mockReturnValue({
    user: null,
    isAuthenticated: false,
    isContainerAdmin: false,
    isFountainAdmin: false,
    isAdmin: false,
    ...auth,
    ...state,
  })
  await render(<ProfileScreen />)
  await waitFor(() => expect(mockStats).toHaveBeenCalled())
}

/** The three numbers of the stats card: created, active, darPoints. */
async function statNumbers() {
  const labels = [
    'profile.stats.signalsCreated',
    'profile.stats.signalsActive',
    'profile.stats.darPoints',
  ]
  return labels.map((label) => {
    const card = screen.getByText(label).parent!
    return (card.children[0] as any).children.join('')
  })
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', {name}))

function lastAlert() {
  const calls = alertSpy.mock.calls
  return calls[calls.length - 1] as [string, string, {text: string; onPress?: () => unknown}[]?]
}

function forgetMeModal() {
  return screen.container.queryAll(
    (node) => node.props.onRequestClose !== undefined && node.props.visible !== undefined
  )[0]
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLanguage = 'bg'
    ;(getUniqueReporterId as jest.Mock).mockResolvedValue('device-1')
    mockStats.mockResolvedValue({total: 7, active: 2})
    mockUseNotifications.mockReturnValue({
      expoPushToken: 'ExponentPushToken[abc]',
      registerAndSendToken: jest.fn().mockResolvedValue(undefined),
    })
    auth.deleteAccount.mockResolvedValue(undefined)
    auth.refreshUser.mockResolvedValue(undefined)
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('signed out', () => {
    it('shows an anonymous profile with log in and register', async () => {
      await renderScreen()

      expect(screen.getByText('Анонимен Потребител')).toBeOnTheScreen()
      expect(screen.getByText('auth.notAuthenticated')).toBeOnTheScreen()
      expect(screen.getByText('auth.loginToAccess')).toBeOnTheScreen()
      expect(screen.queryByTestId('icon-Shield')).toBeNull()
      expect(screen.queryByRole('button', {name: 'auth.logout'})).toBeNull()
      expect(screen.queryByRole('button', {name: 'auth.forgetMe'})).toBeNull()
    })

    it('opens the log in screen', async () => {
      await renderScreen()

      await press('auth.login')

      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })

    it('opens the register screen', async () => {
      await renderScreen()

      await press('auth.register')

      expect(mockPush).toHaveBeenCalledWith('/auth/register')
    })
  })

  describe('signed in', () => {
    it('shows the name, email and a verified badge', async () => {
      await renderScreen(CITIZEN)

      expect(screen.getByText('Maria Ivanova')).toBeOnTheScreen()
      expect(screen.getByText('maria@example.com')).toBeOnTheScreen()
      expect(screen.getByText('common.verifiedCitizen')).toBeOnTheScreen()
      expect(screen.getByTestId('icon-Shield')).toBeOnTheScreen()
      expect(screen.queryByRole('button', {name: 'auth.login'})).toBeNull()
    })

    it('falls back to the email when the user has no name', async () => {
      await renderScreen({...CITIZEN, user: {email: 'maria@example.com'}})

      expect(screen.getAllByText('maria@example.com')).toHaveLength(2)
    })

    it.each([
      [{isContainerAdmin: true}, 'auth.containerAdmin'],
      [{isFountainAdmin: true}, 'auth.fountainAdmin'],
      [{isContainerAdmin: true, isFountainAdmin: true}, 'auth.containerAdmin'],
    ])('shows the admin role %j', async (roles, label) => {
      await renderScreen({...CITIZEN, ...roles})

      expect(screen.getByText(label)).toBeOnTheScreen()
      expect(screen.queryByText('common.verifiedCitizen')).toBeNull()
    })

    it('logs out', async () => {
      await renderScreen(CITIZEN)

      await press('auth.logout')

      expect(auth.logout).toHaveBeenCalledTimes(1)
    })
  })

  describe('stats', () => {
    it('shows dashes until the stats of this device arrive', async () => {
      mockStats.mockReturnValue(new Promise(() => {}))
      await renderScreen(CITIZEN)

      expect(mockStats).toHaveBeenCalledWith('device-1')
      expect(await statNumbers()).toEqual(['-', '-', '120'])
    })

    it('shows the created and active signals and the points', async () => {
      await renderScreen(CITIZEN)

      await waitFor(async () => expect(await statNumbers()).toEqual(['7', '2', '120']))
    })

    // BUG: opening the screen loads the stats three times and refreshes the user once.
    // profile.tsx:126-132 loads them when the device id arrives; the language effect (134-140)
    // fires again because deviceId changed; and the focus callback (143-157) changes identity
    // with deviceId, so it re-runs after its "skip the first focus" flag was already used up,
    // loading the stats a third time and calling refreshUser.
    it.failing('requests the stats only once when the screen opens', async () => {
      await renderScreen(CITIZEN)
      await waitFor(async () => expect(await statNumbers()).toEqual(['7', '2', '120']))

      expect(mockStats).toHaveBeenCalledTimes(1)
      expect(auth.refreshUser).not.toHaveBeenCalled()
    })

    it('shows zero points for a user without points or a session', async () => {
      await renderScreen()

      await waitFor(async () => expect(await statNumbers()).toEqual(['7', '2', '0']))
    })

    it('shows zeros when the stats cannot be loaded', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      mockStats.mockRejectedValue(new Error('offline'))
      await renderScreen()

      await waitFor(async () => expect(await statNumbers()).toEqual(['0', '0', '0']))
    })

    it('reloads the stats when the language changes', async () => {
      await renderScreen(CITIZEN)
      await waitFor(async () => expect(await statNumbers()).toEqual(['7', '2', '120']))
      const callsBefore = mockStats.mock.calls.length

      mockStats.mockResolvedValue({total: 8, active: 3})
      mockLanguage = 'en'
      await screen.rerender(<ProfileScreen />)

      await waitFor(async () => expect(await statNumbers()).toEqual(['8', '3', '120']))
      expect(mockStats).toHaveBeenCalledTimes(callsBefore + 1)
    })

    it('reloads the stats and the points when the tab is opened again', async () => {
      await renderScreen(CITIZEN)
      await waitFor(async () => expect(await statNumbers()).toEqual(['7', '2', '120']))
      const statsBefore = mockStats.mock.calls.length
      const refreshesBefore = auth.refreshUser.mock.calls.length

      mockStats.mockResolvedValue({total: 9, active: 1})
      await act(async () => mockRefocus!())

      await waitFor(async () => expect(await statNumbers()).toEqual(['9', '1', '120']))
      expect(mockStats).toHaveBeenCalledTimes(statsBefore + 1)
      expect(auth.refreshUser).toHaveBeenCalledTimes(refreshesBefore + 1)
    })

    it('does not refresh the user of a signed-out visitor', async () => {
      await renderScreen()

      await act(async () => mockRefocus!())

      expect(auth.refreshUser).not.toHaveBeenCalled()
    })
  })

  describe('menu', () => {
    it('opens the notification settings', async () => {
      await renderScreen()

      await press('profile.notificationSettings')

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/notifications')
    })

    it('opens the GitHub issues for technical problems', async () => {
      await renderScreen()

      await press('profile.technicalIssues')

      expect(openURL).toHaveBeenCalledWith(
        'https://github.com/sofia-municipality/your-sofia-mobile/issues'
      )
    })

    it('opens the municipal call centre to contact us', async () => {
      await renderScreen()

      await press('profile.contactUs')

      expect(openURL).toHaveBeenCalledWith('https://call.sofia.bg')
    })

    it('shows the app version', async () => {
      await renderScreen()

      expect(screen.getByText('Твоята София v1.2.3')).toBeOnTheScreen()
      expect(screen.getByText('common.copyright')).toBeOnTheScreen()
    })
  })

  describe('forget me', () => {
    async function openForgetMe() {
      await renderScreen(CITIZEN)
      await press('auth.forgetMe')
    }

    it('explains what happens before deleting', async () => {
      await openForgetMe()

      expect(screen.getByText('auth.forgetMeTitle')).toBeOnTheScreen()
      expect(screen.getByText('auth.forgetMeMessage')).toBeOnTheScreen()
      expect(auth.deleteAccount).not.toHaveBeenCalled()
    })

    it('closes without deleting', async () => {
      await openForgetMe()

      await press('auth.forgetMeCancel')

      expect(screen.queryByText('auth.forgetMeTitle')).toBeNull()
      expect(auth.deleteAccount).not.toHaveBeenCalled()
    })

    it('closes on the hardware back button', async () => {
      await openForgetMe()

      await fireEvent(forgetMeModal(), 'requestClose')

      expect(screen.queryByText('auth.forgetMeTitle')).toBeNull()
    })

    it('opens the page that explains the deletion', async () => {
      await openForgetMe()

      await fireEvent.press(screen.getByRole('link', {name: 'auth.forgetMeInfo'}))

      expect(openURL).toHaveBeenCalledWith('https://your.sofia.bg/forget-me')
      expect(screen.queryByText('auth.forgetMeTitle')).toBeNull()
    })

    it('asks a second time before deleting', async () => {
      await openForgetMe()

      await press('auth.forgetMeConfirm')

      const [title, message, buttons] = lastAlert()
      expect([title, message]).toEqual([
        'auth.forgetMeAreYouSure',
        'auth.forgetMeAreYouSureMessage',
      ])
      expect(buttons!.map((b) => b.text)).toEqual(['common.no', 'common.yes'])
      expect(auth.deleteAccount).not.toHaveBeenCalled()
    })

    it('deletes the account and returns to the home tab', async () => {
      await openForgetMe()
      await press('auth.forgetMeConfirm')

      await act(async () => {
        await lastAlert()[2]![1].onPress!()
      })

      expect(auth.deleteAccount).toHaveBeenCalledTimes(1)
      expect(screen.queryByText('auth.forgetMeTitle')).toBeNull()
      const [title, message, buttons] = lastAlert()
      expect([title, message]).toEqual(['common.success', 'auth.forgetMeSuccess'])

      buttons![0].onPress!()
      expect(mockPush).toHaveBeenCalledWith('/(tabs)')
    })

    it('keeps the dialog open and explains when the deletion fails', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {})
      auth.deleteAccount.mockRejectedValue(new Error('Network down'))
      await openForgetMe()
      await press('auth.forgetMeConfirm')

      await act(async () => {
        await lastAlert()[2]![1].onPress!()
      })

      expect(alertSpy).toHaveBeenLastCalledWith('common.error', 'auth.forgetMeFailed: Network down')
      expect(screen.getByText('auth.forgetMeTitle')).toBeOnTheScreen()
      expect(screen.getByRole('button', {name: 'auth.forgetMeConfirm'})).toBeEnabled()
    })

    it('cannot be closed while the account is being deleted', async () => {
      let finish!: () => void
      auth.deleteAccount.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)))
      await openForgetMe()
      await press('auth.forgetMeConfirm')

      let deleted!: Promise<unknown>
      await act(async () => {
        deleted = lastAlert()[2]![1].onPress!() as Promise<unknown>
      })

      expect(screen.getByText('common.loading')).toBeOnTheScreen()
      expect(screen.getByRole('button', {name: 'auth.forgetMeConfirm'})).toBeDisabled()
      expect(screen.getByRole('button', {name: 'auth.forgetMeCancel'})).toBeDisabled()
      expect(screen.getByRole('link', {name: 'auth.forgetMeInfo'})).toBeDisabled()
      await fireEvent(forgetMeModal(), 'requestClose')
      expect(screen.getByText('auth.forgetMeTitle')).toBeOnTheScreen()

      await act(async () => {
        finish()
        await deleted
      })
      expect(screen.queryByText('auth.forgetMeTitle')).toBeNull()
    })
  })

  describe('push token (admins only)', () => {
    it('is hidden from other users', async () => {
      await renderScreen(CITIZEN)

      expect(screen.queryByText('Push Token')).toBeNull()
      expect(screen.queryByText('Register Token')).toBeNull()
    })

    it('shows the token of the device', async () => {
      await renderScreen({...CITIZEN, isAdmin: true})

      expect(screen.getByText('ExponentPushToken[abc]')).toBeOnTheScreen()
    })

    it('shows a dash when the device has no token', async () => {
      mockUseNotifications.mockReturnValue({expoPushToken: null, registerAndSendToken: jest.fn()})
      await renderScreen({...CITIZEN, isAdmin: true})

      expect(screen.getByText('—')).toBeOnTheScreen()
    })

    it('registers the token and blocks double taps meanwhile', async () => {
      let finish!: () => void
      const registerAndSendToken = jest.fn(() => new Promise<void>((resolve) => (finish = resolve)))
      mockUseNotifications.mockReturnValue({expoPushToken: 'tok', registerAndSendToken})
      await renderScreen({...CITIZEN, isAdmin: true})

      const registered = fireEvent.press(screen.getByText('Register Token'))

      await waitFor(() => expect(screen.getByText('…')).toBeDisabled())
      await act(async () => finish())
      await registered

      expect(registerAndSendToken).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Register Token')).toBeEnabled()
    })
  })

  // Runs last: checks every key the tests above passed to t().
  it('has an English and a Bulgarian text for every key it uses', () => {
    const lookup = (dict: object, key: string) =>
      key.split('.').reduce<any>((node, part) => node?.[part], dict)
    const missing = [...mockUsedKeys].filter(
      (key) => typeof lookup(en, key) !== 'string' || typeof lookup(bg, key) !== 'string'
    )

    expect(mockUsedKeys.size).toBeGreaterThan(30)
    expect(missing).toEqual([])
  })
})
