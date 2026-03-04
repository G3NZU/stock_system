'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

interface Site {
  id: string
  name: string
  location: string
}

interface Project {
  id: string
  name: string
  description: string
  site_id: string
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch sites on component mount
  useEffect(() => {
    fetchSites()
  }, [])

  const fetchSites = async () => {
    try {
      setLoading(true)
      const { data, error: supabaseError } = await supabase
        .from('sites')
        .select('id, name, location')
        .order('created_at', { ascending: false })
      if (supabaseError) throw supabaseError
      setSites(data || [])
    } catch (err) {
      setError('Failed to load sites')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSiteSelect = async (siteId: string) => {
    setSelectedSiteId(siteId)
    setSelectedProjectId(null)
    try {
      const { data, error: supabaseError } = await supabase
        .from('projects')
        .select('id, name, description, site_id')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
      if (!supabaseError) {
        setProjects(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome, {user?.email}</p>
      </div>

      {error && <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sites */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Construction Sites</h2>
          {loading ? (
            <p className="text-gray-500">Loading sites...</p>
          ) : sites.length === 0 ? (
            <p className="text-gray-500">No sites available</p>
          ) : (
            <div className="space-y-2">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => handleSiteSelect(site.id)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedSiteId === site.id
                      ? 'bg-indigo-100 border-2 border-indigo-600'
                      : 'bg-gray-50 border-2 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-medium">{site.name}</div>
                  <div className="text-sm text-gray-600">{site.location}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Projects</h2>
          {!selectedSiteId ? (
            <p className="text-gray-500">Select a site to view projects</p>
          ) : projects.length === 0 ? (
            <p className="text-gray-500">No projects in this site</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedProjectId === project.id
                      ? 'bg-indigo-100 border-2 border-indigo-600'
                      : 'bg-gray-50 border-2 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-medium">{project.name}</div>
                  <div className="text-sm text-gray-600">{project.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Project Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Project Details</h2>
          {!selectedProjectId ? (
            <p className="text-gray-500">Select a project to view details</p>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded">
                <h3 className="font-medium text-blue-900">Members</h3>
                <p className="text-sm text-blue-700 mt-1">View team members and roles</p>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <h3 className="font-medium text-green-900">Locations</h3>
                <p className="text-sm text-green-700 mt-1">View site locations and inventory</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded">
                <h3 className="font-medium text-yellow-900">Stock</h3>
                <p className="text-sm text-yellow-700 mt-1">View main inventory</p>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <h3 className="font-medium text-purple-900">Orders</h3>
                <p className="text-sm text-purple-700 mt-1">View all orders</p>
              </div>
              <div className="p-3 bg-pink-50 rounded">
                <h3 className="font-medium text-pink-900">Enquiries</h3>
                <p className="text-sm text-pink-700 mt-1">View enquiry logs</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
