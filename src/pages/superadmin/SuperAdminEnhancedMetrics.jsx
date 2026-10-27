import { useEffect, useState } from 'react'
import { RefreshCw, Loader2, Users, ShoppingCart, Package, Shield, Clock, DollarSign, Activity, AlertTriangle, MessageSquare } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import api from '../../services/api'

const COLORS = ['#dc2626', '#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

export default function SuperAdminEnhancedMetrics() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const res = await api.getSuperAdminEnhancedMetrics()
      if (res?.success) setMetrics(res.metrics)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMetrics() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    )
  }

  const orderStatusData = metrics?.order_status_distribution?.map(s => ({ name: s.status, value: s.count })) || []
  const roleData = metrics?.role_distribution?.map(r => ({ name: r.role, value: r.count })) || []
  const revenueData = metrics?.revenue_by_type?.map(r => ({ name: r.revenue_type, value: parseFloat(r.total) })) || []

  const statCards = [
    { label: 'Total Customers', value: metrics?.customers ?? '—', icon: Users, color: 'blue' },
    { label: 'Active Products', value: metrics?.products ?? '—', icon: Package, color: 'purple' },
    { label: 'Total Orders', value: metrics?.orders ?? '—', icon: ShoppingCart, color: 'green' },
    { label: 'Active Sessions', value: metrics?.active_sessions ?? '—', icon: Shield, color: 'red' },
    { label: 'Open Tickets', value: metrics?.open_tickets ?? '—', icon: MessageSquare || Activity, color: 'yellow' },
    { label: 'Pending Applications', value: metrics?.pending_applications ?? '—', icon: Clock, color: 'orange' },
    { label: 'Pending Reports', value: metrics?.pending_reports ?? '—', icon: AlertTriangle, color: 'red' },
    { label: 'Pending Withdrawals', value: metrics?.pending_withdrawals ?? '—', icon: DollarSign, color: 'green' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-red-600" /> Enhanced Metrics
          </h1>
          <p className="text-gray-500 text-sm mt-1">System-wide operational metrics and distributions</p>
        </div>
        <button onClick={fetchMetrics} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon
          const colorMap = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600', red: 'bg-red-50 text-red-600', yellow: 'bg-yellow-50 text-yellow-600', orange: 'bg-orange-50 text-orange-600' }
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorMap[card.color] || 'bg-gray-50 text-gray-600'}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
          {orderStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {orderStatusData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Role Distribution</h3>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {roleData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Type (30d)</h3>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`TZS ${Number(value).toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="value" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">New Users Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.today_users ?? '—'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Orders Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.today_orders ?? '—'}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Revenue Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics?.today_revenue ? `TZS ${Number(metrics.today_revenue).toLocaleString()}` : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
