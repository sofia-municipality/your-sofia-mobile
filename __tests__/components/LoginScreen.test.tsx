import React from 'react'
import {render, fireEvent, waitFor, act} from '@testing-library/react-native'
import LoginScreen from '../../app/auth/login'
import {AuthApiError} from '../../contexts/AuthContext'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockLogin = jest.fn()
const mockResendVerificationEmail = jest.fn()
const mockBack = jest.fn()
const mockReplace = jest.fn()
const mockPush = jest.fn()

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({back: mockBack, replace: mockReplace, push: mockPush}),
  useLocalSearchParams: () => ({}),
}))

jest.mock('../../contexts/AuthContext', () => {
  const actual = jest.requireActual('../../contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      resendVerificationEmail: mockResendVerificationEmail,
    }),
  }
})

jest.mock('lucide-react-native', () => ({
  LogIn: () => null,
  MailWarning: () => null,
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderLogin() {
  return render(<LoginScreen />)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
})

describe('LoginScreen', () => {
  describe('normal login flow', () => {
    it('renders email and password inputs', () => {
      const {getByLabelText} = renderLogin()
      expect(getByLabelText('auth.email')).toBeTruthy()
      expect(getByLabelText('auth.password')).toBeTruthy()
    })

    it('calls login with entered credentials on button press', async () => {
      mockLogin.mockResolvedValueOnce(undefined)
      const {getByLabelText, getByRole} = renderLogin()

      fireEvent.changeText(getByLabelText('auth.email'), 'user@example.com')
      fireEvent.changeText(getByLabelText('auth.password'), 'secret123')
      fireEvent.press(getByRole('button', {name: 'auth.login'}))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'secret123')
      })
    })

    it('navigates back after successful login', async () => {
      mockLogin.mockResolvedValueOnce(undefined)
      const {getByLabelText, getByRole} = renderLogin()

      fireEvent.changeText(getByLabelText('auth.email'), 'user@example.com')
      fireEvent.changeText(getByLabelText('auth.password'), 'secret')
      fireEvent.press(getByRole('button', {name: 'auth.login'}))

      await waitFor(() => {
        expect(mockBack).toHaveBeenCalled()
      })
    })
  })

  describe('unverified account (403)', () => {
    it('shows unverified panel when login returns AuthApiError with status 403', async () => {
      mockLogin.mockRejectedValueOnce(new AuthApiError('Unverified email', 403))
      const {getByLabelText, getByRole, queryByRole} = renderLogin()

      fireEvent.changeText(getByLabelText('auth.email'), 'unverified@example.com')
      fireEvent.changeText(getByLabelText('auth.password'), 'secret')
      fireEvent.press(getByRole('button', {name: 'auth.login'}))

      await waitFor(() => {
        expect(queryByRole('button', {name: 'auth.resendVerificationEmail'})).toBeTruthy()
      })
    })

    it('hides unverified panel on a subsequent successful login attempt', async () => {
      mockLogin
        .mockRejectedValueOnce(new AuthApiError('Unverified email', 403))
        .mockResolvedValueOnce(undefined)

      const {getByLabelText, getByRole, queryByRole} = renderLogin()

      // First attempt → show panel
      fireEvent.changeText(getByLabelText('auth.email'), 'unverified@example.com')
      fireEvent.changeText(getByLabelText('auth.password'), 'secret')
      fireEvent.press(getByRole('button', {name: 'auth.login'}))

      await waitFor(() => {
        expect(queryByRole('button', {name: 'auth.resendVerificationEmail'})).toBeTruthy()
      })

      // Second attempt → panel disappears
      fireEvent.press(getByRole('button', {name: 'auth.login'}))
      await waitFor(() => {
        expect(queryByRole('button', {name: 'auth.resendVerificationEmail'})).toBeNull()
      })
    })

    it('calls resendVerificationEmail with current email when resend button is pressed', async () => {
      mockLogin.mockRejectedValueOnce(new AuthApiError('Unverified email', 403))
      mockResendVerificationEmail.mockResolvedValueOnce(undefined)

      const {getByLabelText, getByRole} = renderLogin()

      fireEvent.changeText(getByLabelText('auth.email'), 'unverified@example.com')
      fireEvent.changeText(getByLabelText('auth.password'), 'secret')
      fireEvent.press(getByRole('button', {name: 'auth.login'}))

      await waitFor(() => {
        expect(getByRole('button', {name: 'auth.resendVerificationEmail'})).toBeTruthy()
      })

      await act(async () => {
        fireEvent.press(getByRole('button', {name: 'auth.resendVerificationEmail'}))
      })

      expect(mockResendVerificationEmail).toHaveBeenCalledWith('unverified@example.com')
    })

    it('does not show unverified panel for non-403 errors', async () => {
      mockLogin.mockRejectedValueOnce(new AuthApiError('Wrong password', 401))
      const {getByLabelText, getByRole, queryByRole} = renderLogin()

      fireEvent.changeText(getByLabelText('auth.email'), 'user@example.com')
      fireEvent.changeText(getByLabelText('auth.password'), 'wrong')
      fireEvent.press(getByRole('button', {name: 'auth.login'}))

      await waitFor(() => {
        expect(queryByRole('button', {name: 'auth.resendVerificationEmail'})).toBeNull()
      })
    })
  })
})
