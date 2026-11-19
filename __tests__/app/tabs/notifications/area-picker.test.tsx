import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import AreaPickerScreen from '../../../../app/(tabs)/notifications/area-picker'
import {emitNotificationFilter} from '../../../../lib/notificationFilterBridge'

const mockTranslation = {
  t: (key: string, options?: Record<string, unknown>) =>
    options ? `${key}:${JSON.stringify(options)}` : key,
}

jest.mock('react-i18next', () => ({
  useTranslation: () => mockTranslation,
}))

const mockRouter = {back: jest.fn()}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('react-native-maps', () => {
  const {View} = require('react-native')
  return {
    __esModule: true,
    default: (props: object) => <View testID="map" {...props} />,
    Marker: (props: object) => <View testID="vertex" {...props} />,
    Polygon: (props: object) => <View testID="polygon" {...props} />,
  }
})

jest.mock('../../../../lib/notificationFilterBridge', () => ({
  emitNotificationFilter: jest.fn(),
}))

const mockEmit = emitNotificationFilter as jest.Mock

const points = [
  {latitude: 42.7, longitude: 23.3},
  {latitude: 42.7, longitude: 23.35},
  {latitude: 42.66, longitude: 23.33},
]

const map = () => screen.getByTestId('map')
const vertices = () => screen.queryAllByTestId('vertex').map((vertex) => vertex.props.coordinate)
const button = (name: string) => screen.getByRole('button', {name})
const undoButton = () => button('notifications.undoPoint')
const closeButton = () => screen.queryByRole('button', {name: 'notifications.closePolygon'})
const confirmButton = () => button('notifications.confirmLocation')
const tapMap = (coordinate?: {latitude: number; longitude: number}) =>
  fireEvent(map(), 'press', {nativeEvent: {coordinate}})

async function renderWithPoints(count: number) {
  await render(<AreaPickerScreen />)
  for (const point of points.slice(0, count)) await tapMap(point)
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AreaPickerScreen', () => {
  it('starts over central Sofia with an empty area', async () => {
    await render(<AreaPickerScreen />)

    expect(map().props.initialRegion).toEqual({
      latitude: 42.6977,
      longitude: 23.3219,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    })
    expect(vertices()).toEqual([])
    expect(screen.getByText('notifications.drawArea')).toBeVisible()
    expect(undoButton()).toBeDisabled()
    expect(closeButton()).toBeDisabled()
    expect(confirmButton()).toBeDisabled()
  })

  it('adds a corner for every tap and counts them', async () => {
    await renderWithPoints(2)

    expect(vertices()).toEqual(points.slice(0, 2))
    expect(screen.getByText('notifications.pointsCount:{"count":2}')).toBeVisible()
    expect(screen.queryByTestId('polygon')).toBeNull()
    expect(undoButton()).toBeEnabled()
    expect(closeButton()).toBeDisabled()
    expect(confirmButton()).toBeDisabled()
  })

  it('ignores a tap without a coordinate', async () => {
    await renderWithPoints(1)

    await tapMap(undefined)

    expect(vertices()).toHaveLength(1)
  })

  it('draws the area from the third corner on', async () => {
    await renderWithPoints(3)

    expect(screen.getByTestId('polygon').props.coordinates).toEqual(points)
    expect(closeButton()).toBeEnabled()
    expect(confirmButton()).toBeEnabled()
  })

  it('removes the last corner', async () => {
    await renderWithPoints(3)

    await fireEvent.press(undoButton())

    expect(vertices()).toEqual(points.slice(0, 2))
    expect(screen.queryByTestId('polygon')).toBeNull()
  })

  describe('closing the area', () => {
    beforeEach(async () => {
      await renderWithPoints(3)
      await fireEvent.press(closeButton()!)
    })

    it('stops adding corners', async () => {
      await tapMap({latitude: 42.68, longitude: 23.4})

      expect(vertices()).toEqual(points)
      expect(closeButton()).toBeNull()
    })

    it('reopens the area on undo without losing a corner', async () => {
      await fireEvent.press(undoButton())

      expect(vertices()).toEqual(points)
      expect(closeButton()).toBeEnabled()

      await tapMap({latitude: 42.68, longitude: 23.4})
      expect(vertices()).toHaveLength(4)
    })
  })

  it('cannot close an area with fewer than three corners', async () => {
    await renderWithPoints(2)

    await fireEvent.press(closeButton()!)
    await tapMap(points[2])

    expect(vertices()).toEqual(points)
  })

  it('cannot confirm an area with fewer than three corners', async () => {
    await renderWithPoints(2)

    await fireEvent.press(confirmButton())

    expect(mockEmit).not.toHaveBeenCalled()
    expect(mockRouter.back).not.toHaveBeenCalled()
  })

  it('sends the area back as a closed GeoJSON ring and closes', async () => {
    await renderWithPoints(3)

    await fireEvent.press(confirmButton())

    expect(mockEmit).toHaveBeenCalledWith({
      filterType: 'area',
      polygon: {
        type: 'Polygon',
        coordinates: [
          [
            [23.3, 42.7],
            [23.35, 42.7],
            [23.33, 42.66],
            [23.3, 42.7],
          ],
        ],
      },
    })
    expect(mockRouter.back).toHaveBeenCalledTimes(1)
  })
})
