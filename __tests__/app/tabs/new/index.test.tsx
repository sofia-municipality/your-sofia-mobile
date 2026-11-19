import React from 'react'
import {fireEvent, render, screen} from '@testing-library/react-native'
import NewScreen from '../../../../app/(tabs)/new/index'
import {useAuth} from '../../../../contexts/AuthContext'
import en from '../../../../translations/en'
import bg from '../../../../translations/bg'

const mockPush = jest.fn()

const mockUsedKeys = new Set<string>()

jest.mock('expo-router', () => ({
  useRouter: () => ({push: mockPush}),
}))

jest.mock('react-i18next', () => {
  const t = (key: string) => {
    mockUsedKeys.add(key)
    return key
  }
  return {useTranslation: () => ({t})}
})

jest.mock('../../../../contexts/AuthContext', () => ({useAuth: jest.fn()}))

const mockUseAuth = useAuth as jest.Mock

async function renderScreen(auth: {isAuthenticated?: boolean; isBulkUploadAllowed?: boolean}) {
  mockUseAuth.mockReturnValue({isAuthenticated: false, isBulkUploadAllowed: false, ...auth})
  await render(<NewScreen />)
}

const OPTIONS = [
  ['new.newSignal', 'new-signal'],
  ['new.newCityObject', 'new-city-object'],
  ['new.bulkPhotoUpload', 'bulk-photo-upload'],
] as const

describe('NewScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('offers a new signal and a new city object with their descriptions', async () => {
    await renderScreen({isAuthenticated: true})

    expect(screen.getByRole('button', {name: 'new.newSignal'})).toBeOnTheScreen()
    expect(screen.getByText('new.newSignalDescription')).toBeOnTheScreen()
    expect(screen.getByRole('button', {name: 'new.newCityObject'})).toBeOnTheScreen()
    expect(screen.getByText('new.newCityObjectDescription')).toBeOnTheScreen()
  })

  it('hides bulk photo upload from users who are not allowed to use it', async () => {
    await renderScreen({isAuthenticated: true, isBulkUploadAllowed: false})

    expect(screen.queryByRole('button', {name: 'new.bulkPhotoUpload'})).toBeNull()
  })

  it('offers bulk photo upload to users who are allowed to use it', async () => {
    await renderScreen({isAuthenticated: true, isBulkUploadAllowed: true})

    expect(screen.getByRole('button', {name: 'new.bulkPhotoUpload'})).toBeOnTheScreen()
    expect(screen.getByText('new.bulkPhotoUploadDescription')).toBeOnTheScreen()
  })

  it.each(OPTIONS)('opens %s for a signed-in user', async (label, route) => {
    await renderScreen({isAuthenticated: true, isBulkUploadAllowed: true})

    await fireEvent.press(screen.getByRole('button', {name: label}))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith(`../(tabs)/new/${route}`)
  })

  it.each(OPTIONS)(
    'sends a signed-out user to log in before %s and back afterwards',
    async (label, route) => {
      await renderScreen({isAuthenticated: false, isBulkUploadAllowed: true})

      await fireEvent.press(screen.getByRole('button', {name: label}))

      expect(mockPush).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/auth/login',
        params: {returnTo: `/(tabs)/new/${route}`},
      })
    }
  )

  // Runs last: checks every key the tests above passed to t().
  it('has an English and a Bulgarian text for every key it uses', () => {
    const lookup = (dict: object, key: string) =>
      key.split('.').reduce<any>((node, part) => node?.[part], dict)
    const missing = [...mockUsedKeys].filter(
      (key) => typeof lookup(en, key) !== 'string' || typeof lookup(bg, key) !== 'string'
    )

    expect(mockUsedKeys.size).toBeGreaterThan(5)
    expect(missing).toEqual([])
  })
})
