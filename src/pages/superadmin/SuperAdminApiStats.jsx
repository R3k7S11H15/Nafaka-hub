import { useEffect, useState } from 'react'
import { BarChart3, RefreshCw, Loader2, Key, Users, Shield } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import api from '../../services/api'

const COLORS = ['#dc2626', '#059669', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899']

export default function SuperAdminApiStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(24)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await api.getSuperAdminApiStats(hours)
      if (res?.success) setStats(res.stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [hours])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    )
  }

  const routeData = stats?.by_route?.map(r => ({ name: r.entity_type || 'unknown', value: r.requests })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-red-600" /> API Stats
          </h1>
          <p className="text-gray-500 text-sm mt-1">API usage, key utilization, and auth metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={hours} onChange={(e) => setHours(parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="1">Last 1 hour</option>
            <option value="6">Last 6 hours</option>
            <option value="24">Last 24 hours</option>
            <option value="72">Last 3 days</option>
            <option value="168">Last 7 days</option>
          </select>
          <button onClick={fetchStats} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Requests" value={stats?.total_requests ?? '—'} icon={BarChart3} color="blue" />
        <StatCard label="Successful Logins" value={stats?.successful_logins ?? '—'} icon={Shield} color="green" />
        <StatCard label="Failed Logins" value={stats?.failed_logins ?? '—'} icon={Users} color="red" />
        <StatCard label="Active API Keys" value={`${stats?.active_api_keys ?? 0}/${stats?.total_api_keys ?? 0}`} icon={Key} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Requests by Route</h3>
          {routeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={routeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">No data for selected period</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Routes</h3>
          <div className="space-y-3">
            {(stats?.by_route || []).map((route, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${COLORS[idx % COLORS.length].replace(')', ', 0.15)').replace('rgb', 'bg')}`}>
                    <span className="text-xs font-bold" style={{ color: COLORS[idx % COLORS.length] }}>{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{route.entity_type || 'unknown'}</p>
                    <p className="text-xs text-gray-500">{route.action || '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{route.requests}</p>
                  <p className="text-xs text-gray-500">requests</p>
                </div>
              </div>
            ))}
            {(!stats?.by_route || stats.by_route.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No route data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color }) {
  const colorMap = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600', purple: 'bg-purple-50 text-purple-600' }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color] || 'bg-gray-50 text-gray-600'}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
