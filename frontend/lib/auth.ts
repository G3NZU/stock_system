// Authentication and session types
export type UserRole = 'admin' | 'warehouse_operator' | 'manager' | 'buyer'

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
}

// ─── Permission helpers ────────────────────────────────────────────────────────
// These functions encode the role-based access rules in one place so that UI
// components and future backend guards can stay in sync.  Currently they are
// available for use but not yet called from component code; components rely on
// role-based routing (see dashboard/page.tsx) instead of individual permission
// checks.  As the UI grows these helpers can be imported where needed.

export const canViewSites = (role: UserRole): boolean => role === 'admin'

export const canViewProjects = (role: UserRole): boolean => role === 'admin'

export const canManipulateInventory = (role: UserRole): boolean => role === 'warehouse_operator'

export const canViewAndManipulateOrders = (role: UserRole): boolean => role === 'buyer'

export const canCreateEnquiries = (role: UserRole): boolean =>
  role === 'warehouse_operator' || role === 'manager' || role === 'buyer'

export const canViewOrders = (role: UserRole): boolean =>
  role === 'warehouse_operator' || role === 'manager' || role === 'buyer'

/** Returns true for every role that can view stock levels (i.e. everyone except admin). */
export const canViewStock = (role: UserRole): boolean => role !== 'admin'

export const canViewLocations = (role: UserRole): boolean => role !== 'admin'
