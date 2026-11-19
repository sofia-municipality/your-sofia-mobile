import React from 'react'
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import {useFonts} from 'expo-font'
import RootLayout from '../../app/_layout'
import {useFrameworkReady} from '../../hooks/useFrameworkReady'
import {initializeReporterId} from '../../lib/deviceId'

type ScreenOptions = {
  headerTitle: () => React.ReactElement
  headerLeft: () => React.ReactElement
  headerRight: () => React.ReactElement
  [key: string]: unknown
}

const mockPush = jest.fn()
let mockStackOptions: ScreenOptions | undefined
const mockScreens: {name: string; options?: Record<string, unknown>}[] = []

jest.mock('expo-router', () => {
  const {View} = require('react-native')
  const StackMock = ({
    screenOptions,
    children,
  }: {
    screenOptions: ScreenOptions
    children: React.ReactNode
  }) => {
    mockStackOptions = screenOptions
    return <View testID="stack">{children}</View>
  }
  StackMock.Screen = function Screen(props: {name: string; options?: Record<string, unknown>}) {
    mockScreens.push(props)
    return null
  }
  return {Stack: StackMock, useRouter: () => ({push: mockPush})}
})

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('../../i18n', () => ({}))
jest.mock('expo-status-bar', () => ({StatusBar: () => null}))
jest.mock('lucide-react-native', () => ({User: () => null}))
jest.mock('expo-font', () => ({useFonts: jest.fn()}))
jest.mock('@expo-google-fonts/sofia-sans', () => ({}))
jest.mock('@expo-google-fonts/jetbrains-mono', () => ({}))
jest.mock('../../hooks/useFrameworkReady', () => ({useFrameworkReady: jest.fn()}))
jest.mock('../../lib/deviceId', () => ({initializeReporterId: jest.fn()}))

jest.mock('../../contexts/EnvironmentContext', () => {
  const {View} = require('react-native')
  return {
    EnvironmentProvider: ({children}: {children: React.ReactNode}) => (
      <View testID="EnvironmentProvider">{children}</View>
    ),
  }
})
jest.mock('../../components/AppErrorBoundary', () => {
  const {View} = require('react-native')
  return {
    AppErrorBoundary: ({children}: {children: React.ReactNode}) => (
      <View testID="AppErrorBoundary">{children}</View>
    ),
  }
})
jest.mock('../../contexts/AuthContext', () => {
  const {View} = require('react-native')
  return {
    AuthProvider: ({children}: {children: React.ReactNode}) => (
      <View testID="AuthProvider">{children}</View>
    ),
  }
})
jest.mock('../../contexts/NotificationsContext', () => {
  const {View} = require('react-native')
  return {
    NotificationsProvider: ({children}: {children: React.ReactNode}) => (
      <View testID="NotificationsProvider">{children}</View>
    ),
  }
})

const mockUseFonts = useFonts as jest.Mock
const mockInitReporterId = initializeReporterId as jest.Mock

function screenNamed(name: string) {
  return mockScreens.find((s) => s.name === name)
}

describe('RootLayout', () => {
  let logSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockScreens.length = 0
    mockStackOptions = undefined
    mockUseFonts.mockReturnValue([true, null])
    mockInitReporterId.mockResolvedValue('reporter-1')
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('signals that the framework is ready', async () => {
    await render(<RootLayout />)

    expect(useFrameworkReady).toHaveBeenCalled()
  })

  it('loads the app fonts', async () => {
    await render(<RootLayout />)

    expect(Object.keys(mockUseFonts.mock.calls[0][0])).toEqual([
      'SofiaSans_400Regular',
      'SofiaSans_500Medium',
      'SofiaSans_600SemiBold',
      'SofiaSans_700Bold',
      'SofiaSans_800ExtraBold',
      'JetBrainsMono_400Regular',
      'JetBrainsMono_500Medium',
      'JetBrainsMono_600SemiBold',
    ])
  })

  it('shows an empty screen until the fonts are loaded', async () => {
    mockUseFonts.mockReturnValue([false, null])

    await render(<RootLayout />)

    expect(screen.queryByTestId('stack')).toBeNull()
    expect(mockInitReporterId).not.toHaveBeenCalled()
  })

  // BUG: useFonts returns [false, error] when a font fails to load, and the
  // layout only checks the first value, so the app stays on a blank screen
  // forever instead of falling back to the system font.
  it.failing('still starts the app when the fonts fail to load', async () => {
    mockUseFonts.mockReturnValue([false, new Error('Font file is corrupt')])

    await render(<RootLayout />)

    expect(screen.getByTestId('stack')).toBeOnTheScreen()
  })

  it('wraps the navigator in the app providers', async () => {
    await render(<RootLayout />)

    const order = [
      'EnvironmentProvider',
      'AppErrorBoundary',
      'AuthProvider',
      'NotificationsProvider',
    ]
    order.forEach((testID, i) => {
      const inner = order[i + 1] ?? 'stack'
      expect(screen.getByTestId(testID)).toContainElement(screen.getByTestId(inner))
    })
  })

  it('initializes the reporter id on start', async () => {
    await render(<RootLayout />)

    await waitFor(() =>
      expect(logSpy).toHaveBeenCalledWith('Unique Reporter ID initialized:', 'reporter-1')
    )
    expect(mockInitReporterId).toHaveBeenCalledTimes(1)
  })

  it('keeps running when the reporter id cannot be initialized', async () => {
    const failure = new Error('SecureStore unavailable')
    mockInitReporterId.mockRejectedValue(failure)

    await render(<RootLayout />)

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('Failed to initialize reporter ID:', failure)
    )
    expect(screen.getByTestId('stack')).toBeOnTheScreen()
  })

  describe('header', () => {
    it('shows the app name with a BETA badge', async () => {
      await render(<RootLayout />)
      await render(mockStackOptions!.headerTitle())

      expect(screen.getByText('common.header')).toBeOnTheScreen()
      expect(screen.getByText('BETA')).toBeOnTheScreen()
    })

    it('shows the Sofia coat of arms on the left', async () => {
      await render(<RootLayout />)
      await render(mockStackOptions!.headerLeft())

      expect(screen.container.queryAll((n) => n.type === 'Image')).toHaveLength(1)
    })

    it('opens the profile from the button on the right', async () => {
      await render(<RootLayout />)
      await render(mockStackOptions!.headerRight())

      await fireEvent.press(screen.getByLabelText('profile.title'))

      expect(mockPush).toHaveBeenCalledWith('/(tabs)/profile')
    })

    it('is shown with a shadow', async () => {
      await render(<RootLayout />)

      expect(mockStackOptions).toMatchObject({headerShown: true, headerShadowVisible: true})
    })
  })

  describe('screens', () => {
    it('registers the app routes', async () => {
      await render(<RootLayout />)

      expect(mockScreens.map((s) => s.name)).toEqual([
        '(tabs)',
        'auth/login',
        'auth/register',
        'whats-new',
        '+not-found',
      ])
    })

    it.each(['auth/login', 'auth/register'])('gives %s a translated back button', async (name) => {
      await render(<RootLayout />)

      expect(screenNamed(name)?.options).toEqual({
        headerBackTitle: 'common.back',
        headerBackVisible: true,
      })
    })

    it("presents What's New as a headerless sheet", async () => {
      await render(<RootLayout />)

      expect(screenNamed('whats-new')?.options).toEqual({
        headerShown: false,
        presentation: 'transparentModal',
        animation: 'slide_from_bottom',
      })
    })
  })
})
