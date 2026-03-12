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

// How long (ms) we wait for the initial session check before giving up and
// showing the UI in an unauthenticated state.  8 s is generous but prevents an
// infinite loading spinner on slow connections.
const ROLE_PRIORITY: Record<string, number> = { admin: 4, warehouse: 3, manager: 2, buyer: 1 }
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8000
// How long (ms) we wait for the role lookup query after a session is found.
const ROLE_FETCH_TIMEOUT_MS = 5000

/**
 * Maps the database role name to the frontend UserRole type.
 * The DB stores 'warehouse' but the frontend uses 'warehouse_operator' for clarity.
 */
function mapDbRole(dbRole: string): UserRole {
  if (dbRole === 'warehouse') return 'warehouse_operator'
  return dbRole as UserRole
}

/**
 * Wraps a promise with a timeout. Rejects with `message` if `timeoutMs` elapses
 * before the original promise resolves or rejects.
 */
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

/**
 * Queries `project_user_roles` to determine the user's highest-priority role.
 * A user may have roles in multiple projects; we return the single highest one
 * so the UI knows which dashboard to show.  Defaults to 'buyer' if no role is found.
 */
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
    // Safety net: if everything else stalls, stop the loading spinner after the
    // bootstrap timeout so the user isn't stuck forever.
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
        // On any failure (timeout, network error, etc.) treat as unauthenticated.
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

    // Subscribe to auth state changes (e.g. token refresh, sign-out in another tab).
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
    // user state is updated by the onAuthStateChange subscription above
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
