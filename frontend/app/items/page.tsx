'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Item = { id: string; name: string; sku: string; unit_type: string; is_active: boolean; project_id: string }

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function fetchItems() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.from('items').select('id, name, sku, unit_type, is_active, project_id')
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Items</h1>
      <button onClick={fetchItems} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Refresh
      </button>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="text-gray-500">No items visible (check your login/role).</p>}
      <table className="w-full border-collapse border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">Name</th>
            <th className="border px-3 py-2 text-left">SKU</th>
            <th className="border px-3 py-2 text-left">Unit</th>
            <th className="border px-3 py-2 text-left">Active</th>
            <th className="border px-3 py-2 text-left">Project ID</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="hover:bg-gray-50">
              <td className="border px-3 py-2">{i.name}</td>
              <td className="border px-3 py-2">{i.sku}</td>
              <td className="border px-3 py-2">{i.unit_type}</td>
              <td className="border px-3 py-2">{i.is_active ? '✅' : '❌'}</td>
              <td className="border px-3 py-2 font-mono text-xs">{i.project_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
