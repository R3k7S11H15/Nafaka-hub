import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Warehouse, Package, BarChart3, Calendar, DollarSign, Users, AlertTriangle, ArrowUp, ArrowDown, Loader2, RefreshCw, TrendingUp } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseDashboard() {
  const toast = useToast()
  const [inventory, setInventory] = useState([])
  const [movements, setMovements] = useState([])
  const [bookings, setBookings] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = async () => {
    try {
      const [invData, bookData] = await Promise.all([
        api.getMyWarehouseInventory(),
        api.getMyWarehouseBookings()
      ])
      if (invData.success) {
        setInventory(invData.inventory || [])
        setMovements(invData.movements || [])
      }
      if (bookData.success) {
        setBookings(bookData.bookings || [])
        setWarehouses(bookData.warehouses || [])
      }
    } catch {
      setInventory([])
      setMovements([])
      setBookings([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { const i = setInterval(loadData, 30000); return () => clearInterval(i) }, [])

  const totalCapacity = warehouses.reduce((s, w) => s + Number(w.capacity_tonnes || 0), 0)
  const totalAvailable = warehouses.reduce((s, w) => s + Number(w.available_space || 0), 0)
  const totalStock = inventory.reduce((s, i) => s + Number(i.quantity || 0), 0)
  const utilizationPct = totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0
  const activeBookings = bookings.filter(b => ['pending', 'confirmed', 'active'].includes((b.status || '').toLowerCase())).length
  const totalRevenue = bookings.reduce((s, b) => s + Number(b.storage_fee || 0), 0)

  const stats = [
    { label: 'Total Capacity', value: `${totalCapacity.toLocaleString()} t`, icon: Warehouse, color: 'bg-blue-500', href: '/warehouse/spaces' },
    { label: 'Available Space', value: `${totalAvailable.toLocaleString()} t`, icon: Package, color: 'bg-green-500', href: '/warehouse/spaces' },
    { label: 'Active Bookings', value: activeBookings, icon: Calendar, color: 'bg-yellow-500', href: '/warehouse/bookings' },
    { label: 'Revenue', value: `${totalRevenue.toLocaleString()} TZS`, icon: DollarSign, color: 'bg-emerald-500', href: '/warehouse/earnings' },
  ]

  const recentBookings = bookings.slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading warehouse dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Warehouse Dashboard</h1>
          <p className="text-gray-600 mt-1">Storage management and operations</p>
        </div>
        <button onClick={() => { setRefreshing(true); loadData() }} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <NavLink key={stat.label} to={stat.href} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-lg lg:text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.color} bg-opacity-10`}>
                  <Icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </NavLink>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Occupancy Rate</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="96" cy="96" r="80" stroke="#e5e7eb" strokeWidth="16" fill="none" />
                  <circle cx="96" cy="96" r="80" stroke={utilizationPct > 80 ? '#dc2626' : '#15803d'} strokeWidth="16" fill="none" strokeDasharray={`${utilizationPct * 5.03} 503`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-gray-900">{utilizationPct}%</p>
                    <p className="text-xs text-gray-500">Occupied</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{totalStock.toLocaleString()} t</p>
                <p className="text-xs text-gray-500">Stored</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalAvailable.toLocaleString()} t</p>
                <p className="text-xs text-gray-500">Available</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
          </div>
          {recentBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No bookings yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentBookings.map((b) => (
                <div key={b.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{b.customer_name || 'Customer'}</p>
                      <p className="text-xs text-gray-500">{b.product_type || 'Product'} • {b.quantity || 0} tons</p>
                      <p className="text-xs text-gray-400">{b.start_date} → {b.end_date}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      (b.status || '').toLowerCase() === 'active' || (b.status || '').toLowerCase() === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : (b.status || '').toLowerCase() === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {b.status || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="p-4 border-t border-gray-100">
            <NavLink to="/warehouse/bookings" className="text-sm text-green-600 hover:text-green-700 font-medium">View all bookings →</NavLink>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Inventory Status</h2>
        </div>
        {inventory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No inventory data yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.product_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.warehouse_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.quantity || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        (item.status || '').toLowerCase().includes('low') || Number(item.quantity || 0) === 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.status || (Number(item.quantity || 0) === 0 ? 'Critical' : 'Good')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
