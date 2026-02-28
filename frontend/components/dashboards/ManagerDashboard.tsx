'use client'

import { useAuth } from '@/lib/AuthContext'

export default function ManagerDashboard() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Inventory Stock - View Only */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Main Inventory (View Only)</h2>
          <p className="text-gray-600 mb-4">View main stock levels</p>
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
            View Stock
          </button>
        </div>

        {/* Location Inventory - View Only */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Location Inventory (View Only)</h2>
          <p className="text-gray-600 mb-4">View items at construction site locations</p>
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
            View Locations & Items
          </button>
        </div>

        {/* Orders - View Only */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Orders (View Only)</h2>
          <p className="text-gray-600 mb-4">View purchase orders and status</p>
          <button className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium">
            View Orders
          </button>
        </div>

        {/* Create Enquiries */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Enquiries</h2>
          <p className="text-gray-600 mb-4">Create enquiries to warehouse or buyer</p>
          <div className="space-y-3">
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
              Create Enquiry to Warehouse
            </button>
            <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-medium">
              Create Enquiry to Buyer
            </button>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> As a manager, you can view stock, locations, and orders, but cannot modify them. You can create enquiries to the warehouse operator or buyer as needed.
        </p>
      </div>
    </div>
  )
}
