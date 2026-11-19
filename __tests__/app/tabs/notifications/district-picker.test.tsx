import React from 'react'
import {act, fireEvent, render, screen} from '@testing-library/react-native'
import DistrictPickerScreen from '../../../../app/(tabs)/notifications/district-picker'
import {fetchCityDistricts} from '../../../../lib/payload'
import {emitNotificationFilter} from '../../../../lib/notificationFilterBridge'
import type {CityDistrict} from '../../../../types/subscription'

const mockTranslation = {t: (key: string) => key}

jest.mock('react-i18next', () => ({
  useTranslation: () => mockTranslation,
}))

const mockRouter = {back: jest.fn()}

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('lucide-react-native', () => {
  const {View} = require('react-native')
  return {Check: () => <View testID="icon-Check" />}
})

jest.mock('../../../../lib/payload', () => ({
  fetchCityDistricts: jest.fn(),
}))

jest.mock('../../../../lib/notificationFilterBridge', () => ({
  emitNotificationFilter: jest.fn(),
}))

const mockFetchDistricts = fetchCityDistricts as jest.Mock
const mockEmit = emitNotificationFilter as jest.Mock

const districts: CityDistrict[] = [
  {id: 1, name: 'Sredets', districtId: 1, code: 'SRS'},
  {id: 3, name: 'Lozenets', districtId: 12, code: 'LOZ'},
]

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const district = (label: string) => screen.getByRole('button', {name: label})
const confirmButton = () => screen.getByRole('button', {name: 'notifications.confirmLocation'})

async function renderPicker() {
  await render(<DistrictPickerScreen />)
  await act(() => sleep(0))
}

let consoleError: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockFetchDistricts.mockResolvedValue(districts)
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => consoleError.mockRestore())

describe('DistrictPickerScreen', () => {
  it('shows a spinner while the districts load', async () => {
    mockFetchDistricts.mockReturnValue(new Promise(() => {}))

    await render(<DistrictPickerScreen />)

    expect(screen.container.queryAll((node) => node.type === 'ActivityIndicator')).toHaveLength(1)
    expect(screen.queryByRole('button', {name: 'notifications.confirmLocation'})).toBeNull()
  })

  it('lists the districts with their codes', async () => {
    await renderPicker()

    expect(screen.getByText('Sredets')).toBeVisible()
    expect(screen.getByText('1')).toBeVisible()
    expect(district('12 Lozenets')).toBeVisible()
  })

  it('cannot confirm before a district is chosen', async () => {
    await renderPicker()

    await fireEvent.press(confirmButton())

    expect(confirmButton()).toBeDisabled()
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('selects one district at a time', async () => {
    await renderPicker()

    await fireEvent.press(district('1 Sredets'))
    await fireEvent.press(district('12 Lozenets'))

    expect(district('1 Sredets').props.accessibilityState).toEqual({selected: false})
    expect(district('12 Lozenets').props.accessibilityState).toEqual({selected: true})
    expect(screen.getAllByTestId('icon-Check')).toHaveLength(1)
    expect(confirmButton()).toBeEnabled()
  })

  it('unselects the district on a second press', async () => {
    await renderPicker()

    await fireEvent.press(district('1 Sredets'))
    await fireEvent.press(district('1 Sredets'))

    expect(district('1 Sredets').props.accessibilityState).toEqual({selected: false})
    expect(confirmButton()).toBeDisabled()
  })

  it('sends the district back and closes', async () => {
    await renderPicker()

    await fireEvent.press(district('12 Lozenets'))
    await fireEvent.press(confirmButton())

    expect(mockEmit).toHaveBeenCalledWith({
      filterType: 'district',
      district: {id: 3, name: 'Lozenets', districtId: 12},
    })
    expect(mockRouter.back).toHaveBeenCalledTimes(1)
  })

  it('logs a failed load and shows an empty list', async () => {
    const failure = new Error('offline')
    mockFetchDistricts.mockRejectedValue(failure)

    await renderPicker()

    expect(consoleError).toHaveBeenCalledWith(failure)
    expect(screen.queryByText('Sredets')).toBeNull()
    expect(confirmButton()).toBeDisabled()
  })
})
