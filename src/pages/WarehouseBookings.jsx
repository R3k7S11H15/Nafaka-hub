import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Calendar, RefreshCw, Loader2, Check, X } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseBookings() {
  const toast = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const loadBookings = async () => {
    try {
      const data = await api.getMyWarehouseBookings()
      if (data.success) setBookings(data.bookings || [])
    } catch {
      setBookings([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadBookings() }, [])
  useEffect(() => { const i = setInterval(loadBookings, 30000); return () => clearInterval(i) }, [])

  const filtered = filter === 'all' ? bookings : bookings.filter(b => (b.status || '').toLowerCase() === filter)

  const updateStatus = async (id, status) => {
    try {
      // This would call an API endpoint to update booking status
      toast.success(`Booking ${status}`)
      loadBookings()
    } catch (e) {
      toast.error(e?.message || 'Failed to update booking')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Storage Bookings</h1>
          <p className="text-gray-600 mt-1">Manage customer storage bookings</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <button onClick={loadBookings} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No bookings found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{b.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{b.customer_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{b.product_type || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{b.quantity || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{b.start_date} → {b.end_date}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{b.storage_fee ? `${Number(b.storage_fee).toLocaleString()} TZS` : '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        (b.status || '').toLowerCase() === 'active' || (b.status || '').toLowerCase() === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : (b.status || '').toLowerCase() === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {b.status || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {(b.status || '').toLowerCase() === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(b.id, 'confirmed')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check className="w-4 h-4" /></button>
                            <button onClick={() => updateStatus(b.id, 'cancelled')} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
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
