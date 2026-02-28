// Authentication and session types
export type UserRole = 'admin' | 'warehouse_operator' | 'manager' | 'buyer'

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: number
}

// Store session in localStorage
export const saveSession = (session: AuthSession) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_session', JSON.stringify(session))
  }
}

export const getSession = (): AuthSession | null => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth_session')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return null
      }
    }
  }
  return null
}

export const clearSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_session')
  }
}

// Helper to check if session is still valid
export const isSessionValid = (session: AuthSession | null): boolean => {
  if (!session) return false
  return Date.now() < session.expiresAt
}

// Mock user database - maps emails to their assigned roles
// ⚠️ TEMPORARY: Replace with real authentication backend API
// These hardcoded credentials are only for development/testing
const MOCK_USERS: Record<string, { password: string; role: UserRole }> = {
  'admin@test.local': { password: 'admin123', role: 'admin' },
  'warehouse_operator@test.local': { password: 'warehouse123', role: 'warehouse_operator' },
  'manager@test.local': { password: 'manager123', role: 'manager' },
  'buyer@test.local': { password: 'buyer123', role: 'buyer' },
}

// Mock authentication for testing - replace with real auth later
export const mockLoginUser = async (
  email: string,
  password: string,
  role: UserRole
): Promise<AuthSession> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Check if user exists
  const userRecord = MOCK_USERS[email.toLowerCase()]
  if (!userRecord) {
    throw new Error('Invalid email or password')
  }

  // Check if password matches (in real app, this would be hashed)
  if (userRecord.password !== password) {
    throw new Error('Invalid email or password')
  }

  // Check if the email's role matches the selected role
  if (userRecord.role !== role) {
    throw new Error(`This email is registered as ${userRecord.role.replace('_', ' ')}, not ${role.replace('_', ' ')}`)
  }

  // Create session
  const user: User = {
    id: `user_${Math.random().toString(36).substr(2, 9)}`,
    email,
    role: userRecord.role,
    created_at: new Date().toISOString(),
  }

  const session: AuthSession = {
    user,
    token: `token_${Math.random().toString(36).substr(2, 9)}`,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  }

  return session
}

// Permission checks by role
export const canViewSites = (role: UserRole): boolean => role === 'admin'

export const canViewProjects = (role: UserRole): boolean => role === 'admin'

export const canManipulateInventory = (role: UserRole): boolean => role === 'warehouse_operator'

export const canViewAndManipulateOrders = (role: UserRole): boolean => role === 'buyer'

export const canCreateEnquiries = (role: UserRole): boolean =>
  role === 'warehouse_operator' || role === 'manager' || role === 'buyer'

export const canViewOrders = (role: UserRole): boolean =>
  role === 'warehouse_operator' || role === 'manager' || role === 'buyer'

export const canViewSlocks = (role: UserRole): boolean => role !== 'admin'

export const canViewLocations = (role: UserRole): boolean => role !== 'admin'
