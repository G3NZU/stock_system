'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { UserRole } from '@/lib/auth'

const LoginPage = () => {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer')
  const [error, setError] = useState('')

  const handleLogin = async (role?: UserRole) => {
    setError('')
    try {
      const roleToUse = role || selectedRole
      if (!email) {
        setError('Email is required')
        return
      }
      if (!password) {
        setError('Password is required')
        return
      }
      await login(email, password, roleToUse)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    }
  }

  const handleTestLogin = async (role: UserRole) => {
    const testEmail = `${role}@test.local`
    const testPasswords: Record<UserRole, string> = {
      admin: 'admin123',
      warehouse_operator: 'warehouse123',
      manager: 'manager123',
      buyer: 'buyer123',
    }
    setEmail(testEmail)
    setPassword(testPasswords[role])
    setSelectedRole(role)
    
    setError('')
    try {
      await login(testEmail, testPasswords[role], role)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock System</h1>
        <p className="text-gray-600 mb-6">Construction Site Inventory Management</p>

        {error && <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="admin">Admin</option>
              <option value="warehouse_operator">Warehouse Operator</option>
              <option value="manager">Manager</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>

          <button
            onClick={() => handleLogin()}
            disabled={isLoading || !email}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">Testing Only - Quick Login</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTestLogin('admin')}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded disabled:opacity-50"
            >
              Admin
            </button>
            <button
              onClick={() => handleTestLogin('warehouse_operator')}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded disabled:opacity-50"
            >
              Warehouse Op.
            </button>
            <button
              onClick={() => handleTestLogin('manager')}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded disabled:opacity-50"
            >
              Manager
            </button>
            <button
              onClick={() => handleTestLogin('buyer')}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded disabled:opacity-50"
            >
              Buyer
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p className="font-semibold">Test Credentials:</p>
            <p>• admin@test.local / admin123</p>
            <p>• warehouse_operator@test.local / warehouse123</p>
            <p>• manager@test.local / manager123</p>
            <p>• buyer@test.local / buyer123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
