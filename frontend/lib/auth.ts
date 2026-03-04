// Authentication and session types
export type UserRole = 'admin' | 'warehouse_operator' | 'manager' | 'buyer'

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
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
