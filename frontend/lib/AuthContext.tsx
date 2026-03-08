'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, UserRole } from './auth'
import { supabase } from './supabase'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const ROLE_PRIORITY: Record<string, number> = { admin: 4, warehouse: 3, manager: 2, buyer: 1 }
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000
const ROLE_FETCH_TIMEOUT_MS = 5000

function mapDbRole(dbRole: string): UserRole {
  if (dbRole === 'warehouse') return 'warehouse_operator'
  return dbRole as UserRole
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs)
    promise
      .then((value) => {
        clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error: unknown) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

async function fetchUserRole(userId: string): Promise<UserRole> {
  const { data } = await supabase
    .from('project_user_roles')
    .select('roles(name)')
    .eq('user_id', userId)

  if (!data || data.length === 0) return 'buyer'

  let highestRole = 'buyer'
  for (const row of data) {
    const rawRoles = (row as Record<string, unknown>).roles
    let roleName: string | undefined
    if (Array.isArray(rawRoles)) {
      roleName = (rawRoles[0] as { name?: string } | undefined)?.name
    } else if (rawRoles && typeof rawRoles === 'object') {
      roleName = (rawRoles as { name?: string }).name
    }
    if (roleName && (ROLE_PRIORITY[roleName] ?? 0) > (ROLE_PRIORITY[highestRole] ?? 0)) {
      highestRole = roleName
    }
  }
  return mapDbRole(highestRole)
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const loadingGuard = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false)
      }
    }, AUTH_BOOTSTRAP_TIMEOUT_MS)

    const initializeSession = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_BOOTSTRAP_TIMEOUT_MS,
          'Timed out while initializing authentication session.'
        )

        if (!isMounted) return

        if (session?.user) {
          const role = await withTimeout(
            fetchUserRole(session.user.id),
            ROLE_FETCH_TIMEOUT_MS,
            'Timed out while resolving user role.'
          )
          if (!isMounted) return

          setUser({
            id: session.user.id,
            email: session.user.email!,
            role,
            created_at: session.user.created_at,
          })
        }
      } catch {
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void initializeSession()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const role = await withTimeout(
            fetchUserRole(session.user.id),
            ROLE_FETCH_TIMEOUT_MS,
            'Timed out while resolving user role.'
          )
          if (!isMounted) return

          setUser({
            id: session.user.id,
            email: session.user.email!,
            role,
            created_at: session.user.created_at,
          })
        } else {
          if (isMounted) {
            setUser(null)
          }
        }
      } catch {
        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      clearTimeout(loadingGuard)
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setIsLoading(false)
      throw error
    }
    // user state is updated by onAuthStateChange
  }

  const logout = () => {
    supabase.auth.signOut()
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
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
