'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Order = { id: string; project_id: string; supplier_name: string; status: string; created_at: string }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ projectId: '', supplierName: '' })
  const [msg, setMsg] = useState('')

  async function fetchOrders() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.from('orders').select('id, project_id, supplier_name, status, created_at')
    if (error) setError(error.message)
    else setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [])

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    const { data, error } = await supabase.rpc('create_order', {
      p_project_id: form.projectId,
      p_supplier_name: form.supplierName,
    })
    if (error) setMsg(`Error: ${error.message}`)
    else {
      setMsg(`Order created: ${data}`)
      fetchOrders()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Orders</h1>
      <button onClick={fetchOrders} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Refresh
      </button>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <table className="w-full border-collapse border text-sm mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">ID</th>
            <th className="border px-3 py-2 text-left">Project ID</th>
            <th className="border px-3 py-2 text-left">Supplier</th>
            <th className="border px-3 py-2 text-left">Status</th>
            <th className="border px-3 py-2 text-left">Created At</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-gray-50">
              <td className="border px-3 py-2 font-mono text-xs">{o.id}</td>
              <td className="border px-3 py-2 font-mono text-xs">{o.project_id}</td>
              <td className="border px-3 py-2">{o.supplier_name}</td>
              <td className="border px-3 py-2">{o.status}</td>
              <td className="border px-3 py-2 text-xs">{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mb-3">Create Order (buyer role)</h2>
      <form onSubmit={handleCreateOrder} className="flex flex-col gap-2 max-w-sm">
        <input placeholder="Project ID" value={form.projectId} onChange={e => setForm(f => ({...f, projectId: e.target.value}))} className="border px-3 py-2 rounded text-sm" required />
        <input placeholder="Supplier Name" value={form.supplierName} onChange={e => setForm(f => ({...f, supplierName: e.target.value}))} className="border px-3 py-2 rounded text-sm" required />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Create Order</button>
      </form>
      {msg && <p className="mt-2 text-sm font-medium">{msg}</p>}
    </div>
  )
}
