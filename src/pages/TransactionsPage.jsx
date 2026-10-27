import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, Filter, Download, Loader2, DollarSign, Eye } from 'lucide-react'
import api from '../services/api'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`
  return `TZS ${v.toLocaleString()}`
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getRevenueOverview()
        if (!mounted) return
        const data = res?.data || res?.overview || res || {}
        setTransactions(Array.isArray(data.transactions) ? data.transactions : Array.isArray(data.recent_transactions) ? data.recent_transactions : [])
      } catch {
        if (mounted) setTransactions([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filtered = transactions.filter(t => {
    const matchesSearch = !search || (t.order_number || t.description || t.customer_name || '').toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === 'all' || (t.status || '').toLowerCase() === filter.toLowerCase() || (t.type || '').toLowerCase() === filter.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const stats = {
    total: filtered.reduce((s, t) => s + Number(t.amount || t.total_amount || 0), 0),
    count: filtered.length,
    completed: filtered.filter(t => (t.status || '').toLowerCase() === 'completed' || (t.status || '').toLowerCase() === 'paid').length,
    pending: filtered.filter(t => (t.status || '').toLowerCase() === 'pending').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-1">All marketplace payment activity</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Volume', value: fmtMoney(stats.total), icon: DollarSign, color: 'blue' },
            { label: 'Total Transactions', value: String(stats.count), icon: DollarSign, color: 'green' },
            { label: 'Completed', value: String(stats.completed), icon: DollarSign, color: 'purple' },
            { label: 'Pending', value: String(stats.pending), icon: DollarSign, color: 'yellow' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order, customer, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No transactions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Transaction</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id || t.transaction_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm font-medium text-blue-600">{t.order_number || t.transaction_id || `#${t.id}`}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">{t.customer_name || t.customer || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{t.vendor_name || t.seller_name || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">{fmtMoney(t.amount || t.total_amount)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(t.status || '').toLowerCase() === 'completed' || (t.status || '').toLowerCase() === 'paid' ? 'bg-green-100 text-green-800' : (t.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' : (t.status || '').toLowerCase() === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                          {t.status || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</td>
                      <td className="py-4 px-4">
                        <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
