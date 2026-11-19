import React from 'react'
import {act, fireEvent, render, screen, within} from '@testing-library/react-native'
import WasteCollectionDashboard from '../../../../app/(tabs)/metrics/waste-collection'
import {useCollectionMetrics} from '../../../../hooks/useCollectionMetrics'
import type {CollectionMetrics} from '../../../../lib/payload'
import {colors} from '../../../../styles/tokens'

type Datum = Record<string, string | number>
type ChartProps = {data: Datum[]; xKey: string; yKeys: string[]}

const mockCharts: ChartProps[] = []

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('@shopify/react-native-skia', () => {
  const {Text} = require('react-native')
  return {
    useFont: () => ({name: 'mock-font'}),
    Text: ({text}: {text: string}) => <Text testID="chart-label">{text}</Text>,
  }
})

jest.mock('victory-native', () => {
  const {View} = require('react-native')
  return {
    CartesianChart: (props: ChartProps & {children: (args: unknown) => React.ReactNode}) => {
      mockCharts.push(props)
      const points = Object.fromEntries(
        props.yKeys.map((key) => [
          key,
          props.data.map((d, i) => ({x: i * 50, y: 300 - Number(d[key]), yValue: d[key]})),
        ])
      )
      return <View testID={`chart-${props.xKey}`}>{props.children({points, chartBounds: {}})}</View>
    },
    StackedBar: () => <View testID="stacked-bar" />,
    Bar: ({color}: {color: string}) => <View testID="bar" color={color} />,
    Line: () => <View testID="line" />,
  }
})

jest.mock('../../../../hooks/useCollectionMetrics', () => ({
  useCollectionMetrics: jest.fn(),
}))

type HookState = {
  data: CollectionMetrics | null
  loading: boolean
  error: string | null
  refresh: jest.Mock
}

const mockUseMetrics = useCollectionMetrics as jest.Mock
let states: Record<'primary' | 'monthly', HookState>

function makeMetrics(overrides: Partial<CollectionMetrics> = {}): CollectionMetrics {
  return {
    from: '2026-11-09',
    to: '2026-11-16',
    byZone: [
      {
        zoneNumber: 1,
        zoneName: 'Zone 1',
        serviceCompanyId: 3,
        totalContainers: 40,
        collectedContainers: 30,
      },
      {
        zoneNumber: 2,
        zoneName: 'Zone 2',
        serviceCompanyId: 4,
        totalContainers: 10,
        collectedContainers: 0,
      },
    ],
    byDistrict: [
      {districtId: 1, districtName: 'Триадица', totalContainers: 30, collectedContainers: 25},
      {districtId: 2, districtName: 'Студентски', totalContainers: 15, collectedContainers: 5},
      {districtId: 3, districtName: 'Лозенец', totalContainers: 5, collectedContainers: 0},
    ],
    byDay: [
      {date: '2026-11-14T00:00:00.000Z', totalContainers: 50, collectedContainers: 20},
      {date: '2026-11-15T00:00:00.000Z', totalContainers: 50, collectedContainers: 35},
    ],
    byTimeSinceCollection: [
      {bucket: '<1d', bucketOrder: 0, containerCount: 12},
      {bucket: '1-3d', bucketOrder: 1, containerCount: 6},
      {bucket: '>3d', bucketOrder: 2, containerCount: 2},
    ],
    scheduleCompliance: {scheduledToday: 20, delayed: 3, missed: 2},
    ...overrides,
  }
}

function hookState(overrides: Partial<HookState> = {}): HookState {
  return {data: makeMetrics(), loading: false, error: null, refresh: jest.fn(), ...overrides}
}

const chartFor = (xKey: string) => mockCharts.filter((c) => c.xKey === xKey).at(-1)!
const labels = (xKey: string) =>
  within(screen.getByTestId(`chart-${xKey}`))
    .queryAllByTestId('chart-label')
    .map((n) => n.props.children)

describe('WasteCollectionDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCharts.length = 0
    states = {primary: hookState(), monthly: hookState()}
    // The dashboard calls the hook twice per render: the selected range, then 'month'.
    mockUseMetrics.mockImplementation(() =>
      mockUseMetrics.mock.calls.length % 2 === 1 ? states.primary : states.monthly
    )
  })

  describe('date range', () => {
    it('loads the last week and the monthly trend', async () => {
      await render(<WasteCollectionDashboard />)

      expect(mockUseMetrics.mock.calls.slice(0, 2)).toEqual([['week'], ['month']])
    })

    it('selects the last week by default', async () => {
      await render(<WasteCollectionDashboard />)

      expect(screen.getByRole('button', {name: 'metrics.lastWeek'})).toBeSelected()
      expect(screen.getByRole('button', {name: 'metrics.lastMonth'})).not.toBeSelected()
    })

    it('switches to the last month', async () => {
      await render(<WasteCollectionDashboard />)

      await fireEvent.press(screen.getByRole('button', {name: 'metrics.lastMonth'}))

      expect(mockUseMetrics.mock.calls.at(-2)).toEqual(['month'])
      expect(screen.getByRole('button', {name: 'metrics.lastMonth'})).toBeSelected()
    })
  })

  describe('summary', () => {
    it('totals the containers, collections, zones and active districts', async () => {
      await render(<WasteCollectionDashboard />)

      const value = (label: string) => screen.getByText(label).parent!.children[0]
      expect(value('metrics.summaryTotal')).toHaveTextContent('50')
      expect(value('metrics.summaryCollected')).toHaveTextContent('30')
      expect(value('metrics.summaryZones')).toHaveTextContent('2')
      expect(value('metrics.summaryDistricts')).toHaveTextContent('2')
    })

    it('is hidden until the first metrics arrive', async () => {
      states.primary = hookState({data: null, loading: true})

      await render(<WasteCollectionDashboard />)

      expect(screen.queryByText('metrics.summaryTotal')).toBeNull()
    })
  })

  describe('loading and errors', () => {
    it('shows a spinner instead of the charts while loading', async () => {
      states.primary = hookState({data: null, loading: true})

      await render(<WasteCollectionDashboard />)

      expect(screen.getByText('metrics.loading')).toBeOnTheScreen()
      expect(screen.queryByTestId('chart-name')).toBeNull()
      expect(screen.queryByTestId('chart-bucket')).toBeNull()
      expect(screen.queryByTestId('chart-status')).toBeNull()
    })

    it('shows the error and retries', async () => {
      states.primary = hookState({data: null, error: 'Failed to fetch collection metrics: 500'})

      await render(<WasteCollectionDashboard />)
      await fireEvent.press(screen.getByRole('button', {name: 'metrics.retry'}))

      expect(screen.getByText('metrics.errorTitle')).toBeOnTheScreen()
      expect(screen.getByText('Failed to fetch collection metrics: 500')).toBeOnTheScreen()
      expect(states.primary.refresh).toHaveBeenCalledTimes(1)
      expect(screen.queryByTestId('chart-name')).toBeNull()
    })

    it('refreshes both data sets on pull to refresh', async () => {
      await render(<WasteCollectionDashboard />)

      await act(async () => screen.root!.props.refreshControl.props.onRefresh())

      expect(states.primary.refresh).toHaveBeenCalledTimes(1)
      expect(states.monthly.refresh).toHaveBeenCalledTimes(1)
    })

    it.each([
      ['the selected range', 'primary'],
      ['the monthly trend', 'monthly'],
    ] as const)('shows the refresh indicator while %s loads', async (_name, which) => {
      states[which] = hookState({loading: true})

      await render(<WasteCollectionDashboard />)

      expect(screen.root!.props.refreshControl.props.refreshing).toBe(true)
    })

    it('hides the refresh indicator when everything is loaded', async () => {
      await render(<WasteCollectionDashboard />)

      expect(screen.root!.props.refreshControl.props.refreshing).toBe(false)
    })
  })

  describe('collection chart', () => {
    it('shows collected and not collected containers per district', async () => {
      await render(<WasteCollectionDashboard />)

      expect(chartFor('name').data).toEqual([
        {name: 'Триадица', collected: 25, notCollected: 5, total: 30},
        {name: 'Студентс', collected: 5, notCollected: 10, total: 15},
        {name: 'Лозенец', collected: 0, notCollected: 5, total: 5},
      ])
      expect(screen.getByRole('button', {name: 'metrics.byDistrict'})).toBeSelected()
    })

    it('switches to zones', async () => {
      await render(<WasteCollectionDashboard />)

      await fireEvent.press(screen.getByRole('button', {name: 'metrics.byZone'}))

      expect(chartFor('name').data).toEqual([
        {name: 'Zone 1', collected: 30, notCollected: 10, total: 40},
        {name: 'Zone 2', collected: 0, notCollected: 10, total: 10},
      ])
      expect(screen.getByRole('button', {name: 'metrics.byZone'})).toBeSelected()
    })

    it('labels only the bars with collected containers', async () => {
      await render(<WasteCollectionDashboard />)

      expect(labels('name')).toEqual(['25', '5'])
    })

    it('says when there is nothing to show', async () => {
      states.primary = hookState({data: makeMetrics({byZone: [], byDistrict: []})})

      await render(<WasteCollectionDashboard />)

      expect(screen.getAllByText('metrics.noData').length).toBeGreaterThan(0)
    })
  })

  describe('time since last collection', () => {
    it('colours the buckets from fresh to overdue', async () => {
      await render(<WasteCollectionDashboard />)

      expect(chartFor('bucket').data).toEqual([
        {bucket: '<1d', bucketOrder: 0, count: 12},
        {bucket: '1-3d', bucketOrder: 1, count: 6},
        {bucket: '>3d', bucketOrder: 2, count: 2},
      ])
      const bars = within(screen.getByTestId('chart-bucket')).getAllByTestId('bar')
      expect(bars.map((b) => b.props.color)).toEqual([colors.success, colors.warning, colors.error])
    })

    it('says when there is no histogram data', async () => {
      states.primary = hookState({data: makeMetrics({byTimeSinceCollection: []})})

      await render(<WasteCollectionDashboard />)

      expect(screen.queryByTestId('chart-bucket')).toBeNull()
      expect(screen.getByText('metrics.timeSinceCollection')).toBeOnTheScreen()
      expect(screen.getByText('metrics.noData')).toBeOnTheScreen()
    })
  })

  describe('monthly trend', () => {
    it('shows the daily collections with day.month labels', async () => {
      await render(<WasteCollectionDashboard />)

      expect(chartFor('day').data).toEqual([
        {day: '14.11', collected: 20, total: 50},
        {day: '15.11', collected: 35, total: 50},
      ])
      expect(labels('day')).toEqual(['Общ брой контейнери за събиране: 50'])
    })

    it('shows at most the last 30 days', async () => {
      const byDay = Array.from({length: 35}, (_, i) => ({
        date: new Date(Date.UTC(2026, 9, 1 + i)).toISOString(),
        totalContainers: 50,
        collectedContainers: i,
      }))
      states.monthly = hookState({data: makeMetrics({byDay})})

      await render(<WasteCollectionDashboard />)

      const data = chartFor('day').data
      expect(data).toHaveLength(30)
      expect(data[0]).toMatchObject({day: '06.10', collected: 5})
      expect(data.at(-1)).toMatchObject({day: '04.11', collected: 34})
    })

    it.each([
      ['loading', {loading: true}],
      ['failed', {data: null, error: 'boom'}],
    ])('is hidden while the monthly data is %s', async (_state, overrides) => {
      states.monthly = hookState(overrides)

      await render(<WasteCollectionDashboard />)

      expect(screen.queryByText('metrics.monthlyTrendline')).toBeNull()
      expect(screen.queryByTestId('chart-day')).toBeNull()
    })

    it('says when there are no days to show', async () => {
      states.monthly = hookState({data: makeMetrics({byDay: []})})

      await render(<WasteCollectionDashboard />)

      expect(screen.getByText('metrics.monthlyTrendline')).toBeOnTheScreen()
      expect(screen.queryByTestId('chart-day')).toBeNull()
    })
  })

  describe('schedule compliance', () => {
    it("splits today's scheduled collections into on time, delayed and missed", async () => {
      await render(<WasteCollectionDashboard />)

      expect(chartFor('status').data).toEqual([
        {status: 'metrics.complianceOnTime', count: 15, color: colors.success},
        {status: 'metrics.complianceDelayed', count: 3, color: colors.warning},
        {status: 'metrics.complianceMissed', count: 2, color: colors.error},
      ])
      expect(screen.getByText('metrics.complianceOnTime')).toBeOnTheScreen()
    })

    it('never reports a negative number of on-time collections', async () => {
      states.primary = hookState({
        data: makeMetrics({scheduleCompliance: {scheduledToday: 3, delayed: 2, missed: 4}}),
      })

      await render(<WasteCollectionDashboard />)

      expect(chartFor('status').data[0].count).toBe(0)
    })
  })
})
