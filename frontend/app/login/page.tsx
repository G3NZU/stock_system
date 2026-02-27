'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const SEED_USERS = [
  { label: 'Boss (admin)', email: 'boss@example.com', password: 'Passw0rd!boss' },
  { label: 'Warehouse', email: 'warehouse@example.com', password: 'Passw0rd!warehouse' },
  { label: 'Manager', email: 'manager@example.com', password: 'Passw0rd!manager' },
  { label: 'Buyer', email: 'buyer@example.com', password: 'Passw0rd!buyer' },
  { label: 'Outsider', email: 'outsider@example.com', password: 'Passw0rd!outsider' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage(`Logged in as ${data.user?.email}`)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setMessage('Signed out.')
  }

  function fillUser(u: (typeof SEED_USERS)[0]) {
    setEmail(u.email)
    setPassword(u.password)
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        {SEED_USERS.map((u) => (
          <button
            key={u.email}
            onClick={() => fillUser(u)}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            {u.label}
          </button>
        ))}
      </div>
      <form onSubmit={handleLogin} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border px-3 py-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border px-3 py-2 rounded"
          required
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Sign In
        </button>
      </form>
      <button onClick={handleLogout} className="mt-3 text-sm text-red-500 underline">
        Sign Out
      </button>
      {message && <p className="mt-3 text-sm font-medium">{message}</p>}
    </div>
  )
}
