import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, Loader2, DollarSign, TrendingUp, Download } from 'lucide-react'
import api from '../services/api'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorCommissionPage() {
  const [commissions, setCommissions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [commRes, sumRes] = await Promise.all([
          api.getMyVendorCommissions({ limit: 1000 }),
          api.getMyVendorCommissionSummary(),
        ])
        if (!mounted) return
        const list = Array.isArray(commRes?.commissions) ? commRes.commissions : Array.isArray(commRes?.data) ? commRes.data : []
        setCommissions(list)
        setSummary(sumRes?.summary || sumRes?.data || null)
      } catch {
        if (mounted) {
          setCommissions([])
          setSummary(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [filter])

  const filtered = commissions.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.order_number || c.order || '').toLowerCase().includes(q)
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Commissions</h1>
            <p className="text-gray-600 mt-1">Track your earnings and commission history</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Sales', value: fmtMoney(summary.total_sales), icon: DollarSign, color: 'blue' },
              { label: 'Total Revenue', value: fmtMoney(summary.total_revenue), icon: TrendingUp, color: 'green' },
              { label: 'Commission Earned', value: fmtMoney(summary.commission_earned || summary.total_commission), icon: DollarSign, color: 'purple' },
              { label: 'Pending', value: fmtMoney(summary.pending_amount || summary.pending_commission), icon: Loader2, color: 'yellow' },
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
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number..."
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
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No commission records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order Total</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rate</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Commission</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id || c.commission_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm font-medium text-blue-600">{c.order_number || c.order || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">{fmtMoney(c.order_total || c.amount)}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{c.rate ? `${c.rate}%` : '—'}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-green-600">{fmtMoney(c.commission || c.commission_amount)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(c.status || '').toLowerCase() === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {c.status || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
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
