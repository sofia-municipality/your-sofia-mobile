import React from 'react'
import {render, screen} from '@testing-library/react-native'
import TabLayout, {unstable_settings} from '../../../app/(tabs)/_layout'

type ScreenOptions = {
  href?: string | null
  title?: string
  tabBarLabel?: string
  tabBarBadge?: number
  headerShown?: boolean
  tabBarIcon?: (props: {color: string}) => React.ReactElement
  headerTitle?: () => React.ReactElement
}

const mockScreens: Record<string, ScreenOptions> = {}
let mockTabsProps: {
  backBehavior: string
  screenOptions: {
    tabBarStyle: {paddingBottom: number; height: number}
    lazy: boolean
  }
}

jest.mock('expo-router', () => {
  const Tabs = (props: {children: React.ReactNode}) => {
    mockTabsProps = props as unknown as typeof mockTabsProps
    return props.children
  }
  Tabs.Screen = function Screen(props: {name: string; options: ScreenOptions}) {
    mockScreens[props.name] = props.options
    return null
  }
  return {Tabs}
})

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

let mockInsets = {top: 0, right: 0, bottom: 0, left: 0}

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}))

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  const icons: Record<string, unknown> = {}
  return new Proxy(icons, {
    get: (target, name: string) => {
      if (name === '__esModule') return false
      target[name] ??= (props: object) => <View testID={`icon-${name}`} {...props} />
      return target[name]
    },
  })
})

jest.mock('../../../components/TabHeader', () => {
  const {Text} = require('react-native')
  return {
    TabHeader: (props: {title: string; showActionIcon?: boolean; ActionIcon?: {name?: string}}) => (
      <Text testID="tab-header" {...props}>
        {props.title}
      </Text>
    ),
  }
})

type MockUser = {role: string}

let mockAuth: {
  isAdmin: boolean
  isContainerAdmin: boolean
  isAuthenticated: boolean
  user: MockUser | null
} = {isAdmin: false, isContainerAdmin: false, isAuthenticated: false, user: null}

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

let mockClosedSignalsCount = 0

jest.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({closedSignalsCount: mockClosedSignalsCount}),
}))

function signedInAs(role: string) {
  mockAuth = {
    isAdmin: role === 'admin',
    isContainerAdmin: role === 'containerAdmin' || role === 'admin',
    isAuthenticated: true,
    user: {role},
  }
}

async function renderLayout() {
  await render(<TabLayout />)
  return mockScreens
}

beforeEach(() => {
  for (const key of Object.keys(mockScreens)) delete mockScreens[key]
  mockAuth = {isAdmin: false, isContainerAdmin: false, isAuthenticated: false, user: null}
  mockClosedSignalsCount = 0
  mockInsets = {top: 0, right: 0, bottom: 0, left: 0}
})

describe('TabLayout', () => {
  it('anchors the tabs on the home screen', () => {
    expect(unstable_settings).toEqual({anchor: 'home'})
  })

  it('registers every tab in display order', async () => {
    const screens = await renderLayout()

    expect(Object.keys(screens)).toEqual([
      'home',
      'maps',
      'new',
      'signals',
      'missions',
      'assignments',
      'services',
      'payments',
      'profile',
      'metrics',
      'notifications',
    ])
  })

  it('goes back through tab history and mounts every tab up front', async () => {
    await renderLayout()

    expect(mockTabsProps.backBehavior).toBe('history')
    expect(mockTabsProps.screenOptions.lazy).toBe(false)
  })

  it('keeps a minimum bottom padding on devices without a home indicator', async () => {
    await renderLayout()

    expect(mockTabsProps.screenOptions.tabBarStyle).toMatchObject({paddingBottom: 8, height: 72})
  })

  it('pads the tab bar above the home indicator', async () => {
    mockInsets = {...mockInsets, bottom: 34}

    await renderLayout()

    expect(mockTabsProps.screenOptions.tabBarStyle).toMatchObject({paddingBottom: 34, height: 98})
  })

  it.each(['services', 'payments', 'profile', 'notifications'])(
    'hides the "%s" tab from the tab bar',
    async (name) => {
      signedInAs('admin')

      const screens = await renderLayout()

      expect(screens[name].href).toBeNull()
    }
  )

  it.each(['home', 'maps', 'signals', 'metrics'])('always shows the "%s" tab', async (name) => {
    const screens = await renderLayout()

    expect(screens[name].href).toBeUndefined()
  })

  describe('"new" tab', () => {
    it('is hidden from signed-out users', async () => {
      const screens = await renderLayout()

      expect(screens.new.href).toBeNull()
    })

    it.each(['admin', 'containerAdmin', 'fountainAdmin', 'inspector'])(
      'is shown to a signed-in %s',
      async (role) => {
        signedInAs(role)

        const screens = await renderLayout()

        expect(screens.new.href).toBe('/new')
      }
    )

    it.each(['user', 'wasteCollector', 'infrastructureAdmin'])(
      'is hidden from a signed-in %s',
      async (role) => {
        signedInAs(role)

        const screens = await renderLayout()

        expect(screens.new.href).toBeNull()
      }
    )

    it('is hidden when the session has expired', async () => {
      mockAuth = {
        isAdmin: true,
        isContainerAdmin: true,
        isAuthenticated: false,
        user: {role: 'admin'},
      }

      const screens = await renderLayout()

      expect(screens.new.href).toBeNull()
    })
  })

  describe('"missions" tab', () => {
    it('is shown to a signed-in admin', async () => {
      signedInAs('admin')

      const screens = await renderLayout()

      expect(screens.missions.href).toBe('/missions')
    })

    it.each(['user', 'containerAdmin', 'inspector'])('is hidden from a %s', async (role) => {
      signedInAs(role)

      const screens = await renderLayout()

      expect(screens.missions.href).toBeNull()
    })

    it('is hidden from an admin whose session has expired', async () => {
      mockAuth = {
        isAdmin: true,
        isContainerAdmin: true,
        isAuthenticated: false,
        user: {role: 'admin'},
      }

      const screens = await renderLayout()

      expect(screens.missions.href).toBeNull()
    })
  })

  describe('"assignments" tab', () => {
    it.each(['admin', 'containerAdmin'])('is shown to a signed-in %s', async (role) => {
      signedInAs(role)

      const screens = await renderLayout()

      expect(screens.assignments.href).toBe('/assignments')
    })

    it.each(['user', 'inspector', 'fountainAdmin'])('is hidden from a %s', async (role) => {
      signedInAs(role)

      const screens = await renderLayout()

      expect(screens.assignments.href).toBeNull()
    })

    it('is hidden from a container admin whose session has expired', async () => {
      mockAuth = {
        isAdmin: false,
        isContainerAdmin: true,
        isAuthenticated: false,
        user: {role: 'containerAdmin'},
      }

      const screens = await renderLayout()

      expect(screens.assignments.href).toBeNull()
    })
  })

  describe('signals badge', () => {
    it('shows the number of closed signals', async () => {
      mockClosedSignalsCount = 3

      const screens = await renderLayout()

      expect(screens.signals.tabBarBadge).toBe(3)
    })

    it('is hidden when no signal was closed', async () => {
      const screens = await renderLayout()

      expect(screens.signals.tabBarBadge).toBeUndefined()
    })
  })

  it.each([
    ['home', 'common.home'],
    ['maps', 'common.map'],
    ['new', 'common.new'],
    ['signals', 'common.signals'],
    ['missions', 'missions.title'],
    ['assignments', 'assignments.title'],
    ['metrics', 'metrics.title'],
  ])('labels the "%s" tab with "%s"', async (name, label) => {
    const screens = await renderLayout()

    expect(screens[name]).toMatchObject({title: label, tabBarLabel: label})
  })

  it.each([
    ['home', 'Home'],
    ['maps', 'MapPin'],
    ['new', 'MapPlus'],
    ['signals', 'AlertTriangle'],
    ['missions', 'Swords'],
    ['assignments', 'ClipboardList'],
    ['services', 'FileText'],
    ['payments', 'CreditCard'],
    ['profile', 'User'],
    ['metrics', 'ChartNoAxesCombined'],
    ['notifications', 'Bell'],
  ])('gives the "%s" tab the %s icon in the tint color', async (name, icon) => {
    const screens = await renderLayout()

    await render(screens[name].tabBarIcon!({color: '#123456'}))

    expect(screen.getByTestId(`icon-${icon}`).props).toMatchObject({size: 24, color: '#123456'})
  })

  it.each(['new', 'missions', 'notifications'])(
    'lets the "%s" stack draw its own header',
    async (name) => {
      const screens = await renderLayout()

      expect(screens[name].headerShown).toBe(false)
      expect(screens[name].headerTitle).toBeUndefined()
    }
  )

  it.each([
    ['home', 'common.newsForYou', true],
    ['maps', 'common.map', false],
    ['signals', 'signals.title', false],
    ['assignments', 'assignments.title', false],
    ['services', 'common.cityService', false],
    ['payments', 'common.payments', true],
    ['profile', 'common.profile', true],
    ['metrics', 'metrics.title', false],
  ])('titles the "%s" header "%s"', async (name, title, showsAction) => {
    const screens = await renderLayout()

    await render(screens[name].headerTitle!())

    const header = screen.getByTestId('tab-header')
    expect(header).toHaveTextContent(title)
    expect(Boolean(header.props.showActionIcon)).toBe(showsAction)
  })

  it('shows the default bell action only on the home header', async () => {
    const screens = await renderLayout()

    await render(screens.home.headerTitle!())

    expect(screen.getByTestId('tab-header').props.ActionIcon).toBeUndefined()
  })
})
