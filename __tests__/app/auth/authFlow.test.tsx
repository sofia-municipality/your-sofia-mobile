// Navigation through the auth screens with the real expo-router stack.
import React from 'react'
import {Alert, AlertButton, Text, TouchableOpacity} from 'react-native'
import {Stack, useRouter} from 'expo-router'
import {act, fireEvent, renderRouter, screen, waitFor} from 'expo-router/testing-library'
import LoginScreen from '../../../app/auth/login'
import RegisterScreen from '../../../app/auth/register'
import ForgotPasswordScreen from '../../../app/auth/forgot-password'

const mockLogin = jest.fn()
const mockRegister = jest.fn()

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: () => ({login: mockLogin, register: mockRegister, resendVerificationEmail: jest.fn()}),
}))

jest.mock('lucide-react-native', () => ({
  LogIn: () => null,
  MailWarning: () => null,
  UserPlus: () => null,
}))

jest.mock('../../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

function ProfileScreen() {
  const router = useRouter()
  return (
    <TouchableOpacity onPress={() => router.push('/auth/login')}>
      <Text>Log in from profile</Text>
    </TouchableOpacity>
  )
}

async function renderApp() {
  await renderRouter({
    _layout: () => <Stack />,
    index: ProfileScreen,
    'auth/login': LoginScreen,
    'auth/register': RegisterScreen,
    'auth/forgot-password': ForgotPasswordScreen,
  })
  await fireEvent.press(screen.getByText('Log in from profile'))
  expect(screen).toHavePathname('/auth/login')
}

async function logIn() {
  await fireEvent.changeText(screen.getByLabelText('auth.email'), 'ivan@abv.bg')
  await fireEvent.changeText(screen.getByLabelText('auth.password'), 'Secret1!')
  await fireEvent.press(screen.getByRole('button', {name: 'auth.login'}))
}

describe('auth navigation', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockLogin.mockResolvedValue(undefined)
    mockRegister.mockResolvedValue(undefined)
    global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({})}) as never
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  it('returns to where the user started after logging in', async () => {
    await renderApp()

    await logIn()

    await waitFor(() => expect(screen).toHavePathname('/'))
  })

  it('returns to the login screen from registration', async () => {
    await renderApp()
    await fireEvent.press(screen.getByRole('button', {name: 'auth.register'}))
    expect(screen).toHavePathname('/auth/register')

    await fireEvent.press(screen.getByRole('button', {name: 'auth.login'}))

    expect(screen).toHavePathname('/auth/login')
  })

  // BUG: after registering, the confirmation's "Log in" button calls
  // router.replace('/auth/login') although the register screen was pushed on
  // top of a login screen. The stack ends up with two login screens, so after a
  // successful login router.back() lands on the old login screen instead of
  // where the user started.
  it.failing('returns to where the user started after registering and logging in', async () => {
    await renderApp()
    await fireEvent.press(screen.getByRole('button', {name: 'auth.register'}))
    await fireEvent.changeText(screen.getByLabelText('auth.name'), 'Ivan')
    await fireEvent.changeText(screen.getByLabelText('auth.email'), 'ivan@abv.bg')
    await fireEvent.changeText(screen.getByLabelText('auth.password'), 'Secret1!')
    await fireEvent.changeText(screen.getByLabelText('auth.confirmPassword'), 'Secret1!')
    await fireEvent.press(screen.getByRole('button', {name: 'auth.register'}))
    const [, , buttons] = alertSpy.mock.calls[0] as [string, string, AlertButton[]]
    await act(async () => buttons[0].onPress!())
    expect(screen).toHavePathname('/auth/login')

    await logIn()

    await waitFor(() => expect(mockLogin).toHaveBeenCalled())
    await waitFor(() => expect(screen).toHavePathname('/'))
  })

  // BUG: the "Log in" buttons on the forgot password screen push a new login
  // screen instead of going back to the one that opened it, so after logging in
  // router.back() lands on the forgot password screen.
  it.failing(
    'returns to where the user started after resetting the password and logging in',
    async () => {
      await renderApp()
      await fireEvent.press(screen.getByRole('button', {name: 'auth.forgotPassword'}))
      await fireEvent.changeText(screen.getByLabelText('auth.email'), 'ivan@abv.bg')
      await fireEvent.press(screen.getByRole('button', {name: 'auth.forgotPassword'}))
      await fireEvent.press(screen.getByRole('button', {name: 'auth.login'}))
      expect(screen).toHavePathname('/auth/login')

      await logIn()

      await waitFor(() => expect(mockLogin).toHaveBeenCalled())
      await waitFor(() => expect(screen).toHavePathname('/'))
    }
  )
})
