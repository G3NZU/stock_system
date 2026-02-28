'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthSession, User, UserRole, saveSession, getSession, clearSession, isSessionValid } from './auth'

interface AuthContextType {
  session: AuthSession | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, role: UserRole) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize session from localStorage on mount
  useEffect(() => {
    const stored = getSession()
    if (isSessionValid(stored)) {
      setSession(stored)
    } else {
      clearSession()
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true)
    try {
      // TODO: Replace with real API call to backend
      const { mockLoginUser } = await import('./auth')
      const newSession = await mockLoginUser(email, password, role)
      setSession(newSession)
      saveSession(newSession)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setSession(null)
    clearSession()
  }

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    isLoading,
    isAuthenticated: !!session,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
