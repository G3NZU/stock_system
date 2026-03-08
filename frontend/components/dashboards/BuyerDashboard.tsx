'use client'

import { useAuth } from '@/lib/AuthContext'

export default function BuyerDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Buyer Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders - Full Control */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Purchase Orders</h2>
          <p className="text-gray-600 mb-4">Manage purchase orders</p>
          <div className="space-y-3">
            <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
              View Orders
            </button>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
              Create New Order
            </button>
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
              Add Items to Order
            </button>
            <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 font-medium">
              Remove Order
            </button>
          </div>
        </div>

        {/* Main Inventory - View Only */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Main Inventory (View Only)</h2>
          <p className="text-gray-600 mb-4">View current stock levels</p>
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
            View Stock
          </button>
        </div>

        {/* Location Inventory - View Only */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Location Inventory (View Only)</h2>
          <p className="text-gray-600 mb-4">View items at construction site locations</p>
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
            View Locations & Items
          </button>
        </div>

        {/* Enquiries */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Enquiries</h2>
          <p className="text-gray-600 mb-4">Manage enquiries from team members</p>
          <div className="space-y-3">
            <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
              View Enquiries
            </button>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
              Create Enquiry to Warehouse
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> As a buyer, you can create and manage purchase orders. You can view but cannot modify stock or location inventory. You can receive and create enquiries to the warehouse operator.
        </p>
      </div>
    </div>
  )
}
