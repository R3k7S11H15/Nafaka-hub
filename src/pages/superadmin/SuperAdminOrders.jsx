import React, { useEffect, useState } from 'react'
import { ShoppingCart, Search, CheckSquare, Square, Download } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { ACTIONS, STATUS_LABELS } from '../../config/orderLifecycle'

const STATUS_FILTERS = [
  '', 'pending_payment', 'paid', 'awaiting_seller_confirmation', 'seller_accepted',
  'in_transit', 'delivered', 'buyer_confirmation', 'completed', 'disputed', 'refunded', 'cancelled',
]
const STATUS_COLORS = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  awaiting_seller_confirmation: 'bg-amber-100 text-amber-800',
  seller_accepted: 'bg-purple-100 text-purple-800',
  awaiting_warehouse_allocation: 'bg-slate-100 text-slate-800',
  quality_inspection: 'bg-fuchsia-100 text-fuchsia-800',
  ready_for_dispatch: 'bg-indigo-100 text-indigo-800',
  assigned_to_logistics: 'bg-cyan-100 text-cyan-800',
  in_transit: 'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  buyer_confirmation: 'bg-pink-100 text-pink-800',
  completed: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  refunded: 'bg-violet-100 text-violet-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function SuperAdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    fetchOrders()
  }, [search, statusFilter, page])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res = await api.getSuperAdminOrders({ search, status: statusFilter, limit, offset: page * limit })
      setOrders(res?.orders || res?.data?.orders || [])
      setTotal(res?.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selected.length === orders.length) setSelected([])
    else setSelected(orders.map(o => o.id))
  }

  const handleBulkAction = async () => {
    if (!bulkAction || selected.length === 0) return
    try {
      await api.bulkUpdateOrders(selected, bulkAction)
      setSelected([])
      setBulkAction('')
      fetchOrders()
    } catch (err) {
      console.error(err)
    }
  }

  const handleExport = async () => {
    try {
      const res = await api.exportOrders({ status: statusFilter, search })
      const blob = new Blob([res], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'orders.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  const statusBadge = (status) => {
    const key = (status || '').toLowerCase()
    return STATUS_COLORS[key] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all platform orders</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Status</option>
            {STATUS_FILTERS.slice(1).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
            ))}
          </select>
        </div>

        {selected.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center gap-3">
            <span className="text-sm text-gray-700">{selected.length} selected</span>
            <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
              <option value="">Bulk action...</option>
              {Object.entries(ACTIONS).filter(([, a]) => a.admin && a.requires?.[0] === 'target_status').map(([key, a]) => (
                <option key={key} value={key}>{a.label}</option>
              ))}
            </select>
            <button onClick={handleBulkAction} className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                        {selected.length === orders.length && orders.length > 0 ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button onClick={() => toggleSelect(order.id)} className="text-gray-400 hover:text-gray-600">
                          {selected.includes(order.id) ? <CheckSquare className="w-5 h-5 text-red-600" /> : <Square className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">#{order.order_number}</p>
                          <p className="text-xs text-gray-500">{order.payment_method}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{order.customer_name || '—'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.total_amount ? `TZS ${Number(order.total_amount).toLocaleString()}` : '—'}</td>
                      <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(order.status)}`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {orders.length === 0 && (
              <div className="p-12 text-center text-gray-500">No orders found</div>
            )}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">Total: {total}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Prev</button>
                <button onClick={() => setPage(p => p + 1)} disabled={page * limit + orders.length >= total} className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
