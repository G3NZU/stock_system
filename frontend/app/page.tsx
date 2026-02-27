import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Stock System — Testing Dashboard</h1>
      <p className="text-gray-600 mb-6">
        Use the navigation above to test database and API calls across different roles.
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-lg">
        {[
          { href: '/login', label: 'Login as role', desc: 'Sign in as boss, warehouse, manager, buyer, or outsider' },
          { href: '/projects', label: 'Projects', desc: 'List and manage projects' },
          { href: '/items', label: 'Items', desc: 'View and create stock items' },
          { href: '/inventory', label: 'Inventory', desc: 'View inventory levels and add/transfer stock' },
          { href: '/orders', label: 'Orders', desc: 'Create and manage purchase orders' },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block border rounded-lg p-4 hover:bg-gray-50 transition"
          >
            <div className="font-semibold">{card.label}</div>
            <div className="text-sm text-gray-500 mt-1">{card.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
