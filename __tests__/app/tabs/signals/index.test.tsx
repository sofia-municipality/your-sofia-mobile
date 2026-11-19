import React from 'react'
import {act, fireEvent, render, screen} from '@testing-library/react-native'
import SignalsScreen from '../../../../app/(tabs)/signals/index'
import {fetchSignals} from '../../../../lib/payload'
import {getUniqueReporterId} from '../../../../lib/deviceId'
import type {Signal} from '../../../../types/signal'

// react-i18next hands out a stable `t`; the screen relies on that for its effect deps.
const mockTranslation = {
  t: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key,
  i18n: {language: 'en'},
}

jest.mock('react-i18next', () => ({
  useTranslation: () => mockTranslation,
}))

const mockRouter = {push: jest.fn()}
let mockParams: {containerReferenceId?: string} = {}
const mockFocusListeners = new Set<() => void>()

// Mirrors expo-router: the effect runs while the screen is focused, again whenever the
// callback changes, and again on every later focus event.
jest.mock('expo-router', () => {
  const {useEffect} = require('react')
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => mockParams,
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
  const icons: Record<string, unknown> = {}
  return new Proxy(icons, {
    get: (target, name: string) => {
      if (name === '__esModule') return false
      target[name] ??= (props: object) => <View testID={`icon-${name}`} {...props} />
      return target[name]
    },
  })
})

jest.mock('../../../../lib/payload', () => ({
  fetchSignals: jest.fn(),
}))

jest.mock('../../../../lib/deviceId', () => ({
  getUniqueReporterId: jest.fn(),
}))

let mockUpdatedSignalIds: string[] = []
const mockRemoveUpdatedSignalId = jest.fn()

jest.mock('../../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    updatedSignalIds: mockUpdatedSignalIds,
    removeUpdatedSignalId: mockRemoveUpdatedSignalId,
  }),
}))

const mockRegisterBellAction = jest.fn()

jest.mock('../../../../contexts/BellActionContext', () => ({
  useBellAction: () => ({registerBellAction: mockRegisterBellAction}),
}))

let mockAuth: {user: {id: number} | null; isAuthenticated: boolean}

jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

const mockFetchSignals = fetchSignals as jest.Mock
const mockGetReporterId = getUniqueReporterId as jest.Mock

const signal = (overrides: Partial<Signal> = {}): Signal => ({
  id: '11',
  title: 'Overflowing container',
  description: 'Bags all over the pavement',
  category: 'waste-container',
  status: 'pending',
  createdAt: '2026-11-10T08:30:00.000Z',
  updatedAt: '2026-11-10T08:30:00.000Z',
  ...overrides,
})

const page = (docs: Signal[]) => ({docs})
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const flush = () => act(() => sleep(0))

const refocus = () =>
  act(async () => {
    mockFocusListeners.forEach((listener) => listener())
  })

const chip = (name: string) => screen.getByRole('button', {name})
const card = (title: string) => screen.getByRole('button', {name: new RegExp(`^${title},`)})
const spinners = () => screen.container.queryAll((node) => node.type === 'ActivityIndicator')
const refreshControl = () =>
  screen.container.queryAll((node) => node.props.refreshControl !== undefined)[0].props
    .refreshControl as React.ReactElement<{refreshing: boolean; onRefresh: () => void}>

async function renderSignals() {
  await render(<SignalsScreen />)
  await flush()
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFocusListeners.clear()
  mockParams = {}
  mockUpdatedSignalIds = []
  mockAuth = {user: {id: 7}, isAuthenticated: true}
  mockGetReporterId.mockResolvedValue('device-1')
  mockFetchSignals.mockResolvedValue(page([signal()]))
})

describe('SignalsScreen', () => {
  it('shows a spinner until the first page arrives', async () => {
    mockFetchSignals.mockReturnValue(new Promise(() => {}))

    await render(<SignalsScreen />)

    expect(spinners()).toHaveLength(1)
    expect(screen.getByText('common.loading')).toBeVisible()
  })

  it("starts with the user's own signals", async () => {
    await renderSignals()

    expect(mockFetchSignals).toHaveBeenLastCalledWith({
      limit: 50,
      containerReferenceId: undefined,
      reporterUserId: 7,
    })
    expect(chip('signals.mySignals').props.accessibilityState).toEqual({selected: true})
    expect(chip('signals.allSignals').props.accessibilityState).toEqual({selected: false})
  })

  it('shows nothing under "mine" for a signed-out user, without asking the server', async () => {
    mockAuth = {user: null, isAuthenticated: false}

    await renderSignals()

    expect(mockFetchSignals).not.toHaveBeenCalled()
    expect(screen.getByText('signals.noSignals')).toBeVisible()
  })

  it("switches to everyone's signals", async () => {
    await renderSignals()

    await fireEvent.press(chip('signals.allSignals'))
    await flush()

    expect(mockFetchSignals).toHaveBeenLastCalledWith({limit: 50, containerReferenceId: undefined})
    expect(chip('signals.allSignals').props.accessibilityState).toEqual({selected: true})
  })

  it('shows all signals to a signed-out user', async () => {
    mockAuth = {user: null, isAuthenticated: false}
    await renderSignals()

    await fireEvent.press(chip('signals.allSignals'))
    await flush()

    expect(mockFetchSignals).toHaveBeenLastCalledWith({limit: 50, containerReferenceId: undefined})
    expect(screen.getByText('Overflowing container')).toBeVisible()
  })

  it('says when there are no signals', async () => {
    mockFetchSignals.mockResolvedValue(page([]))

    await renderSignals()

    expect(screen.getByText('signals.noSignals')).toBeVisible()
  })

  describe('signal card', () => {
    it('shows the status, category, title, description and date', async () => {
      const createdAt = '2026-11-10T08:30:00.000Z'
      mockFetchSignals.mockResolvedValue(page([signal({createdAt})]))

      await renderSignals()

      expect(screen.getByText('signals.status.pending')).toBeVisible()
      expect(screen.getByText('signals.categories.waste-container')).toBeVisible()
      expect(screen.getByText('Overflowing container')).toBeVisible()
      expect(screen.getByText('Bags all over the pavement')).toBeVisible()
      expect(
        screen.getByText(
          new Date(createdAt).toLocaleDateString('en', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        )
      ).toBeVisible()
    })

    it('names the city object when there is one', async () => {
      mockFetchSignals.mockResolvedValue(
        page([signal({cityObject: {name: 'Container WC-001'}}), signal({id: '12', title: 'Other'})])
      )

      await renderSignals()

      expect(screen.getAllByText('📍 Container WC-001')).toHaveLength(1)
    })

    it.each([
      ['pending', 'Clock'],
      ['in-progress', 'AlertCircle'],
      ['resolved', 'CheckCircle'],
      ['rejected', 'XCircle'],
    ] as const)('marks a %s signal with the %s icon', async (status, icon) => {
      mockFetchSignals.mockResolvedValue(page([signal({status})]))

      await renderSignals()

      expect(screen.getByTestId(`icon-${icon}`)).toBeTruthy()
      expect(card('Overflowing container').props.accessibilityLabel).toBe(
        `Overflowing container, signals.status.${status}`
      )
    })

    it('opens the signal', async () => {
      await renderSignals()

      await fireEvent.press(card('Overflowing container'))

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/signals/11')
      expect(mockRemoveUpdatedSignalId).not.toHaveBeenCalled()
    })

    it('flags a signal that has news and clears the flag when opened', async () => {
      mockUpdatedSignalIds = ['11']

      await renderSignals()
      expect(card('Overflowing container').props.accessibilityLabel).toBe(
        'Overflowing container, signals.status.pending, актуализиран'
      )
      await fireEvent.press(card('Overflowing container'))

      expect(mockRemoveUpdatedSignalId).toHaveBeenCalledWith('11')
      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/signals/11')
    })
  })

  describe('errors', () => {
    let consoleError: jest.SpyInstance

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => consoleError.mockRestore())

    it('shows the error and retries', async () => {
      mockFetchSignals.mockRejectedValue(new Error('Server unavailable'))
      await renderSignals()

      expect(screen.getByText('Server unavailable')).toBeVisible()

      mockFetchSignals.mockResolvedValue(page([signal()]))
      await fireEvent.press(screen.getByRole('button', {name: 'common.retry'}))
      await flush()

      expect(screen.getByText('Overflowing container')).toBeVisible()
      expect(screen.queryByText('Server unavailable')).toBeNull()
    })

    it('falls back to a generic message for unknown errors', async () => {
      mockFetchSignals.mockRejectedValue('boom')

      await renderSignals()

      expect(screen.getByText('signals.error')).toBeVisible()
    })
  })

  describe('pull to refresh', () => {
    it('reloads without the full-screen spinner', async () => {
      await renderSignals()
      let finish: (value: unknown) => void = () => {}
      mockFetchSignals.mockClear()
      mockFetchSignals.mockReturnValue(new Promise((resolve) => (finish = resolve)))

      await act(async () => refreshControl().props.onRefresh())

      expect(refreshControl().props.refreshing).toBe(true)
      expect(spinners()).toHaveLength(0)
      expect(mockFetchSignals).toHaveBeenCalledTimes(1)

      await act(async () => finish(page([signal({title: 'Fresh signal'})])))

      expect(refreshControl().props.refreshing).toBe(false)
      expect(screen.getByText('Fresh signal')).toBeVisible()
    })
  })

  describe('for one container', () => {
    beforeEach(() => {
      mockParams = {containerReferenceId: 'WC-001'}
    })

    it("lists everyone's signals for that container", async () => {
      await renderSignals()

      expect(mockFetchSignals).toHaveBeenLastCalledWith({limit: 50, containerReferenceId: 'WC-001'})
    })

    it('shows the container filter instead of the chips', async () => {
      await renderSignals()

      expect(screen.getByText('signals.filteredForContainer:{"id":"WC-001"}')).toBeVisible()
      expect(screen.queryByRole('button', {name: 'signals.mySignals'})).toBeNull()
    })

    it('clears the filter', async () => {
      await renderSignals()

      await fireEvent.press(screen.getByText('signals.clearFilter'))

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/signals')
    })
  })

  it('reloads when the user comes back to the tab', async () => {
    await renderSignals()
    mockFetchSignals.mockClear()

    await refocus()
    await flush()

    expect(mockFetchSignals).toHaveBeenCalledTimes(1)
  })

  it('registers the header action while focused', async () => {
    await renderSignals()

    expect(mockRegisterBellAction).toHaveBeenCalledWith(expect.any(Function))
  })

  it('looks up the device id', async () => {
    await renderSignals()

    expect(mockGetReporterId).toHaveBeenCalledTimes(1)
  })

  // BUG: the "skip the first focus" guard flips isFirstFocus, which recreates the focus
  // callback, so useFocusEffect runs it again immediately and loads a second time.
  it.failing('loads the signals once when the screen opens', async () => {
    await renderSignals()

    expect(mockFetchSignals).toHaveBeenCalledTimes(1)
  })

  // BUG: nothing discards an older response. The chips stay visible during pull-to-refresh,
  // so a slow "all" refresh that lands after the user switched to "mine" replaces their
  // own signals while the "mine" chip is still selected.
  it.failing(
    'shows the signals of the selected filter when an older request finishes last',
    async () => {
      let slowAll = false
      mockFetchSignals.mockImplementation(async (params: {reporterUserId?: number}) => {
        if (params.reporterUserId) return page([signal({id: '1', title: 'My signal'})])
        if (slowAll) await sleep(30)
        return page([signal({id: '2', title: "Someone else's signal"})])
      })
      await renderSignals()
      await fireEvent.press(chip('signals.allSignals'))
      await flush()

      slowAll = true
      await act(async () => refreshControl().props.onRefresh())
      await fireEvent.press(chip('signals.mySignals'))
      await act(() => sleep(60))

      expect(chip('signals.mySignals').props.accessibilityState).toEqual({selected: true})
      expect(screen.getByText('My signal')).toBeVisible()
      expect(screen.queryByText("Someone else's signal")).toBeNull()
    }
  )
})
