import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, RefreshCw, Loader2, Truck, Check, AlertTriangle, MapPin } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseOutbound() {
  const toast = useToast()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(null)
  const [form, setForm] = useState({ open: false, bookingId: null, quantity_released: '', destination: '', logistics_company: '', notes: '' })

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

  const approveOutbound = async () => {
    const { bookingId, quantity_released, destination, logistics_company, notes } = form
    if (!quantity_released || !destination) { toast.error('Please enter quantity and destination'); return }
    setApproving(bookingId)
    try {
      await api.approveOutbound(bookingId, { quantity_released, destination, logistics_company, notes })
      toast.success('Outbound approved')
      setForm({ open: false, bookingId: null, quantity_released: '', destination: '', logistics_company: '', notes: '' })
      loadBookings()
    } catch (e) {
      toast.error(e?.message || 'Failed to approve outbound')
    } finally { setApproving(null) }
  }

  const activeBookings = bookings.filter(b => (b.status || '').toLowerCase() === 'active')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading outbound...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Outbound Management</h1>
          <p className="text-gray-600 mt-1">Approve release of stored goods</p>
        </div>
        <button onClick={loadBookings} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {activeBookings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No active outbound requests.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeBookings.map((b) => (
            <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Booking #{b.id}</h3>
                  <p className="text-sm text-gray-500">{b.customer_name || 'Customer'} • {b.product_type || 'Product'} • {b.quantity || 0} tons</p>
                  <p className="text-xs text-gray-400">{b.start_date} → {b.end_date}</p>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {b.status || '—'}
                </span>
              </div>
              <button onClick={() => setForm({ ...form, open: true, bookingId: b.id })} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <Truck className="w-4 h-4" /> Approve Release
              </button>
            </div>
          ))}
        </div>
      )}

      {form.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Approve Outbound</h3>
              <button onClick={() => setForm({ ...form, open: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Released *</label>
                <input type="number" value={form.quantity_released} onChange={(e) => setForm({ ...form, quantity_released: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                <input type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Dar es Salaam" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logistics Company</label>
                <input type="text" value={form.logistics_company} onChange={(e) => setForm({ ...form, logistics_company: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. ABC Logistics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Any additional notes..." />
              </div>
              <button onClick={approveOutbound} disabled={approving === form.bookingId} className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                {approving === form.bookingId ? 'Approving...' : 'Approve Outbound'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
