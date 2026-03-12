'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'

// ─── Types ─────────────────────────────────────────────────────────────────

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

interface ProjectMember {
  user_id: string
  email: string | null
  full_name: string | null
  role_name: string
  is_active: boolean
}

interface InventoryRow {
  id: string
  quantity: number
  item_id: string
  location_id: string
  items: { id: string; name: string; sku: string | null; unit_type: string | null } | null
  locations: { id: string; name: string } | null
}

interface Location {
  id: string
  name: string
}

type DetailTab = 'members' | 'stock' | 'locations'

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth()
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Project detail state
  const [activeTab, setActiveTab] = useState<DetailTab>('members')
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [membersError, setMembersError] = useState('')

  // Fetch sites on mount
  useEffect(() => {
    void fetchSites()
  }, [])

  // Fetch project detail when selected project changes
  useEffect(() => {
    if (!selectedProject) return
    void fetchProjectDetail(selectedProject.id)
  }, [selectedProject])

  const fetchSites = async () => {
    try {
      setLoading(true)
      const { data, error: supabaseError } = await supabase
        .from('sites')
        .select('id, name, location')
        .order('created_at', { ascending: false })
      if (supabaseError) throw supabaseError
      setSites(data || [])
      setError('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sites'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSiteSelect = async (siteId: string) => {
    setSelectedSiteId(siteId)
    setSelectedProject(null)
    setMembers([])
    setMembersError('')
    setInventory([])
    setLocations([])
    try {
      const { data, error: supabaseError } = await supabase
        .from('projects')
        .select('id, name, description, site_id')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
      if (supabaseError) {
        console.error('Error fetching projects:', supabaseError.message)
      } else {
        setProjects(data || [])
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to fetch projects:', err.message)
      }
    }
  }

  const fetchProjectDetail = async (projectId: string) => {
    setLoadingDetail(true)
    setMembersError('')
    try {
      // Fetch members via RPC (SECURITY DEFINER, site-owner or project-admin only)
      const { data: memberData, error: memberError } = await supabase
        .rpc('get_project_members', { p_project_id: projectId })
      if (memberError) {
        console.error('Error fetching members:', memberError.message)
        setMembersError(memberError.message)
      } else {
        setMembers((memberData as ProjectMember[]) || [])
      }

      // Fetch inventory
      const { data: invData } = await supabase
        .from('inventory')
        .select('id, quantity, item_id, location_id, items!inner(id, name, sku, unit_type, project_id), locations(id, name)')
        .eq('items.project_id', projectId)
        .order('quantity', { ascending: false })
      setInventory((invData as unknown as InventoryRow[]) || [])

      // Fetch locations
      const { data: locData } = await supabase
        .from('locations')
        .select('id, name')
        .eq('project_id', projectId)
        .order('name')
      setLocations(locData || [])
    } catch (err) {
      console.error('Error fetching project detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const ROLE_COLOURS: Record<string, string> = {
    admin: 'bg-red-100 text-red-800',
    warehouse: 'bg-yellow-100 text-yellow-800',
    manager: 'bg-blue-100 text-blue-800',
    buyer: 'bg-green-100 text-green-800',
  }

  const getRoleBadge = (role: string) => {
    const cls = ROLE_COLOURS[role] ?? 'bg-gray-100 text-gray-800'
    return (
      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${cls}`}>
        {role}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome, {user?.email}</p>
      </div>

      {error && <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Sites ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Construction Sites</h2>
          {loading ? (
            <p className="text-gray-500">Loading sites…</p>
          ) : sites.length === 0 ? (
            <p className="text-gray-500">No sites available</p>
          ) : (
            <div className="space-y-2">
              {sites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => void handleSiteSelect(site.id)}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedSiteId === site.id
                      ? 'bg-indigo-100 border-2 border-indigo-600'
                      : 'bg-gray-50 border-2 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{site.name}</div>
                  <div className="text-sm text-gray-600">{site.location}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Projects ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Projects</h2>
          {!selectedSiteId ? (
            <p className="text-gray-500">Select a site to view projects</p>
          ) : projects.length === 0 ? (
            <p className="text-gray-500">No projects in this site</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProject(project)
                    setActiveTab('members')
                  }}
                  className={`w-full text-left p-3 rounded-lg transition ${
                    selectedProject?.id === project.id
                      ? 'bg-indigo-100 border-2 border-indigo-600'
                      : 'bg-gray-50 border-2 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{project.name}</div>
                  <div className="text-sm text-gray-600">{project.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Project Details ── */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Project Details</h2>
          {!selectedProject ? (
            <p className="text-gray-500">Select a project to view details</p>
          ) : loadingDetail ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : (
            <div>
              <p className="font-semibold text-gray-800 mb-3">{selectedProject.name}</p>

              {/* Tab buttons */}
              <div className="flex gap-1 mb-4 border-b border-gray-200">
                {(['members', 'stock', 'locations'] as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-t transition capitalize ${
                      activeTab === tab
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:text-indigo-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Members tab */}
              {activeTab === 'members' && (
                <div className="space-y-2">
                  {membersError ? (
                    <p className="text-red-500 text-sm">{membersError}</p>
                  ) : members.length === 0 ? (
                    <p className="text-gray-400 text-sm">No members found.</p>
                  ) : (
                    members.map((m) => (
                      <div
                        key={`${m.user_id}-${m.role_name}`}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {m.full_name || m.email || m.user_id}
                          </p>
                          {m.full_name && m.email && (
                            <p className="text-xs text-gray-500 truncate">{m.email}</p>
                          )}
                        </div>
                        {getRoleBadge(m.role_name)}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Stock tab */}
              {activeTab === 'stock' && (
                <div>
                  {inventory.length === 0 ? (
                    <p className="text-gray-400 text-sm">No stock records found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-left">
                            <th className="px-3 py-1.5 font-semibold text-gray-700 border-b">Item</th>
                            <th className="px-3 py-1.5 font-semibold text-gray-700 border-b">Location</th>
                            <th className="px-3 py-1.5 font-semibold text-gray-700 border-b text-right">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.map((row) => (
                            <tr key={row.id} className="hover:bg-gray-50 border-b last:border-b-0">
                              <td className="px-3 py-1.5 text-gray-900">{row.items?.name ?? '—'}</td>
                              <td className="px-3 py-1.5 text-gray-600">{row.locations?.name ?? '—'}</td>
                              <td
                                className={`px-3 py-1.5 text-right font-semibold ${
                                  row.quantity === 0 ? 'text-red-500' : 'text-gray-900'
                                }`}
                              >
                                {row.quantity}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Locations tab */}
              {activeTab === 'locations' && (
                <div className="space-y-2">
                  {locations.length === 0 ? (
                    <p className="text-gray-400 text-sm">No locations found.</p>
                  ) : (
                    locations.map((loc) => {
                      const locRows = inventory.filter((r) => r.location_id === loc.id)
                      return (
                        <div key={loc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-3 py-1.5 font-semibold text-gray-800 text-sm">
                            📍 {loc.name}
                          </div>
                          {locRows.length === 0 ? (
                            <p className="px-3 py-2 text-gray-400 text-xs">No stock at this location.</p>
                          ) : (
                            <table className="w-full text-xs">
                              <tbody>
                                {locRows.map((row) => (
                                  <tr key={row.id} className="border-t first:border-t-0 hover:bg-gray-50">
                                    <td className="px-3 py-1.5 text-gray-800">{row.items?.name ?? '—'}</td>
                                    <td className="px-3 py-1.5 text-right font-semibold text-gray-900">
                                      {row.quantity}
                                    </td>
                                    <td className="px-3 py-1.5 text-gray-500">{row.items?.unit_type ?? ''}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> As an admin, you have read-only access to all sites, projects, members, stock and locations.
        </p>
      </div>
    </div>
  )
}
