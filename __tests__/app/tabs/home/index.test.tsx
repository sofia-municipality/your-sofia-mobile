import React from 'react'
import {ScrollView, View} from 'react-native'
import {act, fireEvent, render, screen} from '@testing-library/react-native'
import HomeScreen from '../../../../app/(tabs)/home/index'
import {useUpdates} from '../../../../hooks/useUpdates'
import {fetchNewsUpdates, fetchUpdateSources} from '../../../../lib/updatesApi'
import {SOFIA_DEFAULT_BOUNDS} from '../../../../lib/mapBounds'
import type {NewsItem} from '../../../../types/news'

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key, i18n: {language: 'en'}}),
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

jest.mock('../../../../components/AirQualityCard', () => {
  const {View} = require('react-native')
  return {AirQualityCard: (props: object) => <View testID="air-quality" {...props} />}
})

jest.mock('../../../../components/TopicFilter', () => {
  const {View} = require('react-native')
  return {TopicFilter: (props: object) => <View testID="topic-filter" {...props} />}
})

jest.mock('../../../../components/NewsCard', () => {
  const {Text} = require('react-native')
  return {
    NewsCard: ({item}: {item: {title: string}}) => <Text testID="news-card">{item.title}</Text>,
  }
})

jest.mock('../../../../components/NewsMap', () => {
  const {View} = require('react-native')
  return {NewsMap: (props: object) => <View testID="news-map" {...props} />}
})

jest.mock('../../../../hooks/useUpdates', () => ({
  useUpdates: jest.fn(),
}))

jest.mock('../../../../lib/updatesApi', () => ({
  fetchNewsUpdates: jest.fn(),
  fetchUpdateSources: jest.fn(),
  mapSourcesById: () => ({}),
  mapUpdateMessageToNewsItem: (message: unknown) => message,
}))

let mockCategories: string[] = []
const mockFilterChips = [{id: 'all', label: 'All'}]

jest.mock('../../../../hooks/useUpdateCategories', () => ({
  useUpdateCategories: () => ({categories: mockCategories, filterChips: mockFilterChips}),
}))

let mockSubscription: {categories: {slug: string}[]} | null = null

jest.mock('../../../../hooks/useSubscription', () => ({
  useSubscription: () => ({subscription: mockSubscription}),
}))

const mockUseNotifications = jest.fn()

jest.mock('../../../../hooks/useNotifications', () => ({
  useNotifications: () => mockUseNotifications(),
}))

const mockRegisterBellAction = jest.fn()

jest.mock('../../../../contexts/BellActionContext', () => ({
  useBellAction: () => ({registerBellAction: mockRegisterBellAction}),
}))

const mockUseUpdates = useUpdates as jest.Mock
const mockFetchNewsUpdates = fetchNewsUpdates as jest.Mock
const mockFetchUpdateSources = fetchUpdateSources as jest.Mock
const mockRefresh = jest.fn()

let updatesState: {news: NewsItem[]; loading: boolean; error: string | null}

const newsItem = (id: string, title: string): NewsItem => ({
  id,
  title,
  description: '',
  date: '2026-11-16',
  topic: 'water',
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const refocus = () =>
  act(async () => {
    mockFocusListeners.forEach((listener) => listener())
  })

const topicFilter = () => screen.getByTestId('topic-filter')
const selectedTopics = () => Array.from(topicFilter().props.selectedTopics as Set<string>)
const lastUpdatesOptions = () => mockUseUpdates.mock.calls.at(-1)?.[0]

async function renderHome() {
  await render(<HomeScreen />)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFocusListeners.clear()
  mockCategories = []
  mockSubscription = null
  updatesState = {news: [], loading: false, error: null}
  mockUseUpdates.mockImplementation(() => ({...updatesState, refresh: mockRefresh}))
})

describe('HomeScreen', () => {
  it('shows the air quality card', async () => {
    await renderHome()

    expect(screen.getByTestId('air-quality').props.data).toMatchObject({aqi: 45})
  })

  it('sets up push notifications', async () => {
    await renderHome()

    expect(mockUseNotifications).toHaveBeenCalled()
  })

  it('loads news for the whole of Sofia without a category filter', async () => {
    await renderHome()

    expect(lastUpdatesOptions()).toEqual({
      pushToken: undefined,
      categories: undefined,
      bounds: SOFIA_DEFAULT_BOUNDS,
      zoom: 11,
    })
  })

  it('offers the topic chips from the update categories', async () => {
    await renderHome()

    expect(topicFilter().props.topics).toBe(mockFilterChips)
    expect(selectedTopics()).toEqual(['all'])
  })

  it('loads only the topics the user picks', async () => {
    await renderHome()

    await act(async () => topicFilter().props.onTopicsChange(new Set(['water', 'transport'])))

    expect(lastUpdatesOptions().categories).toEqual(['water', 'transport'])
  })

  describe('list view', () => {
    it('shows a loading message', async () => {
      updatesState.loading = true

      await renderHome()

      expect(screen.getByText('common.loading')).toBeVisible()
      expect(screen.queryByTestId('news-card')).toBeNull()
    })

    it('shows the error with a retry button', async () => {
      updatesState.error = 'Network down'

      await renderHome()
      mockRefresh.mockClear()
      await fireEvent.press(screen.getByRole('button', {name: 'common.retry'}))

      expect(screen.getByText('Network down')).toBeVisible()
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('says when there is no news', async () => {
      await renderHome()

      expect(screen.getByText('common.noNews')).toBeVisible()
    })

    it('shows a card for every news item', async () => {
      updatesState.news = [newsItem('1', 'Water outage'), newsItem('2', 'Road works')]

      await renderHome()

      expect(screen.getAllByTestId('news-card').map((card) => card.props.children)).toEqual([
        'Water outage',
        'Road works',
      ])
      expect(screen.queryByTestId('news-map')).toBeNull()
    })
  })

  describe('map view', () => {
    async function openMap() {
      await renderHome()
      await fireEvent.press(screen.getByRole('button', {name: 'common.seeMap'}))
    }

    it('swaps the list for the news map', async () => {
      updatesState.news = [newsItem('1', 'Water outage')]

      await openMap()

      expect(screen.getByTestId('news-map').props.news).toEqual(updatesState.news)
      expect(screen.queryByTestId('news-card')).toBeNull()
      expect(screen.getByRole('button', {name: 'common.seeList'})).toBeVisible()
    })

    it('goes back to the list', async () => {
      updatesState.news = [newsItem('1', 'Water outage')]

      await openMap()
      await fireEvent.press(screen.getByRole('button', {name: 'common.seeList'}))

      expect(screen.queryByTestId('news-map')).toBeNull()
      expect(screen.getByTestId('news-card')).toBeVisible()
    })

    it('opens the news item behind a marker', async () => {
      await openMap()

      await act(async () => screen.getByTestId('news-map').props.onMarkerPress({id: 'n-7'}))

      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/home/n-7')
    })

    it('keeps the map visible while loading', async () => {
      updatesState.loading = true

      await openMap()

      expect(screen.getByTestId('news-map')).toBeVisible()
      expect(screen.getByText('common.loading')).toBeVisible()
    })

    it('keeps the map visible next to an error with a retry button', async () => {
      updatesState.error = 'Network down'

      await openMap()
      mockRefresh.mockClear()
      await fireEvent.press(screen.getByRole('button', {name: 'common.retry'}))

      expect(screen.getByTestId('news-map')).toBeVisible()
      expect(screen.getByText('Network down')).toBeVisible()
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('subscription topics', () => {
    it('starts with the topics the user subscribed to', async () => {
      mockSubscription = {categories: [{slug: 'water'}, {slug: ''}, {slug: 'transport'}]}

      await renderHome()

      expect(selectedTopics()).toEqual(['water', 'transport'])
      expect(lastUpdatesOptions().categories).toEqual(['water', 'transport'])
    })

    it('shows everything when the subscription has no topics', async () => {
      mockSubscription = {categories: []}

      await renderHome()

      expect(selectedTopics()).toEqual(['all'])
    })

    it('applies the subscription only once, so later picks are kept', async () => {
      mockSubscription = {categories: [{slug: 'water'}]}
      await renderHome()

      await act(async () => topicFilter().props.onTopicsChange(new Set(['transport'])))
      mockSubscription = {categories: [{slug: 'culture'}]}
      await screen.rerender(<HomeScreen />)

      expect(selectedTopics()).toEqual(['transport'])
    })

    it('waits for a subscription that arrives later', async () => {
      await renderHome()

      mockSubscription = {categories: [{slug: 'culture'}]}
      await screen.rerender(<HomeScreen />)

      expect(selectedTopics()).toEqual(['culture'])
    })
  })

  describe('bell action', () => {
    const bellAction = () => mockRegisterBellAction.mock.calls.at(-1)?.[0] as () => void

    it('is registered when the screen is focused', async () => {
      await renderHome()

      expect(mockRegisterBellAction).toHaveBeenCalledWith(expect.any(Function))
    })

    it('filters the news to uncategorized alerts', async () => {
      mockCategories = ['water', 'uncategorized']
      await renderHome()

      await act(async () => bellAction()())

      expect(selectedTopics()).toEqual(['uncategorized'])
    })

    it('shows all news when there is no uncategorized topic', async () => {
      mockSubscription = {categories: [{slug: 'water'}]}
      mockCategories = ['water']
      await renderHome()

      await act(async () => bellAction()())

      expect(selectedTopics()).toEqual(['all'])
    })

    describe('scrolling', () => {
      let measureLayout: jest.SpyInstance
      let scrollTo: jest.SpyInstance

      beforeEach(() => {
        jest.useFakeTimers()
        measureLayout = jest
          .spyOn(View.prototype as any, 'measureLayout')
          .mockImplementation((...args: unknown[]) =>
            (args[1] as (x: number, y: number) => void)(0, 420)
          )
        scrollTo = jest.spyOn(ScrollView.prototype as any, 'scrollTo')
      })

      afterEach(() => {
        jest.useRealTimers()
        measureLayout.mockRestore()
        scrollTo.mockRestore()
      })

      it('scrolls to the news section shortly after', async () => {
        await renderHome()

        await act(async () => bellAction()())
        expect(scrollTo).not.toHaveBeenCalled()
        await act(async () => jest.advanceTimersByTime(100))

        expect(measureLayout).toHaveBeenCalledTimes(1)
        expect(scrollTo).toHaveBeenCalledWith({y: 420, animated: true})
      })

      it('does not scroll after the screen has closed', async () => {
        await renderHome()

        await act(async () => bellAction()())
        await screen.unmount()
        await act(async () => jest.advanceTimersByTime(100))

        expect(measureLayout).not.toHaveBeenCalled()
      })
    })
  })

  describe('refocus', () => {
    it('reloads the news when the user comes back to the tab', async () => {
      await renderHome()
      mockRefresh.mockClear()

      await refocus()

      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('with the real updates hook', () => {
    let consoleError: jest.SpyInstance

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockUseUpdates.mockImplementation(
        jest.requireActual('../../../../hooks/useUpdates').useUpdates
      )
      mockFetchUpdateSources.mockResolvedValue([])
    })

    afterEach(async () => {
      // Stop the screen before the spy goes, so late rejections cannot reach the console.
      await screen.unmount()
      await sleep(20)
      consoleError.mockRestore()
    })

    it('shows the news it loaded', async () => {
      mockFetchNewsUpdates.mockResolvedValue([newsItem('1', 'Water outage')])

      await renderHome()
      await act(() => sleep(20))

      expect(screen.getByTestId('news-card')).toHaveTextContent('Water outage')
    })

    // BUG: the "skip the first focus" guard flips isFirstFocus, which recreates the focus
    // callback, so useFocusEffect runs it again immediately and forces a second request
    // on top of the one useUpdates already started.
    it.failing('loads the news once when the screen opens', async () => {
      mockFetchNewsUpdates.mockResolvedValue([])

      await renderHome()
      await act(() => sleep(20))

      expect(mockFetchNewsUpdates).toHaveBeenCalledTimes(1)
    })

    // BUG: every failure changes `error`, which gives useUpdates a new `refresh`, which
    // re-runs the focus callback, which force-refreshes and bypasses the failure cooldown.
    // While the API is down the screen retries without pause for as long as it is open.
    it.failing('does not keep retrying while the news request fails', async () => {
      mockFetchNewsUpdates.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('offline')), 5))
      )

      await renderHome()
      for (let i = 0; i < 10; i++) await act(() => sleep(10))

      // At most the two start-up requests (see the test above), and no retries after that.
      expect(mockFetchNewsUpdates.mock.calls.length).toBeLessThanOrEqual(2)
      expect(screen.getByText('offline')).toBeVisible()
    })
  })
})
