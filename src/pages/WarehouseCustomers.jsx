import { useState, useEffect } from 'react'
import { Users, RefreshCw, Loader2, DollarSign, Calendar } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseCustomers() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadCustomers = async () => {
    try {
      const data = await api.getMyWarehouseCustomers()
      if (data.success) setCustomers(data.customers || [])
    } catch {
      setCustomers([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadCustomers() }, [])
  useEffect(() => { const i = setInterval(loadCustomers, 30000); return () => clearInterval(i) }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your warehouse customers</p>
        </div>
        <button onClick={loadCustomers} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No customers yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bookings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Booking</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.full_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{c.total_bookings || 0}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">{c.total_spend ? `${Number(c.total_spend).toLocaleString()} TZS` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.last_booking ? new Date(c.last_booking).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
