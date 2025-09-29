"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { setAccessToken } from './api'

interface User {
  user_id: number
  email?: string
  firstName?: string
  lastName?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (user: User, token?: string) => void
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on app start
    const savedAuth = localStorage.getItem('authContext')
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth)
        setUser(authData.user)
        setToken(authData.token)
        // ensure axios has the Authorization header set synchronously
        setAccessToken(authData.token ?? null)
      } catch (error) {
        console.error('Error parsing saved auth data:', error)
        localStorage.removeItem('authContext')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (userData: User, userToken?: string | null) => {
    setUser(userData)

    // If caller explicitly passed a token (including null) we should update/clear it.
    // If caller omitted the token (undefined), preserve the existing token.
    if (typeof userToken !== 'undefined') {
      setToken(userToken)
      setAccessToken(userToken ?? null)
    }

    // Persist current auth context: use the provided token when present, otherwise the current state token.
    const persistedToken = typeof userToken !== 'undefined' ? userToken : token
    const authData = { user: userData, token: persistedToken }
    try {
      localStorage.setItem('authContext', JSON.stringify(authData))
    } catch (e) {
      console.warn('Failed to persist auth context', e)
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setAccessToken(null)
    localStorage.removeItem('authContext')
    // Also clear remembered credentials when logging out
    localStorage.removeItem('rememberedEmail')
    localStorage.removeItem('rememberedPassword')
    localStorage.removeItem('rememberMe')
  }

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
