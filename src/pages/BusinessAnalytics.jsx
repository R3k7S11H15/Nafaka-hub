import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, DollarSign, Users, Package, Calendar, MapPin, Download, Loader2 } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981']

const fmtMoney = (v) => {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`;
  return `TZS ${v.toLocaleString()}`;
};

export default function BusinessAnalytics() {
  const [overview, setOverview] = useState(null)
  const [projections, setProjections] = useState([])
  const [commission, setCommission] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [o, p, c] = await Promise.all([
          api.getRevenueOverview(),
          api.getRevenueProjections(),
          api.getCommissionBreakdown(),
        ])
        if (!mounted) return
        setOverview(o?.data || o?.overview || o || null)
        const proj = p?.data || p?.projections || p || []
        setProjections(Array.isArray(proj) ? proj : [])
        setCommission(c?.data || c?.breakdown || c || null)
      } catch {
        if (mounted) {
          setOverview(null)
          setProjections([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const totalRevenue = overview?.total_revenue ?? overview?.revenue ?? overview?.total
  const totalOrders = overview?.total_orders ?? overview?.orders
  const totalCustomers = overview?.total_customers ?? overview?.customers
  const profitMargin = overview?.profit_margin ?? overview?.margin

  const revenueChartData = projections.length > 0
    ? projections.map(p => ({ month: p.month || p.label || '', revenue: Number(p.revenue || p.amount || 0) }))
    : []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">Business Analytics</h1>
        </div>
        <p className="text-gray-600 ml-11">Insights to grow your business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalRevenue != null ? fmtMoney(totalRevenue) : '—'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Profit Margin</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{profitMargin != null ? `${profitMargin}%` : '—'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-600">Orders</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOrders ?? '—'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Customers</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCustomers ?? '—'}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading analytics...
          </div>
        ) : revenueChartData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No revenue data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip formatter={(value) => [`TZS ${Number(value).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {commission && Array.isArray(commission.breakdown) && commission.breakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">Commission Breakdown</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={commission.breakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {commission.breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`TZS ${Number(value).toLocaleString()}`, 'Sales']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Summary</h2>
        <div className="text-center py-8 text-gray-500">No additional product analytics available.</div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Customer Distribution by Region</h2>
        </div>
        <div className="text-center py-8 text-gray-500">No regional data available.</div>
      </div>
    </div>
  )
}
