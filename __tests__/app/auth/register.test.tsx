import React from 'react'
import {Alert, AlertButton} from 'react-native'
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react-native'
import RegisterScreen from '../../../app/auth/register'

const mockRegister = jest.fn()
const mockRouter = {back: jest.fn(), replace: jest.fn(), push: jest.fn()}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({register: mockRegister}),
}))

jest.mock('lucide-react-native', () => ({
  UserPlus: () => null,
}))

const VALID = {name: 'Ivan Petrov', email: 'ivan@abv.bg', password: 'Secret1!'}

const registerButton = () => screen.getByRole('button', {name: 'auth.register'})
const spinners = () => screen.container.queryAll((n) => n.type === 'ActivityIndicator')

async function fillIn({
  name = VALID.name,
  email = VALID.email,
  password = VALID.password,
  confirmPassword = password,
}: Partial<typeof VALID & {confirmPassword: string}> = {}) {
  await fireEvent.changeText(screen.getByLabelText('auth.name'), name)
  await fireEvent.changeText(screen.getByLabelText('auth.email'), email)
  await fireEvent.changeText(screen.getByLabelText('auth.password'), password)
  await fireEvent.changeText(screen.getByLabelText('auth.confirmPassword'), confirmPassword)
}

describe('RegisterScreen', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  })

  afterEach(() => {
    alertSpy.mockRestore()
  })

  it('shows the registration form', async () => {
    await render(<RegisterScreen />)

    expect(screen.getByText('auth.registerSubtitle')).toBeOnTheScreen()
    for (const label of ['auth.name', 'auth.email', 'auth.password', 'auth.confirmPassword']) {
      expect(screen.getByLabelText(label)).toBeOnTheScreen()
    }
  })

  it('hides both passwords', async () => {
    await render(<RegisterScreen />)

    expect(screen.getByLabelText('auth.password')).toHaveProp('secureTextEntry', true)
    expect(screen.getByLabelText('auth.confirmPassword')).toHaveProp('secureTextEntry', true)
  })

  describe('validation', () => {
    it.each([
      ['name', {name: ''}],
      ['email', {email: ''}],
      ['password', {password: '', confirmPassword: 'Secret1!'}],
      ['password confirmation', {confirmPassword: ''}],
    ])('requires the %s', async (_field, values) => {
      await render(<RegisterScreen />)
      await fillIn(values)

      await fireEvent.press(registerButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.fillAllFields')
      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('requires the passwords to match', async () => {
      await render(<RegisterScreen />)
      await fillIn({confirmPassword: 'Secret2!'})

      await fireEvent.press(registerButton())

      expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.passwordsDoNotMatch')
      expect(mockRegister).not.toHaveBeenCalled()
    })

    it.each([
      ['at least 6 characters', 'Se1!', 'auth.passwordTooShort'],
      ['a lowercase letter', 'SECRET1!', 'auth.passwordNeedsLowercase'],
      ['an uppercase letter', 'secret1!', 'auth.passwordNeedsUppercase'],
      ['a digit', 'Secret!!', 'auth.passwordNeedsDigit'],
      ['a special character', 'Secret12', 'auth.passwordNeedsSpecialChar'],
    ])('requires a password with %s', async (_rule, password, message) => {
      await render(<RegisterScreen />)
      await fillIn({password})

      await fireEvent.press(registerButton())

      expect(alertSpy).toHaveBeenCalledTimes(1)
      expect(alertSpy).toHaveBeenCalledWith('common.error', message)
      expect(mockRegister).not.toHaveBeenCalled()
    })

    it('accepts a password with exactly 6 characters', async () => {
      mockRegister.mockResolvedValueOnce(undefined)
      await render(<RegisterScreen />)
      await fillIn({password: 'Ab1!cd'})

      await fireEvent.press(registerButton())

      expect(mockRegister).toHaveBeenCalledWith(VALID.name, VALID.email, 'Ab1!cd')
    })
  })

  it('registers and asks the user to verify the email', async () => {
    mockRegister.mockResolvedValueOnce(undefined)
    await render(<RegisterScreen />)
    await fillIn()

    await fireEvent.press(registerButton())

    expect(mockRegister).toHaveBeenCalledWith(VALID.name, VALID.email, VALID.password)
    expect(alertSpy).toHaveBeenCalledWith('auth.verifyEmailTitle', 'auth.verifyEmailMessage', [
      expect.objectContaining({text: 'auth.login'}),
    ])
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it('opens the login screen from the confirmation', async () => {
    mockRegister.mockResolvedValueOnce(undefined)
    await render(<RegisterScreen />)
    await fillIn()
    await fireEvent.press(registerButton())

    const [, , buttons] = alertSpy.mock.calls[0] as [string, string, AlertButton[]]
    buttons[0].onPress!()

    expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login')
  })

  it('shows the error message when registration fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Email already registered'))
    await render(<RegisterScreen />)
    await fillIn()

    await fireEvent.press(registerButton())

    expect(alertSpy).toHaveBeenCalledWith('common.error', 'Email already registered')
  })

  it('shows a generic message when the failure is not an Error', async () => {
    mockRegister.mockRejectedValueOnce('boom')
    await render(<RegisterScreen />)
    await fillIn()

    await fireEvent.press(registerButton())

    expect(alertSpy).toHaveBeenCalledWith('common.error', 'auth.registerFailed')
  })

  it('locks the form while registering', async () => {
    let fail!: (error: Error) => void
    mockRegister.mockReturnValueOnce(new Promise((_resolve, reject) => (fail = reject)))
    await render(<RegisterScreen />)
    await fillIn()

    const submitted = fireEvent.press(registerButton())

    await waitFor(() => expect(registerButton()).toBeDisabled())
    expect(spinners()).toHaveLength(1)
    expect(screen.getByLabelText('auth.name')).toHaveProp('editable', false)
    expect(screen.getByLabelText('auth.confirmPassword')).toHaveProp('editable', false)
    expect(screen.getByRole('button', {name: 'auth.login'})).toBeDisabled()

    await act(async () => fail(new Error('offline')))
    await submitted

    expect(registerButton()).toBeEnabled()
    expect(spinners()).toHaveLength(0)
  })

  it('goes back to the login screen', async () => {
    await render(<RegisterScreen />)

    await fireEvent.press(screen.getByRole('button', {name: 'auth.login'}))

    expect(mockRouter.back).toHaveBeenCalledTimes(1)
  })
})
