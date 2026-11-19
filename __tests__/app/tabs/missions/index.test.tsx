import React from 'react'
import {act, fireEvent, render, screen} from '@testing-library/react-native'
import MissionsScreen from '../../../../app/(tabs)/missions/index'
import type {Mission} from '../../../../types/mission'

const mockTranslation = {t: (key: string) => key}

jest.mock('react-i18next', () => ({
  useTranslation: () => mockTranslation,
}))

const mockRouter = {push: jest.fn()}
const mockFocusListeners = new Set<() => void>()

// Mirrors expo-router: the effect runs while the screen is focused, again whenever the
// callback changes, and again on every later focus event.
jest.mock('expo-router', () => {
  const {useEffect} = require('react')
  return {
    useRouter: () => mockRouter,
    useFocusEffect: (effect: () => void | (() => void)) => {
      useEffect(() => {
        let cleanup = effect()
        const onFocus = () => {
          if (typeof cleanup === 'function') cleanup()
          cleanup = effect()
        }
        mockFocusListeners.add(onFocus)
        return () => {
          mockFocusListeners.delete(onFocus)
          if (typeof cleanup === 'function') cleanup()
        }
      }, [effect])
    },
  }
})

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {ShieldCheck: () => <View testID="icon-ShieldCheck" />}
})

jest.mock('../../../../components/missions/MissionCard', () => {
  const {Pressable, Text} = require('react-native')
  return {
    MissionCard: ({mission, onPress}: {mission: {title: string}; onPress: () => void}) => (
      <Pressable testID="mission-card" onPress={onPress}>
        <Text>{mission.title}</Text>
      </Pressable>
    ),
  }
})

jest.mock('../../../../components/missions/DarPointsBadge', () => {
  const {Text} = require('react-native')
  return {
    DarPointsBadge: ({amount}: {amount: number}) => <Text testID="dar-points">{amount}</Text>,
  }
})

let mockAuth: {isAuthenticated: boolean; user: {id: number; darPoints?: number} | null}

jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

const mockRefresh = jest.fn()
let mockMissionsState: {missions: Mission[]; loading: boolean; error: string | null}

jest.mock('../../../../hooks/useMissions', () => ({
  useMissions: () => ({...mockMissionsState, refresh: mockRefresh}),
}))

const mission = (overrides: Partial<Mission>): Mission => ({
  id: 'm-1',
  signal: {id: 1},
  title: 'Clean the bins',
  level: 'good-first-mission',
  status: 'open',
  pointsReward: 10,
  generalInstructions: '',
  tasks: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
})

const refocus = () =>
  act(async () => {
    mockFocusListeners.forEach((listener) => listener())
  })

const refreshControl = () =>
  screen.container.queryAll((node) => node.props.refreshControl !== undefined)[0].props
    .refreshControl as React.ReactElement<{refreshing: boolean; onRefresh: () => void}>

/** Section headers and card titles, in screen order. */
const listedTexts = () =>
  screen.container
    .queryAll((node) => node.type === 'Text')
    .map((node) => node.props.children)
    .filter((text) => typeof text === 'string' && !text.startsWith('missions.questBoard'))

beforeEach(() => {
  jest.clearAllMocks()
  mockFocusListeners.clear()
  mockAuth = {isAuthenticated: true, user: {id: 7, darPoints: 120}}
  mockMissionsState = {missions: [], loading: false, error: null}
})

describe('MissionsScreen', () => {
  describe('signed out', () => {
    beforeEach(() => {
      mockAuth = {isAuthenticated: false, user: null}
    })

    it('asks the user to log in', async () => {
      mockMissionsState.missions = [mission({})]

      await render(<MissionsScreen />)

      expect(screen.getByText('missions.loginRequiredTitle')).toBeVisible()
      expect(screen.getByText('missions.loginRequiredBody')).toBeVisible()
      expect(screen.queryByTestId('mission-card')).toBeNull()
    })

    it('opens the login screen', async () => {
      await render(<MissionsScreen />)

      await fireEvent.press(screen.getByText('auth.login'))

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('loads the missions whenever the screen is focused', async () => {
    await render(<MissionsScreen />)
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    await refocus()

    expect(mockRefresh).toHaveBeenCalledTimes(2)
  })

  it('shows the quest board header and the dar points', async () => {
    await render(<MissionsScreen />)

    expect(screen.getByText('missions.questBoard')).toBeVisible()
    expect(screen.getByText('missions.questBoardSubtitle')).toBeVisible()
    expect(screen.getByTestId('dar-points')).toHaveTextContent('120')
  })

  it('shows zero dar points', async () => {
    mockAuth = {isAuthenticated: true, user: {id: 7, darPoints: 0}}

    await render(<MissionsScreen />)

    expect(screen.getByTestId('dar-points')).toHaveTextContent('0')
  })

  it('hides the dar points when the profile has none', async () => {
    mockAuth = {isAuthenticated: true, user: {id: 7}}

    await render(<MissionsScreen />)

    expect(screen.queryByTestId('dar-points')).toBeNull()
  })

  it('links to the verification screen', async () => {
    await render(<MissionsScreen />)

    await fireEvent.press(screen.getByText('missions.verifyMissions'))

    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/missions/verify')
  })

  it('shows a spinner before the first missions arrive', async () => {
    mockMissionsState.loading = true

    await render(<MissionsScreen />)

    expect(screen.container.queryAll((node) => node.type === 'ActivityIndicator')).toHaveLength(1)
    expect(screen.queryByText('missions.noMissionsAvailable')).toBeNull()
  })

  it('keeps the list while reloading', async () => {
    mockMissionsState = {missions: [mission({})], loading: true, error: null}

    await render(<MissionsScreen />)

    expect(screen.getByText('Clean the bins')).toBeVisible()
    expect(refreshControl().props.refreshing).toBe(true)
  })

  it('reloads on pull to refresh', async () => {
    await render(<MissionsScreen />)
    mockRefresh.mockClear()

    await act(async () => refreshControl().props.onRefresh())

    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('says when there are no missions', async () => {
    await render(<MissionsScreen />)

    expect(screen.getByText('missions.noMissionsAvailable')).toBeVisible()
  })

  it("groups the user's missions first, then open missions by level", async () => {
    mockMissionsState.missions = [
      mission({id: 'g1', title: 'Guardian task', level: 'verified-guardian'}),
      mission({id: 'f1', title: 'First task'}),
      mission({id: 'own1', title: 'My claimed task', status: 'in_progress', citizen: {id: 7}}),
      mission({
        id: 'own2',
        title: 'My returned task',
        status: 'returned_for_improvement',
        citizen: 7,
      }),
      mission({id: 'f2', title: 'Second first task'}),
      mission({id: 'x1', title: "Someone else's task", status: 'in_progress', citizen: 8}),
      mission({id: 'done', title: 'Finished task', status: 'completed'}),
    ]

    await render(<MissionsScreen />)

    expect(listedTexts()).toEqual([
      'missions.verifyMissions',
      'missions.myMissions',
      'My claimed task',
      'My returned task',
      'missions.levels.goodFirstMission',
      'First task',
      'Second first task',
      'missions.levels.verifiedGuardian',
      'Guardian task',
    ])
  })

  it('opens a mission', async () => {
    mockMissionsState.missions = [mission({id: 'm-42'})]

    await render(<MissionsScreen />)
    await fireEvent.press(screen.getByTestId('mission-card'))

    expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/missions/m-42')
  })

  // BUG: the screen never reads `error` from useMissions, so a failed load is shown as
  // "no missions available" with no hint that something went wrong.
  it.failing('tells the user when the missions could not be loaded', async () => {
    mockMissionsState.error = 'Network request failed'

    await render(<MissionsScreen />)

    expect(screen.queryByText('missions.noMissionsAvailable')).toBeNull()
    expect(screen.getByText('Network request failed')).toBeVisible()
  })
})
