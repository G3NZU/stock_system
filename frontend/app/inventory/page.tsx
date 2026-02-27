'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type InventoryRow = { id: string; quantity: number; item_id: string; location_id: string; project_id: string }

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [addForm, setAddForm] = useState({ projectId: '', itemId: '', locationId: '', qty: '1' })
  const [addMsg, setAddMsg] = useState('')

  async function fetchInventory() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.from('inventory').select('id, quantity, item_id, location_id, project_id')
    if (error) setError(error.message)
    else setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchInventory() }, [])

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    setAddMsg('')
    const { error } = await supabase.rpc('add_stock', {
      p_project_id: addForm.projectId,
      p_item_id: addForm.itemId,
      p_location_id: addForm.locationId,
      p_quantity: Number(addForm.qty),
    })
    if (error) setAddMsg(`Error: ${error.message}`)
    else {
      setAddMsg('Stock added successfully!')
      fetchInventory()
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Inventory</h1>
      <button onClick={fetchInventory} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Refresh
      </button>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <table className="w-full border-collapse border text-sm mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">Project ID</th>
            <th className="border px-3 py-2 text-left">Item ID</th>
            <th className="border px-3 py-2 text-left">Location ID</th>
            <th className="border px-3 py-2 text-left">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="border px-3 py-2 font-mono text-xs">{r.project_id}</td>
              <td className="border px-3 py-2 font-mono text-xs">{r.item_id}</td>
              <td className="border px-3 py-2 font-mono text-xs">{r.location_id}</td>
              <td className="border px-3 py-2">{r.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-xl font-semibold mb-3">Add Stock (warehouse role)</h2>
      <form onSubmit={handleAddStock} className="flex flex-col gap-2 max-w-sm">
        <input placeholder="Project ID" value={addForm.projectId} onChange={e => setAddForm(f => ({...f, projectId: e.target.value}))} className="border px-3 py-2 rounded text-sm" required />
        <input placeholder="Item ID" value={addForm.itemId} onChange={e => setAddForm(f => ({...f, itemId: e.target.value}))} className="border px-3 py-2 rounded text-sm" required />
        <input placeholder="Location ID" value={addForm.locationId} onChange={e => setAddForm(f => ({...f, locationId: e.target.value}))} className="border px-3 py-2 rounded text-sm" required />
        <input type="number" placeholder="Quantity" value={addForm.qty} onChange={e => setAddForm(f => ({...f, qty: e.target.value}))} className="border px-3 py-2 rounded text-sm" required />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Add Stock</button>
      </form>
      {addMsg && <p className="mt-2 text-sm font-medium">{addMsg}</p>}
    </div>
  )
}
