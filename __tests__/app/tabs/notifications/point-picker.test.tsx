import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import PointPickerScreen from '../../../../app/(tabs)/notifications/point-picker'
import {emitNotificationFilter} from '../../../../lib/notificationFilterBridge'

const mockTranslation = {
  t: (key: string) =>
    ({'notifications.radiusKm': '{{n}} km', 'notifications.radiusM': '{{n}} m'})[key] ?? key,
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
    Marker: (props: object) => <View testID="marker" {...props} />,
  }
})

jest.mock('../../../../lib/notificationFilterBridge', () => ({
  emitNotificationFilter: jest.fn(),
}))

const mockEmit = emitNotificationFilter as jest.Mock

const map = () => screen.getByTestId('map')
const confirmButton = () => screen.getByRole('button', {name: 'notifications.confirmLocation'})
const radius = (label: string) => screen.getByRole('button', {name: label})
const tapMap = (coordinate?: {latitude: number; longitude: number}) =>
  fireEvent(map(), 'press', {nativeEvent: {coordinate}})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PointPickerScreen', () => {
  it('starts over central Sofia with no point', async () => {
    await render(<PointPickerScreen />)

    expect(map().props.initialRegion).toEqual({
      latitude: 42.6977,
      longitude: 23.3219,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    })
    expect(screen.queryByTestId('marker')).toBeNull()
    expect(screen.getByText('notifications.pickPoint')).toBeVisible()
  })

  it('offers radii from 500 m to 10 km, 1 km by default', async () => {
    await render(<PointPickerScreen />)

    const labels = ['500 m', '1 km', '2 km', '3 km', '5 km', '10 km']
    expect(labels.map((label) => radius(label).props.accessibilityState)).toEqual([
      {selected: false},
      {selected: true},
      {selected: false},
      {selected: false},
      {selected: false},
      {selected: false},
    ])
  })

  it('drops a draggable marker where the map is tapped', async () => {
    await render(<PointPickerScreen />)

    await tapMap({latitude: 42.684512, longitude: 23.318768})

    expect(screen.getByTestId('marker').props).toMatchObject({
      coordinate: {latitude: 42.684512, longitude: 23.318768},
      draggable: true,
    })
    expect(screen.getByText('42.68451, 23.31877')).toBeVisible()
  })

  it('ignores a tap without a coordinate', async () => {
    await render(<PointPickerScreen />)

    await tapMap(undefined)

    expect(screen.queryByTestId('marker')).toBeNull()
  })

  it('moves the point when the marker is dragged', async () => {
    await render(<PointPickerScreen />)
    await tapMap({latitude: 42.68, longitude: 23.31})

    await fireEvent(screen.getByTestId('marker'), 'dragEnd', {
      nativeEvent: {coordinate: {latitude: 42.7, longitude: 23.35}},
    })

    expect(screen.getByTestId('marker').props.coordinate).toEqual({
      latitude: 42.7,
      longitude: 23.35,
    })
  })

  it('cannot confirm before a point is chosen', async () => {
    await render(<PointPickerScreen />)

    await fireEvent.press(confirmButton())

    expect(confirmButton()).toBeDisabled()
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('sends the point with the chosen radius back and closes', async () => {
    await render(<PointPickerScreen />)
    await tapMap({latitude: 42.68, longitude: 23.31})
    await fireEvent.press(radius('500 m'))

    await fireEvent.press(confirmButton())

    expect(radius('500 m').props.accessibilityState).toEqual({selected: true})
    expect(mockEmit).toHaveBeenCalledWith({
      filterType: 'point',
      latitude: 42.68,
      longitude: 23.31,
      radius: 500,
    })
    expect(mockRouter.back).toHaveBeenCalledTimes(1)
  })

  it('uses 1 km when the radius was not changed', async () => {
    await render(<PointPickerScreen />)
    await tapMap({latitude: 42.68, longitude: 23.31})

    await fireEvent.press(confirmButton())

    expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({radius: 1000}))
  })
})
