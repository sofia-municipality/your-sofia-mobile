import React from 'react'
import {Alert} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import VerifyMissionsScreen from '../../../../app/(tabs)/missions/verify'
import {fetchVerifiableMissions, submitMissionVerification} from '../../../../lib/payload'
import type {Mission} from '../../../../types/mission'

const mockTranslation = {t: (key: string) => key}

jest.mock('react-i18next', () => ({
  useTranslation: () => mockTranslation,
}))

const mockFocusListeners = new Set<() => void>()

// Mirrors expo-router: the effect runs while the screen is focused, again whenever the
// callback changes, and again on every later focus event.
jest.mock('expo-router', () => {
  const {useEffect} = require('react')
  return {
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
  return {
    ThumbsUp: () => <View testID="icon-ThumbsUp" />,
    ThumbsDown: () => <View testID="icon-ThumbsDown" />,
  }
})

jest.mock('../../../../components/missions/MissionLevelBadge', () => {
  const {Text} = require('react-native')
  return {MissionLevelBadge: ({level}: {level: string}) => <Text testID="level">{level}</Text>}
})

jest.mock('../../../../components/missions/DarPointsBadge', () => {
  const {Text} = require('react-native')
  return {DarPointsBadge: ({amount}: {amount: number}) => <Text testID="points">{amount}</Text>}
})

jest.mock('../../../../lib/payload', () => ({
  fetchVerifiableMissions: jest.fn(),
  submitMissionVerification: jest.fn(),
}))

let mockAuth: {token: string | null; user: {id: number} | null}

jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

const mockFetch = fetchVerifiableMissions as jest.Mock
const mockSubmit = submitMissionVerification as jest.Mock

const mission = (overrides: Partial<Mission>): Mission => ({
  id: 'm-1',
  signal: {id: 1},
  title: 'Clean the bins',
  level: 'verified-contributor',
  status: 'ready_for_review',
  pointsReward: 25,
  generalInstructions: '',
  tasks: [],
  citizen: {id: 8},
  missionBeforePhotos: [{url: 'https://cdn.test/before.jpg'}],
  missionAfterPhotos: [{url: 'https://cdn.test/after.jpg'}],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const flush = () => act(() => sleep(0))
const spinners = () => screen.container.queryAll((node) => node.type === 'ActivityIndicator')
const images = () => screen.container.queryAll((node) => node.type === 'Image')
const titles = () => screen.queryAllByText(/task/).map((node) => node.props.children)
const approveButtons = () => screen.getAllByText('missions.approve').map((text) => text.parent!)
const rejectButtons = () => screen.getAllByText('missions.reject').map((text) => text.parent!)

const refocus = () =>
  act(async () => {
    mockFocusListeners.forEach((listener) => listener())
  })

async function renderVerify() {
  await render(<VerifyMissionsScreen />)
  await flush()
}

let alertSpy: jest.SpyInstance
let consoleError: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockFocusListeners.clear()
  mockAuth = {token: 'jwt', user: {id: 7}}
  mockFetch.mockResolvedValue([mission({})])
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  alertSpy.mockRestore()
  consoleError.mockRestore()
})

describe('VerifyMissionsScreen', () => {
  it('shows a spinner while loading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}))

    await render(<VerifyMissionsScreen />)

    expect(spinners()).toHaveLength(1)
  })

  it('loads the missions waiting for verification', async () => {
    await renderVerify()

    expect(mockFetch).toHaveBeenCalledWith('jwt')
    expect(screen.getByText('Clean the bins')).toBeVisible()
    expect(screen.getByTestId('level')).toHaveTextContent('verified-contributor')
    expect(screen.getByTestId('points')).toHaveTextContent('25')
  })

  it('shows the before and after photos', async () => {
    await renderVerify()

    expect(images().map((image) => image.props.source)).toEqual([
      {uri: 'https://cdn.test/before.jpg'},
      {uri: 'https://cdn.test/after.jpg'},
    ])
  })

  it('leaves out missing photos', async () => {
    mockFetch.mockResolvedValue([mission({missionBeforePhotos: [], missionAfterPhotos: [{id: 3}]})])

    await renderVerify()

    expect(images()).toHaveLength(0)
  })

  it("hides the user's own missions", async () => {
    mockFetch.mockResolvedValue([
      mission({id: 'a', title: 'Own task', citizen: {id: 7}}),
      mission({id: 'b', title: 'Own task by id', citizen: 7}),
      mission({id: 'c', title: 'Other task', citizen: 8}),
      mission({id: 'd', title: 'Unclaimed task', citizen: null}),
    ])

    await renderVerify()

    expect(titles()).toEqual(['Other task', 'Unclaimed task'])
  })

  it('says when there is nothing to verify', async () => {
    mockFetch.mockResolvedValue([])

    await renderVerify()

    expect(screen.getByText('missions.noMissionsToVerify')).toBeVisible()
  })

  it('reloads when the user comes back', async () => {
    await renderVerify()

    await refocus()
    await flush()

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  describe('verifying', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue([
        mission({id: 'm-1', title: 'First task'}),
        mission({id: 'm-2', title: 'Second task'}),
      ])
    })

    it.each([
      ['approves', approveButtons, 'approve'],
      ['rejects', rejectButtons, 'reject'],
    ] as const)('%s a mission and removes it from the list', async (_, buttons, decision) => {
      mockSubmit.mockResolvedValue(undefined)
      await renderVerify()

      await fireEvent.press(buttons()[1])

      expect(mockSubmit).toHaveBeenCalledWith('m-2', decision, undefined, 'jwt')
      expect(titles()).toEqual(['First task'])
    })

    it('locks only the mission being verified', async () => {
      let finish: (value: unknown) => void = () => {}
      mockSubmit.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await renderVerify()

      const verifying = fireEvent.press(approveButtons()[0])

      await waitFor(() => expect(approveButtons()[0]).toBeDisabled())
      expect(rejectButtons()[0]).toBeDisabled()
      expect(approveButtons()[1]).toBeEnabled()
      await act(async () => finish(undefined))
      await verifying
    })

    it.each([
      [new Error('Already verified'), 'Already verified'],
      ['boom', 'missions.verifyError'],
    ])('explains a failure and keeps the mission (%s)', async (failure, message) => {
      mockSubmit.mockRejectedValue(failure)
      await renderVerify()

      await fireEvent.press(approveButtons()[0])

      expect(alertSpy).toHaveBeenCalledWith('common.error', message)
      expect(titles()).toEqual(['First task', 'Second task'])
      expect(approveButtons()[0]).toBeEnabled()
    })
  })

  // BUG: `load` returns before clearing `loading` when there is no token, so a signed-out
  // user who reaches this screen (e.g. through a link) is left with a spinner forever.
  it.failing('does not spin forever without a session', async () => {
    mockAuth = {token: null, user: null}

    await renderVerify()

    expect(mockFetch).not.toHaveBeenCalled()
    expect(spinners()).toHaveLength(0)
  })

  // BUG: a failed load is only logged; the screen then claims there is nothing to verify.
  it.failing('tells the user when the missions could not be loaded', async () => {
    mockFetch.mockRejectedValue(new Error('Network request failed'))

    await renderVerify()

    expect(screen.queryByText('missions.noMissionsToVerify')).toBeNull()
  })
})
