import { useState, useEffect } from 'react'
import { ClipboardList, RefreshCw, Loader2, Star, Truck } from 'lucide-react'
import api from '../services/api'

export default function LogisticsDeliveryHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const loadAll = async () => {
    try {
      const res = await api.getDeliveryHistory()
      setHistory(res?.history || [])
    } catch {
      setHistory([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  const filtered = filter
    ? history.filter(h => ((h.status || '').toLowerCase().includes(filter.toLowerCase()) || (h.order_number || '').toLowerCase().includes(filter.toLowerCase())))
    : history

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading delivery history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Delivery History</h1>
          <p className="text-gray-600 mt-1">All completed and past deliveries</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="text" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by order or status..." className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          <button onClick={loadAll} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No delivery history found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{h.order_number || h.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{h.pickup_location || '—'} → {h.delivery_address || h.destination || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{h.cargo_type || '—'} {h.cargo_weight ? `(${h.cargo_weight} tons)` : ''}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(h.status || '').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {h.status || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{h.delivery_cost ? `${Number(h.delivery_cost).toLocaleString()} TZS` : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{h.created_at ? new Date(h.created_at).toLocaleDateString() : '—'}</td>
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
