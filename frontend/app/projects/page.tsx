'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Project = { id: string; name: string; description: string | null }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchProjects() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.from('projects').select('id, name, description')
    if (error) setError(error.message)
    else setProjects(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Projects</h1>
      <button onClick={fetchProjects} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Refresh
      </button>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && projects.length === 0 && <p className="text-gray-500">No projects visible (check your login/role).</p>}
      <table className="w-full border-collapse border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">ID</th>
            <th className="border px-3 py-2 text-left">Name</th>
            <th className="border px-3 py-2 text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="border px-3 py-2 font-mono text-xs">{p.id}</td>
              <td className="border px-3 py-2">{p.name}</td>
              <td className="border px-3 py-2">{p.description ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
