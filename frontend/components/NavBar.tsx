'use client'
import Link from 'next/link'

export default function NavBar() {
  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex gap-6 items-center">
      <span className="font-bold text-lg">StockSystem</span>
      <Link href="/" className="hover:text-gray-300">Dashboard</Link>
      <Link href="/login" className="hover:text-gray-300">Login</Link>
      <Link href="/projects" className="hover:text-gray-300">Projects</Link>
      <Link href="/items" className="hover:text-gray-300">Items</Link>
      <Link href="/inventory" className="hover:text-gray-300">Inventory</Link>
      <Link href="/orders" className="hover:text-gray-300">Orders</Link>
    </nav>
  )
}
