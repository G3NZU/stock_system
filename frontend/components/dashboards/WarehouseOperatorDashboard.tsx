'use client'

import { useAuth } from '@/lib/AuthContext'

export default function WarehouseOperatorDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Warehouse Operator Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Inventory Stock */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Main Inventory Stock</h2>
          <p className="text-gray-600 mb-4">Manage and track main inventory levels</p>
          <div className="space-y-3">
            <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
              View Stock
            </button>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
              Add Stock
            </button>
            <button className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 font-medium">
              Remove Stock
            </button>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
              Transfer to Location
            </button>
          </div>
        </div>

        {/* Location Inventory */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Location Inventory</h2>
          <p className="text-gray-600 mb-4">View items at construction site locations</p>
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
            View Locations & Items
          </button>
        </div>

        {/* Enquiries */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Enquiries</h2>
          <p className="text-gray-600 mb-4">Manage stock enquiries and requests</p>
          <div className="space-y-3">
            <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
              Received Enquiries
            </button>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
              Create New Enquiry
            </button>
          </div>
        </div>

        {/* Orders View Only */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Orders (View Only)</h2>
          <p className="text-gray-600 mb-4">View but cannot modify purchase orders</p>
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
            View Orders
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> As a warehouse operator, you can add, remove, and transfer items from main stock. You can manage enquiries and create orders, but cannot modify existing orders.
        </p>
      </div>
    </div>
  )
}
