'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (user && pathname === '/') {
      // Redirect to appropriate dashboard based on role
      router.replace(`/dashboard`)
    }
  }, [user, router, pathname])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-900">Redirecting...</div>
    </div>
  )
}
