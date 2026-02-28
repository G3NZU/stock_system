'use client'

import { useAuth } from '@/lib/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, ReactNode } from 'react'
import NavBar from '@/components/NavBar'

// Pages that don't require authentication
const PUBLIC_PAGES = ['/login']

export const ProtectedLayout = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const isPublicPage = PUBLIC_PAGES.some((page) => pathname.startsWith(page))

    if (!isAuthenticated && !isPublicPage) {
      // User is not logged in and trying to access protected page
      router.replace('/login')
    } else if (isAuthenticated && pathname === '/login') {
      // User is logged in and trying to access login page
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isMounted, pathname, router])

  // Show loading while checking authentication
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // Show login page without navbar
  const isPublicPage = PUBLIC_PAGES.some((page) => pathname.startsWith(page))
  if (isPublicPage) {
    return <>{children}</>
  }

  // Show protected pages with navbar
  return (
    <>
      <NavBar />
      <main className="p-6">{children}</main>
    </>
  )
}
