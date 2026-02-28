'use client'

import { useAuth } from '@/lib/AuthContext'
import AdminDashboard from '@/components/dashboards/AdminDashboard'
import WarehouseOperatorDashboard from '@/components/dashboards/WarehouseOperatorDashboard'
import ManagerDashboard from '@/components/dashboards/ManagerDashboard'
import BuyerDashboard from '@/components/dashboards/BuyerDashboard'

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />
    case 'warehouse_operator':
      return <WarehouseOperatorDashboard />
    case 'manager':
      return <ManagerDashboard />
    case 'buyer':
      return <BuyerDashboard />
    default:
      return <div className="text-red-600">Unknown role: {user.role}</div>
  }
}
