// The login happy path and the unverified-account panel are covered in
// __tests__/components/LoginScreen.test.tsx. This file covers the rest.
import React from 'react'
import {Alert} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import LoginScreen from '../../../app/auth/login'
import {AuthApiError} from '../../../contexts/AuthContext'

const mockLogin = jest.fn()
const mockResendVerificationEmail = jest.fn()
const mockRouter = {back: jest.fn(), replace: jest.fn(), push: jest.fn()}
let mockParams: {returnTo?: string} = {}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}))

jest.mock('../../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../../contexts/AuthContext'),
  useAuth: () => ({login: mockLogin, resendVerificationEmail: mockResendVerificationEmail}),
}))

jest.mock('lucide-react-native', () => ({
  LogIn: () => null,
  MailWarning: () => null,
}))

function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return {promise, resolve, reject}
}

const loginButton = () => screen.getByRole('button', {name: 'auth.login'})
const resendButton = () => screen.getByRole('button', {name: 'auth.resendVerificationEmail'})
const spinners = () => screen.container.queryAll((n) => n.type === 'ActivityIndicator')

async function fillIn(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('auth.email'), email)
  await fireEvent.changeText(screen.getByLabelText('auth.password'), password)
}

async function showUnverifiedPanel() {
  mockLogin.mockRejectedValueOnce(new AuthApiError('Unverified email', 403))
  await render(<LoginScreen />)
  await fillIn('ivan@abv.bg', 'Secret1!')
  await fireEvent.press(loginButton())
  await waitFor(() => expect(resendButton()).toBeOnTheScreen())
}

describe('LoginScreen', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    mockParams = {}
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  it('shows the title and subtitle', async () => {
    await render(<LoginScreen />)

    expect(screen.getByText('auth.loginSubtitle')).toBeOnTheScreen()
  })

  it.each([
    ['the email', '', 'Secret1!'],
    ['the password', 'ivan@abv.bg', ''],
    ['both fields', '', ''],
  ])('asks to fill in %s before logging in', async (_missing, email, password) => {
    await render(<LoginScreen />)
    await fillIn(email, password)

    await fireEvent.press(loginButton())

    expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.fillAllFields')
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('returns to the screen that asked for the login', async () => {
    mockParams = {returnTo: '/(tabs)/new/new-signal'}
    mockLogin.mockResolvedValueOnce(undefined)
    await render(<LoginScreen />)
    await fillIn('ivan@abv.bg', 'Secret1!')

    await fireEvent.press(loginButton())

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/new/new-signal'))
    expect(mockRouter.back).not.toHaveBeenCalled()
  })

  it('shows the error message when the login fails', async () => {
    mockLogin.mockRejectedValueOnce(new AuthApiError('Invalid credentials', 401))
    await render(<LoginScreen />)
    await fillIn('ivan@abv.bg', 'wrong')

    await fireEvent.press(loginButton())

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith('common.error', 'Invalid credentials')
    )
    expect(mockRouter.back).not.toHaveBeenCalled()
  })

  it('shows a generic message when the failure is not an Error', async () => {
    mockLogin.mockRejectedValueOnce('boom')
    await render(<LoginScreen />)
    await fillIn('ivan@abv.bg', 'Secret1!')

    await fireEvent.press(loginButton())

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.loginFailed'))
  })

  it('locks the form while logging in', async () => {
    const request = deferred()
    mockLogin.mockReturnValueOnce(request.promise)
    await render(<LoginScreen />)
    await fillIn('ivan@abv.bg', 'Secret1!')

    const submitted = fireEvent.press(loginButton())

    await waitFor(() => expect(loginButton()).toBeDisabled())
    expect(spinners()).toHaveLength(1)
    expect(screen.getByLabelText('auth.email')).toHaveProp('editable', false)
    expect(screen.getByLabelText('auth.password')).toHaveProp('editable', false)
    expect(screen.getByRole('button', {name: 'auth.forgotPassword'})).toBeDisabled()
    expect(screen.getByRole('button', {name: 'auth.register'})).toBeDisabled()

    await act(async () => request.reject(new Error('offline')))
    await submitted

    expect(loginButton()).toBeEnabled()
    expect(spinners()).toHaveLength(0)
    expect(screen.getByLabelText('auth.email')).toHaveProp('editable', true)
  })

  it('opens the forgot password screen', async () => {
    await render(<LoginScreen />)

    await fireEvent.press(screen.getByRole('button', {name: 'auth.forgotPassword'}))

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/forgot-password')
  })

  it('opens the registration screen', async () => {
    await render(<LoginScreen />)

    await fireEvent.press(screen.getByRole('button', {name: 'auth.register'}))

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/register')
  })

  describe('resending the verification email', () => {
    it('explains why the account cannot log in yet', async () => {
      await showUnverifiedPanel()

      expect(screen.getByText('auth.unverifiedAccountTitle')).toBeOnTheScreen()
      expect(screen.getByText('auth.unverifiedAccountMessage')).toBeOnTheScreen()
      expect(alertSpy).not.toHaveBeenCalled()
    })

    it('confirms that the email was sent', async () => {
      mockResendVerificationEmail.mockResolvedValueOnce(undefined)
      await showUnverifiedPanel()

      await fireEvent.press(resendButton())

      expect(alertSpy).toHaveBeenCalledWith(
        'auth.verifyEmailTitle',
        'auth.resendVerificationSuccess'
      )
    })

    it('reports when the email could not be sent', async () => {
      mockResendVerificationEmail.mockRejectedValueOnce(new Error('429'))
      await showUnverifiedPanel()

      await fireEvent.press(resendButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.resendVerificationFailed')
    })

    it('asks for the email when the field was cleared', async () => {
      await showUnverifiedPanel()
      await fireEvent.changeText(screen.getByLabelText('auth.email'), '')

      await fireEvent.press(resendButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.enterEmailToResendVerification')
      expect(mockResendVerificationEmail).not.toHaveBeenCalled()
    })

    it('disables the button while sending', async () => {
      const request = deferred()
      mockResendVerificationEmail.mockReturnValueOnce(request.promise)
      await showUnverifiedPanel()

      const pressed = fireEvent.press(resendButton())

      await waitFor(() => expect(resendButton()).toBeDisabled())
      expect(spinners()).toHaveLength(1)

      await act(async () => request.resolve())
      await pressed

      expect(resendButton()).toBeEnabled()
      expect(spinners()).toHaveLength(0)
    })
  })
})
