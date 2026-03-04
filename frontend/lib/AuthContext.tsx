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

function mapDbRole(dbRole: string): UserRole {
  if (dbRole === 'warehouse') return 'warehouse_operator'
  return dbRole as UserRole
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
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id)
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role,
          created_at: session.user.created_at,
        })
      }
      setIsLoading(false)
    })

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id)
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role,
          created_at: session.user.created_at,
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
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
