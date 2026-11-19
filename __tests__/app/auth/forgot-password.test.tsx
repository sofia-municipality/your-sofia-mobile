import React from 'react'
import {Alert} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import ForgotPasswordScreen from '../../../app/auth/forgot-password'

const mockRouter = {back: jest.fn(), replace: jest.fn(), push: jest.fn()}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('lucide-react-native', () => ({
  MailWarning: () => null,
}))

jest.mock('../../../lib/environment', () => ({
  environmentManager: {getApiUrl: () => 'https://api.test'},
}))

const submitButton = () => screen.getByRole('button', {name: 'auth.forgotPassword'})
const spinners = () => screen.container.queryAll((n) => n.type === 'ActivityIndicator')
const fetchMock = () => global.fetch as jest.Mock

async function submit(email = 'ivan@abv.bg') {
  await fireEvent.changeText(screen.getByLabelText('auth.email'), email)
  await fireEvent.press(submitButton())
}

describe('ForgotPasswordScreen', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ok: true, json: async () => ({})}) as never
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  it('asks for the email address', async () => {
    await render(<ForgotPasswordScreen />)

    expect(screen.getByText('auth.forgotPasswordSubtitle')).toBeOnTheScreen()
    expect(screen.getByLabelText('auth.email')).toBeOnTheScreen()
    expect(screen.getByText('auth.forgotPasswordButton')).toBeOnTheScreen()
  })

  it('requires an email', async () => {
    await render(<ForgotPasswordScreen />)

    await fireEvent.press(submitButton())

    expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.enterEmailToResetPassword')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('requests a reset link and confirms it was sent', async () => {
    await render(<ForgotPasswordScreen />)

    await submit()

    expect(global.fetch).toHaveBeenCalledWith('https://api.test/api/users/forgot-password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: 'ivan@abv.bg'}),
    })
    expect(screen.getByText('auth.forgotPasswordSuccess')).toBeOnTheScreen()
    expect(screen.queryByLabelText('auth.email')).toBeNull()
  })

  it('opens the login screen after the link was sent', async () => {
    await render(<ForgotPasswordScreen />)
    await submit()

    await fireEvent.press(screen.getByRole('button', {name: 'auth.login'}))

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
  })

  it('shows the API error message', async () => {
    fetchMock().mockResolvedValueOnce({
      ok: false,
      json: async () => ({message: 'Too many requests'}),
    })
    await render(<ForgotPasswordScreen />)

    await submit()

    expect(alertSpy).toHaveBeenCalledWith('common.error', 'Too many requests')
    expect(screen.queryByText('auth.forgotPasswordSuccess')).toBeNull()
  })

  it.each([
    ['has no message', async () => ({})],
    [
      'is not JSON',
      async () => {
        throw new SyntaxError('Unexpected <')
      },
    ],
  ])('shows a generic message when the error body %s', async (_case, json) => {
    fetchMock().mockResolvedValueOnce({ok: false, json})
    await render(<ForgotPasswordScreen />)

    await submit()

    expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.forgotPasswordFailed')
  })

  it('reports network failures', async () => {
    fetchMock().mockRejectedValueOnce(new TypeError('Network request failed'))
    await render(<ForgotPasswordScreen />)

    await submit()

    expect(alertSpy).toHaveBeenCalledWith('common.error', 'Network request failed')
    expect(screen.getByLabelText('auth.email')).toBeOnTheScreen()
  })

  it('locks the form while sending', async () => {
    let respond!: (response: unknown) => void
    fetchMock().mockReturnValueOnce(new Promise((resolve) => (respond = resolve)))
    await render(<ForgotPasswordScreen />)
    await fireEvent.changeText(screen.getByLabelText('auth.email'), 'ivan@abv.bg')

    const submitted = fireEvent.press(submitButton())

    await waitFor(() => expect(submitButton()).toBeDisabled())
    expect(spinners()).toHaveLength(1)
    expect(screen.getByLabelText('auth.email')).toHaveProp('editable', false)
    expect(screen.getByRole('button', {name: 'auth.login'})).toBeDisabled()

    await act(async () => respond({ok: false, json: async () => ({})}))
    await submitted

    expect(submitButton()).toBeEnabled()
    expect(spinners()).toHaveLength(0)
  })

  it('opens the login screen from the link below the form', async () => {
    await render(<ForgotPasswordScreen />)

    await fireEvent.press(screen.getByRole('button', {name: 'auth.login'}))

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
  })
})
