'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { supabase } from '@/lib/supabase'
import { ENQUIRY_SELECT } from '@/lib/queries'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  description: string | null
}

interface Item {
  id: string
  name: string
  sku: string | null
  unit_type: string | null
}

interface Location {
  id: string
  name: string
}

interface InventoryRow {
  id: string
  quantity: number
  item_id: string
  location_id: string
  items: { id: string; name: string; sku: string | null; unit_type: string | null } | null
  locations: { id: string; name: string } | null
}

interface Enquiry {
  id: string
  project_id: string
  item_id: string
  quantity: number
  delivery_location_id: string | null
  assigned_role: string
  status: string
  notes: string | null
  created_at: string
  requested_by: string
  items: { name: string } | null
  locations: { name: string } | null
  users: { email: string | null; full_name: string | null } | null
}

type ModalType = 'stock' | 'locations' | 'enquiries' | 'create_enquiry' | null

// ─── Sub-components ──────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function OpStatus({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}
    </>
  )
}

const STATUS_COLOURS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function BuyerDashboard() {
  const { user } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [inventory, setInventory] = useState<InventoryRow[]>([])
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])

  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [openModal, setOpenModal] = useState<ModalType>(null)
  const [opLoading, setOpLoading] = useState(false)
  const [opError, setOpError] = useState('')
  const [opSuccess, setOpSuccess] = useState('')

  // Create enquiry form state
  const [formItemId, setFormItemId] = useState('')
  const [formLocationId, setFormLocationId] = useState('')
  const [formQty, setFormQty] = useState('1')
  const [formNotes, setFormNotes] = useState('')

  // Fetch projects on mount
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoadingProjects(true)
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description')
        .order('name')
      if (!mounted) return
      if (!error) {
        setProjects(data ?? [])
        if (data && data.length === 1) setSelectedProject(data[0])
      }
      setLoadingProjects(false)
    }
    void load()
    return () => { mounted = false }
  }, [])

  // Fetch project data when selected project changes
  useEffect(() => {
    if (!selectedProject) return
    let mounted = true
    const projectId = selectedProject.id

    async function load() {
      setLoadingData(true)

      const { data: itemData } = await supabase
        .from('items')
        .select('id, name, sku, unit_type')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name')

      const { data: locData } = await supabase
        .from('locations')
        .select('id, name')
        .eq('project_id', projectId)
        .order('name')

      const { data: invData } = await supabase
        .from('inventory')
        .select('id, quantity, item_id, location_id, items!inner(id, name, sku, unit_type, project_id), locations(id, name)')
        .eq('items.project_id', projectId)
        .order('quantity', { ascending: false })

      const { data: enqData } = await supabase
        .from('enquiries')
        .select(ENQUIRY_SELECT)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (!mounted) return
      setItems(itemData ?? [])
      setLocations(locData ?? [])
      setInventory((invData as unknown as InventoryRow[]) ?? [])
      setEnquiries((enqData as unknown as Enquiry[]) ?? [])
      setLoadingData(false)
    }

    void load()
    return () => { mounted = false }
  }, [selectedProject])

  const refreshEnquiries = async (projectId: string) => {
    const { data: enqData } = await supabase
      .from('enquiries')
      .select(ENQUIRY_SELECT)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    setEnquiries((enqData as unknown as Enquiry[]) ?? [])
  }

  const openModalWith = (modal: ModalType) => {
    setFormItemId('')
    setFormLocationId('')
    setFormQty('1')
    setFormNotes('')
    setOpError('')
    setOpSuccess('')
    setOpenModal(modal)
  }

  const closeModal = () => {
    setOpenModal(null)
    setOpError('')
    setOpSuccess('')
  }

  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject) return
    setOpLoading(true)
    setOpError('')
    setOpSuccess('')

    const { error } = await supabase.rpc('create_enquiry', {
      p_project_id: selectedProject.id,
      p_item_id: formItemId,
      p_quantity: Number(formQty),
      p_delivery_location_id: formLocationId || null,
      p_assigned_role: 'warehouse',
      p_notes: formNotes || null,
    })

    if (error) {
      setOpError(error.message)
    } else {
      setOpSuccess('Enquiry created successfully!')
      await refreshEnquiries(selectedProject.id)
    }
    setOpLoading(false)
  }

  const handleUpdateStatus = async (enquiryId: string, newStatus: string) => {
    const { error } = await supabase.rpc('update_enquiry_status', {
      p_enquiry_id: enquiryId,
      p_status: newStatus,
    })
    if (error) {
      console.error('Error updating enquiry status:', error.message)
    } else if (selectedProject) {
      await refreshEnquiries(selectedProject.id)
    }
  }

  // Enquiries assigned to buyer (for the buyer to action)
  const receivedEnquiries = enquiries.filter((e) => e.assigned_role === 'buyer')
  const allEnquiries = enquiries

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome, {user?.email}</p>
      </div>

      {/* Project selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Select Project</h2>
        {loadingProjects ? (
          <p className="text-gray-500 text-sm">Loading projects…</p>
        ) : projects.length === 0 ? (
          <p className="text-gray-500 text-sm">No projects available for your account.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProject(p)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                  selectedProject?.id === p.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content when a project is selected */}
      {selectedProject && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Orders – full control (placeholder for future order management) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Purchase Orders</h2>
            <p className="text-gray-600 mb-4 text-sm">Manage purchase orders</p>
            <div className="space-y-3">
              <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium transition">
                View Orders
              </button>
              <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium transition">
                Create New Order
              </button>
            </div>
          </div>

          {/* Main Inventory */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Main Inventory (View Only)</h2>
            <p className="text-gray-600 mb-4 text-sm">
              {loadingData ? 'Loading…' : `${inventory.length} stock record(s) for ${selectedProject.name}`}
            </p>
            <button
              onClick={() => openModalWith('stock')}
              disabled={loadingData}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 transition"
            >
              View Stock
            </button>
          </div>

          {/* Location Inventory */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Location Inventory (View Only)</h2>
            <p className="text-gray-600 mb-4 text-sm">
              {loadingData ? 'Loading…' : `${locations.length} location(s) in ${selectedProject.name}`}
            </p>
            <button
              onClick={() => openModalWith('locations')}
              disabled={loadingData}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 transition"
            >
              View Locations &amp; Items
            </button>
          </div>

          {/* Enquiries */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Enquiries</h2>
            <p className="text-gray-600 mb-4 text-sm">
              {loadingData
                ? 'Loading…'
                : `${receivedEnquiries.filter((e) => e.status === 'OPEN').length} open enquiry(s) assigned to you`}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => openModalWith('enquiries')}
                disabled={loadingData}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 transition"
              >
                View All Enquiries ({allEnquiries.length})
              </button>
              <button
                onClick={() => openModalWith('create_enquiry')}
                disabled={loadingData}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition"
              >
                Create Enquiry to Warehouse
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> As a buyer, you can view stock and locations (read-only), manage purchase orders, receive and create enquiries, and update the status of enquiries assigned to you.
        </p>
      </div>

      {/* ── Stock modal ── */}
      {openModal === 'stock' && selectedProject && (
        <Modal title={`Stock — ${selectedProject.name}`} onClose={closeModal}>
          {inventory.length === 0 ? (
            <p className="text-gray-500 text-sm">No stock found for this project.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-2 font-semibold text-gray-700 border-b">Item</th>
                    <th className="px-4 py-2 font-semibold text-gray-700 border-b">SKU</th>
                    <th className="px-4 py-2 font-semibold text-gray-700 border-b">Location</th>
                    <th className="px-4 py-2 font-semibold text-gray-700 border-b text-right">Qty</th>
                    <th className="px-4 py-2 font-semibold text-gray-700 border-b">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 border-b last:border-b-0">
                      <td className="px-4 py-2 font-medium text-gray-900">{row.items?.name ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs">{row.items?.sku ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{row.locations?.name ?? '—'}</td>
                      <td
                        className={`px-4 py-2 text-right font-semibold ${
                          row.quantity === 0 ? 'text-red-500' : 'text-gray-900'
                        }`}
                      >
                        {row.quantity}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{row.items?.unit_type ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            onClick={closeModal}
            className="w-full mt-5 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        </Modal>
      )}

      {/* ── Locations modal ── */}
      {openModal === 'locations' && selectedProject && (
        <Modal title={`Locations — ${selectedProject.name}`} onClose={closeModal}>
          {locations.length === 0 ? (
            <p className="text-gray-500 text-sm">No locations defined for this project.</p>
          ) : (
            <div className="space-y-4">
              {locations.map((loc) => {
                const locRows = inventory.filter((row) => row.location_id === loc.id)
                return (
                  <div key={loc.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 font-semibold text-gray-800 text-sm">
                      📍 {loc.name}
                    </div>
                    {locRows.length === 0 ? (
                      <p className="px-4 py-3 text-gray-400 text-sm">No stock at this location.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b bg-gray-50">
                            <th className="px-4 py-1 text-gray-600 font-medium">Item</th>
                            <th className="px-4 py-1 text-gray-600 font-medium text-right">Qty</th>
                            <th className="px-4 py-1 text-gray-600 font-medium">Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {locRows.map((row) => (
                            <tr key={row.id} className="border-b last:border-b-0 hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-900">{row.items?.name ?? '—'}</td>
                              <td
                                className={`px-4 py-2 text-right font-semibold ${
                                  row.quantity === 0 ? 'text-red-500' : ''
                                }`}
                              >
                                {row.quantity}
                              </td>
                              <td className="px-4 py-2 text-gray-500 text-xs">{row.items?.unit_type ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <button
            onClick={closeModal}
            className="w-full mt-5 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        </Modal>
      )}

      {/* ── Enquiries list modal ── */}
      {openModal === 'enquiries' && selectedProject && (
        <Modal title={`Enquiries — ${selectedProject.name}`} onClose={closeModal}>
          {allEnquiries.length === 0 ? (
            <p className="text-gray-500 text-sm">No enquiries for this project yet.</p>
          ) : (
            <div className="space-y-3">
              {allEnquiries.map((enq) => {
                const isMine = enq.assigned_role === 'buyer'
                const canUpdate = isMine && enq.status !== 'RESOLVED' && enq.status !== 'REJECTED'
                return (
                  <div key={enq.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {enq.items?.name ?? '—'} &times; {enq.quantity}
                        </p>
                        {enq.locations?.name && (
                          <p className="text-sm text-gray-600">Deliver to: {enq.locations.name}</p>
                        )}
                        {enq.notes && (
                          <p className="text-sm text-gray-500 italic mt-1">{enq.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Assigned to: <span className="capitalize font-medium">{enq.assigned_role}</span>
                          {' · '}
                          {enq.users?.email || enq.requested_by}
                          {' · '}
                          {new Date(enq.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOURS[enq.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {enq.status}
                      </span>
                    </div>
                    {/* Status update buttons for buyer-assigned enquiries */}
                    {canUpdate && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500 self-center">Update status:</span>
                        {enq.status !== 'IN_PROGRESS' && (
                          <button
                            onClick={() => void handleUpdateStatus(enq.id, 'IN_PROGRESS')}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 font-medium"
                          >
                            In Progress
                          </button>
                        )}
                        <button
                          onClick={() => void handleUpdateStatus(enq.id, 'RESOLVED')}
                          className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 font-medium"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => void handleUpdateStatus(enq.id, 'REJECTED')}
                          className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <button
            onClick={closeModal}
            className="w-full mt-5 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        </Modal>
      )}

      {/* ── Create enquiry modal ── */}
      {openModal === 'create_enquiry' && selectedProject && (
        <Modal title="Create Enquiry to Warehouse" onClose={closeModal}>
          <OpStatus error={opError} success={opSuccess} />
          {opSuccess ? (
            <button
              onClick={closeModal}
              className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg font-medium"
            >
              Close
            </button>
          ) : (
            <form onSubmit={(e) => void handleCreateEnquiry(e)} className="space-y-4">
              <p className="text-sm text-gray-500">
                Create an enquiry for stock you need from the warehouse.
              </p>

              {/* Item */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
                <select
                  value={formItemId}
                  onChange={(e) => setFormItemId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select item —</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}{item.sku ? ` (${item.sku})` : ''}{item.unit_type ? ` · ${item.unit_type}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Delivery location (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Location <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={formLocationId}
                  onChange={(e) => setFormLocationId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— No preference —</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Any additional details…"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={opLoading || !formItemId}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {opLoading ? 'Submitting…' : 'Create Enquiry'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  )
}
