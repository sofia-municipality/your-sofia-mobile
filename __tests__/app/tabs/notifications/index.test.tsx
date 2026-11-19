import React from 'react'
import {Alert, AlertButton} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import NotificationsScreen from '../../../../app/(tabs)/notifications/index'
import {emitNotificationFilter} from '../../../../lib/notificationFilterBridge'
import {CATEGORY_DISPLAY_ORDER} from '../../../../lib/categories'
import type {LocationFilter, Subscription} from '../../../../types/subscription'

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
  const icons: Record<string, unknown> = {}
  return new Proxy(icons, {
    get: (target, name: string) => {
      if (name === '__esModule') return false
      target[name] ??= (props: object) => <View testID={`icon-${name}`} {...props} />
      return target[name]
    },
  })
})

let mockAuth: {token: string | null}

jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}))

const mockSaveSubscription = jest.fn()
const mockReload = jest.fn()
let mockSubscriptionState: {
  subscription: Subscription | null
  pushTokenString: string | null
  isLoading: boolean
}

jest.mock('../../../../hooks/useSubscription', () => ({
  useSubscription: () => ({
    ...mockSubscriptionState,
    saveSubscription: mockSaveSubscription,
    reload: mockReload,
  }),
}))

const districtFilter: LocationFilter = {
  id: 'f-1',
  filterType: 'district',
  district: {id: 3, name: 'Lozenets', districtId: 12},
}
const pointFilter: LocationFilter = {
  id: 'f-2',
  filterType: 'point',
  latitude: 42.69,
  longitude: 23.32,
  radius: 500,
}

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 's-1',
  enabled: true,
  pushToken: 1,
  categories: [
    {id: 1, slug: 'water', title: 'Water'},
    {id: 2, slug: 'heating', title: 'Heating'},
  ],
  locationFilters: [districtFilter, pointFilter],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
})

const chip = (slug: string) => screen.getByRole('button', {name: `categories.${slug}`})
const selectedChips = () =>
  CATEGORY_DISPLAY_ORDER.filter((slug) => chip(slug).props.accessibilityState.selected)
const enabledSwitch = () => screen.getByRole('switch')
const saveButton = () => screen.getByRole('button', {name: 'notifications.save'})
const removeButtons = () => screen.queryAllByRole('button', {name: 'notifications.removeFilter'})
const filterLabels = () =>
  screen
    .queryAllByRole('button', {name: 'notifications.removeFilter'})
    .map((button) => button.parent!.children[1] as unknown as {props: {children: string}})

let alertSpy: jest.SpyInstance
let consoleError: jest.SpyInstance

function alertButtons() {
  return alertSpy.mock.calls.at(-1)[2] as AlertButton[]
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFocusListeners.clear()
  mockAuth = {token: 'jwt'}
  mockSubscriptionState = {
    subscription: subscription(),
    pushTokenString: 'ExponentPushToken[abc]',
    isLoading: false,
  }
  mockSaveSubscription.mockResolvedValue(undefined)
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  alertSpy.mockRestore()
  consoleError.mockRestore()
})

describe('NotificationsScreen', () => {
  it('shows a spinner while the subscription loads', async () => {
    mockSubscriptionState.isLoading = true

    await render(<NotificationsScreen />)

    expect(screen.container.queryAll((node) => node.type === 'ActivityIndicator')).toHaveLength(1)
    expect(screen.queryByRole('switch')).toBeNull()
  })

  describe('reloading on focus', () => {
    it('reloads while this device has no push token yet', async () => {
      mockSubscriptionState.pushTokenString = null

      await render(<NotificationsScreen />)

      expect(mockReload).toHaveBeenCalledTimes(1)
    })

    it('does not reload once there is a token, so unsaved filters survive', async () => {
      await render(<NotificationsScreen />)
      await act(async () => mockFocusListeners.forEach((listener) => listener()))

      expect(mockReload).not.toHaveBeenCalled()
    })
  })

  describe('drafts', () => {
    it('start from the saved subscription', async () => {
      await render(<NotificationsScreen />)

      expect(enabledSwitch().props.value).toBe(true)
      expect(selectedChips()).toEqual(['water', 'heating'])
      expect(filterLabels().map((label) => label.props.children)).toEqual([
        'notifications.locationTypeDistrict: Lozenets',
        'notifications.locationTypePoint (notifications.radiusM)',
      ])
    })

    it('treat a subscription without the flag as enabled', async () => {
      mockSubscriptionState.subscription = subscription({enabled: undefined})

      await render(<NotificationsScreen />)

      expect(enabledSwitch().props.value).toBe(true)
    })

    it('show a disabled subscription as off', async () => {
      mockSubscriptionState.subscription = subscription({enabled: false})

      await render(<NotificationsScreen />)

      expect(enabledSwitch().props.value).toBe(false)
    })

    it('start empty without a subscription', async () => {
      mockSubscriptionState.subscription = null

      await render(<NotificationsScreen />)

      expect(enabledSwitch().props.value).toBe(true)
      expect(selectedChips()).toEqual([])
      expect(screen.getByText('notifications.noLocationFilters')).toBeVisible()
    })
  })

  describe('categories', () => {
    it('shows a chip for every category', async () => {
      await render(<NotificationsScreen />)

      for (const slug of CATEGORY_DISPLAY_ORDER) {
        expect(screen.getByText(`categories.${slug}`)).toBeVisible()
      }
    })

    it('toggles a category', async () => {
      await render(<NotificationsScreen />)

      await fireEvent.press(chip('water'))
      await fireEvent.press(chip('bicycles'))

      expect(selectedChips()).toEqual(['heating', 'bicycles'])
    })

    it('selects every category', async () => {
      await render(<NotificationsScreen />)

      await fireEvent.press(screen.getByRole('button', {name: 'notifications.selectAll'}))

      expect(selectedChips()).toEqual([...CATEGORY_DISPLAY_ORDER])
      expect(screen.getByRole('button', {name: 'notifications.deselectAll'})).toBeVisible()
    })

    it('clears every category once all are selected', async () => {
      await render(<NotificationsScreen />)
      await fireEvent.press(screen.getByRole('button', {name: 'notifications.selectAll'}))

      await fireEvent.press(screen.getByRole('button', {name: 'notifications.deselectAll'}))

      expect(selectedChips()).toEqual([])
    })

    // BUG: "all selected" compares the number of selected slugs with the number of chips.
    // A saved slug that has no chip (e.g. "uncategorized") makes 16 of 17 chips count as
    // all, so the button offers "Deselect all" although one chip is still off.
    it.failing('offers "select all" while a chip is still unselected', async () => {
      const slugs = CATEGORY_DISPLAY_ORDER.filter((slug) => slug !== 'bicycles')
      mockSubscriptionState.subscription = subscription({
        categories: [...slugs, 'uncategorized'].map((slug, id) => ({id, slug, title: slug})),
      })

      await render(<NotificationsScreen />)

      expect(chip('bicycles').props.accessibilityState.selected).toBe(false)
      expect(screen.getByRole('button', {name: 'notifications.selectAll'})).toBeVisible()
    })
  })

  describe('turning notifications off', () => {
    beforeEach(async () => {
      await render(<NotificationsScreen />)
      await fireEvent(enabledSwitch(), 'valueChange', false)
    })

    it('locks the categories and location filters', async () => {
      expect(enabledSwitch().props.value).toBe(false)
      expect(chip('water')).toBeDisabled()
      expect(screen.getByRole('button', {name: 'notifications.selectAll'})).toBeDisabled()
      expect(removeButtons()[0]).toBeDisabled()
      expect(screen.getByRole('button', {name: 'notifications.addLocation'})).toBeDisabled()
    })

    it('saves an empty, disabled subscription', async () => {
      await fireEvent.press(saveButton())

      expect(mockSaveSubscription).toHaveBeenCalledWith([], [], 'jwt', false)
    })
  })

  describe('location filters', () => {
    it('removes a filter', async () => {
      await render(<NotificationsScreen />)

      await fireEvent.press(removeButtons()[0])

      expect(filterLabels().map((label) => label.props.children)).toEqual([
        'notifications.locationTypePoint (notifications.radiusM)',
      ])
    })

    it('asks which kind of location to add', async () => {
      await render(<NotificationsScreen />)

      await fireEvent.press(screen.getByRole('button', {name: 'notifications.addLocation'}))

      expect(alertSpy).toHaveBeenCalledWith('notifications.addLocation', undefined, [
        {text: 'notifications.locationTypeDistrict', onPress: expect.any(Function)},
        {text: 'notifications.locationTypePoint', onPress: expect.any(Function)},
        {text: 'notifications.locationTypeArea', onPress: expect.any(Function)},
        {text: 'common.cancel', style: 'cancel'},
      ])
    })

    it.each([
      [0, 'district-picker'],
      [1, 'point-picker'],
      [2, 'area-picker'],
    ])('opens the right picker for option %d', async (index, picker) => {
      await render(<NotificationsScreen />)
      await fireEvent.press(screen.getByRole('button', {name: 'notifications.addLocation'}))

      alertButtons()[index].onPress!()

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: `/(tabs)/notifications/${picker}`,
        params: {returnTo: '/(tabs)/notifications'},
      })
    })

    it('adds the filter a picker sends back', async () => {
      mockSubscriptionState.subscription = null
      await render(<NotificationsScreen />)

      await act(async () => emitNotificationFilter({filterType: 'all'}))

      expect(filterLabels().map((label) => label.props.children)).toEqual([
        'notifications.locationTypeAll',
      ])
    })

    it('stops listening for picker results when closed', async () => {
      await render(<NotificationsScreen />)
      await screen.unmount()

      await act(async () => emitNotificationFilter({filterType: 'all'}))

      expect(consoleError).not.toHaveBeenCalled()
    })
  })

  describe('saving', () => {
    it('saves the drafts with the session token', async () => {
      await render(<NotificationsScreen />)
      await fireEvent.press(chip('bicycles'))
      await fireEvent.press(removeButtons()[1])

      await fireEvent.press(saveButton())

      expect(mockSaveSubscription).toHaveBeenCalledWith(
        ['water', 'heating', 'bicycles'],
        [{filterType: 'district', district: {id: 3, name: 'Lozenets', districtId: 12}}],
        'jwt',
        true
      )
      expect(alertSpy).toHaveBeenCalledWith('common.success', 'notifications.saveSuccess')
    })

    it('saves anonymously without a session', async () => {
      mockAuth = {token: null}
      await render(<NotificationsScreen />)

      await fireEvent.press(saveButton())

      expect(mockSaveSubscription).toHaveBeenCalledWith(
        ['water', 'heating'],
        expect.any(Array),
        null,
        true
      )
    })

    it('shows a spinner and blocks a second save meanwhile', async () => {
      let finish: (value: unknown) => void = () => {}
      mockSaveSubscription.mockReturnValue(new Promise((resolve) => (finish = resolve)))
      await render(<NotificationsScreen />)

      const saving = fireEvent.press(saveButton())

      await waitFor(() => expect(saveButton()).toBeDisabled())
      expect(screen.queryByText('notifications.save')).toBeNull()
      await act(async () => finish(undefined))
      await saving
      expect(saveButton()).toBeEnabled()
    })

    it.each([
      [new Error('No push token registered on this device'), 'notifications.noPushToken'],
      [new Error('Subscription limit reached'), 'Subscription limit reached'],
      [new Error(''), 'notifications.saveError'],
      ['boom', 'notifications.saveError'],
    ])('explains a failed save (%s)', async (failure, message) => {
      mockSaveSubscription.mockRejectedValue(failure)
      await render(<NotificationsScreen />)

      await fireEvent.press(saveButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', message)
      expect(saveButton()).toBeEnabled()
    })

    it('is blocked until this device has a push token', async () => {
      mockSubscriptionState.pushTokenString = null

      await render(<NotificationsScreen />)

      expect(screen.getByText('notifications.noPushToken')).toBeVisible()
      expect(saveButton()).toBeDisabled()
    })

    it('hides the push token warning once there is a token', async () => {
      await render(<NotificationsScreen />)

      expect(screen.queryByText('notifications.noPushToken')).toBeNull()
    })
  })
})
