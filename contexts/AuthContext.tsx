import React, {createContext, useState, useContext, useEffect, ReactNode} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {Alert} from 'react-native'
import {router} from 'expo-router'
import {environmentManager} from '../lib/environment'
import {setAuthErrorHandler, updateSubscription} from '../lib/payload'
import {SUBSCRIPTION_ID_KEY} from '../lib/storageKeys'

interface User {
  id: number
  email: string
  name?: string
  role: 'user' | 'admin' | 'containerAdmin' | 'inspector' | 'wasteCollector'
}

export class AuthApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  resendVerificationEmail: (email: string) => Promise<void>
  isAuthenticated: boolean
  isContainerAdmin: boolean
  isBulkUploadAllowed: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'

type ApiErrorResponse = {
  message?: string
  errors?: Array<{
    message?: string
  }>
}

const extractApiErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const errorBody = (await response.json()) as ApiErrorResponse
    return errorBody?.errors?.[0]?.message || errorBody?.message || fallback
  } catch {
    return fallback
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()
  } catch {
    return true // treat malformed tokens as expired
  }
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load auth state from AsyncStorage on mount
  useEffect(() => {
    loadAuthState()

    // Register auth error handler that will logout and redirect to login
    setAuthErrorHandler(() => {
      console.log('[AuthContext] Token expired, logging out')
      Alert.alert('Session Expired', 'Your session has expired. Please log in again.', [
        {text: 'OK'},
      ])
      logout().finally(() => {
        router.push('/auth/login' as any)
      })
    })
  }, [])

  const loadAuthState = async () => {
    try {
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_USER_KEY),
      ])

      if (storedToken && storedUser) {
        if (isTokenExpired(storedToken)) {
          // Clear stale credentials so the user isn't silently treated as logged-in
          await Promise.all([
            AsyncStorage.removeItem(AUTH_TOKEN_KEY),
            AsyncStorage.removeItem(AUTH_USER_KEY),
          ])
        } else {
          setToken(storedToken)
          setUser(JSON.parse(storedUser))
        }
      }
    } catch (error) {
      console.error('Error loading auth state:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${environmentManager.getApiUrl()}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
      })

      if (!response.ok) {
        const message = await extractApiErrorMessage(response, 'Login failed')
        throw new AuthApiError(message, response.status)
      }

      const data = await response.json()

      // Store token and user data
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, data.token),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user)),
      ])

      setToken(data.token)
      setUser(data.user)

      // Link the device's anonymous subscription to this user (non-fatal)
      try {
        const subscriptionId = await AsyncStorage.getItem(SUBSCRIPTION_ID_KEY)
        if (subscriptionId) {
          await updateSubscription(subscriptionId, {user: data.user.id}, data.token)
        }
      } catch (linkErr) {
        console.warn('[AuthContext] Could not link subscription to user (non-fatal):', linkErr)
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${environmentManager.getApiUrl()}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role: 'user', // Default role for new registrations
        }),
      })

      if (!response.ok) {
        const message = await extractApiErrorMessage(response, 'Registration failed')
        throw new Error(message)
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
      ])

      setToken(null)
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const deleteAccount = async () => {
    try {
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${environmentManager.getApiUrl()}/api/users/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `JWT ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to delete account')
      }

      // After successful deletion, logout
      await logout()
    } catch (error) {
      console.error('Delete account error:', error)
      throw error
    }
  }

  const resendVerificationEmail = async (email: string) => {
    const response = await fetch(
      `${environmentManager.getApiUrl()}/api/users/resend-verification-email`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      }
    )
    if (!response.ok) {
      const message = await extractApiErrorMessage(response, 'Failed to resend verification email')
      throw new Error(message)
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    deleteAccount,
    resendVerificationEmail,
    isAuthenticated: !!user && !!token && !isTokenExpired(token),
    isContainerAdmin: user?.role === 'containerAdmin' || user?.role === 'admin',
    isBulkUploadAllowed: user?.role === 'admin' || user?.role === 'inspector',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
