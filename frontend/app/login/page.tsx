'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

const LoginPage = () => {
  const router = useRouter()
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    if (!email) {
      setError('Email is required')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(message)
    }
  }

  const handleTestLogin = async (testEmail: string, testPassword: string) => {
    setEmail(testEmail)
    setPassword(testPassword)
    setError('')
    try {
      await login(testEmail, testPassword)
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(message)
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

          <button
            onClick={handleLogin}
            disabled={isLoading || !email}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">Development – Quick Login</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleTestLogin('boss@example.com', 'Passw0rd!boss')}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded disabled:opacity-50"
            >
              Admin (boss)
            </button>
            <button
              onClick={() => handleTestLogin('warehouse@example.com', 'Passw0rd!warehouse')}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded disabled:opacity-50"
            >
              Warehouse Op.
            </button>
            <button
              onClick={() => handleTestLogin('manager@example.com', 'Passw0rd!manager')}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded disabled:opacity-50"
            >
              Manager
            </button>
            <button
              onClick={() => handleTestLogin('buyer@example.com', 'Passw0rd!buyer')}
              disabled={isLoading}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 rounded disabled:opacity-50"
            >
              Buyer
            </button>
          </div>
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p className="font-semibold">Seeded Test Credentials (run <code>npm run seed:local</code> first):</p>
            <p>• boss@example.com / Passw0rd!boss</p>
            <p>• warehouse@example.com / Passw0rd!warehouse</p>
            <p>• manager@example.com / Passw0rd!manager</p>
            <p>• buyer@example.com / Passw0rd!buyer</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
