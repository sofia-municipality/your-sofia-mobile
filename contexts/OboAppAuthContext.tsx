import React, {createContext, useContext, useEffect, useMemo, useState} from 'react'
import type {User} from 'firebase/auth'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import {oboAuth} from '@/lib/oboapp/firebase'

interface OboAppAuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  getIdToken: () => Promise<string | null>
  isAuthenticated: boolean
}

const OboAppAuthContext = createContext<OboAppAuthContextType | undefined>(undefined)

export function OboAppAuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(oboAuth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(oboAuth, email, password)
  }

  const register = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(oboAuth, email, password)
  }

  const signOut = async () => {
    await firebaseSignOut(oboAuth)
  }

  const getIdToken = async () => {
    if (!user) {
      return null
    }

    return user.getIdToken()
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      signIn,
      register,
      signOut,
      getIdToken,
      isAuthenticated: !!user,
    }),
    [user, loading]
  )

  return <OboAppAuthContext.Provider value={value}>{children}</OboAppAuthContext.Provider>
}

export function useOboAppAuth() {
  const context = useContext(OboAppAuthContext)
  if (context === undefined) {
    throw new Error('useOboAppAuth must be used within an OboAppAuthProvider')
  }
  return context
}
