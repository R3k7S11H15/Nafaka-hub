import React, { useEffect, useState } from 'react'
import { Activity, Server, Database, Cpu, HardDrive, Clock, AlertTriangle, RefreshCw, Wifi, WifiOff, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Skeleton, { CardSkeleton, ChartSkeleton, FormSkeleton, TableSkeleton } from '../../components/Skeletons'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import api from '../../services/api'

const COLORS = {
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
  info: '#3b82f6',
}

export default function SuperAdminHealth() {
  const [health, setHealth] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [hours, setHours] = useState(24)

  useEffect(() => {
    fetchHealth()
    fetchHistory()
    const interval = setInterval(() => {
      fetchHealth()
    }, 30000)
    return () => clearInterval(interval)
  }, [hours])

  const fetchHealth = async () => {
    try {
      const res = await api.getSuperAdminHealthDetailed()
      if (res?.success) setHealth(res.metrics)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await api.getSuperAdminHealthHistory(hours)
      if (res?.success) setHistory(res.history || [])
    } catch (err) {
      console.error(err)
    }
  }

  const getStatusColor = (metric, threshold = { warning: 70, critical: 90 }) => {
    if (metric >= threshold.critical) return 'text-red-600'
    if (metric >= threshold.warning) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStatusBg = (metric, threshold = { warning: 70, critical: 90 }) => {
    if (metric >= threshold.critical) return 'bg-red-100'
    if (metric >= threshold.warning) return 'bg-yellow-100'
    return 'bg-green-100'
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '—'
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1) return `${gb.toFixed(1)} GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)} MB`
  }

  const formatUptime = (seconds) => {
    if (!seconds) return '—'
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const cpuData = history.map(h => ({ time: new Date(h.recorded_at).toLocaleTimeString(), value: parseFloat(h.cpu_usage) || 0 }))
  const memoryData = history.map(h => ({ time: new Date(h.recorded_at).toLocaleTimeString(), value: parseFloat(h.memory_usage) || 0 }))
  const diskData = history.map(h => ({ time: new Date(h.recorded_at).toLocaleTimeString(), value: parseFloat(h.disk_usage) || 0 }))

  const pieData = [
    { name: 'Used', value: health?.disk_usage || 0 },
    { name: 'Free', value: 100 - (health?.disk_usage || 0) },
  ]

  const recentMetrics = history.slice(-10).reverse()

  if (loading && !health) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
            <p className="text-gray-500 text-sm mt-1">Real-time server metrics and monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time server metrics and monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={hours}
            onChange={(e) => setHours(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value={6}>Last 6 hours</option>
            <option value={12}>Last 12 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={48}>Last 48 hours</option>
            <option value={168}>Last 7 days</option>
          </select>
          <button onClick={fetchHealth} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`rounded-xl shadow-sm border p-6 ${health?.database ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${health?.database ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Database</h3>
          </div>
          <p className={`text-2xl font-bold ${health?.database ? 'text-green-600' : 'text-red-600'}`}>
            {health?.database ? 'Healthy' : 'Down'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Latency: {health?.db_latency_ms || '—'}ms</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><Activity className="w-5 h-5 text-blue-600" /></div>
            <h3 className="font-semibold text-gray-900">Active Sessions</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{health?.active_sessions || '—'}</p>
          <p className="text-sm text-gray-500 mt-1">Current connections</p>
        </div>

        <div className={`rounded-xl shadow-sm border p-6 ${(health?.error_logs_1h || 0) > 10 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg ${(health?.error_logs_1h || 0) > 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Error Logs (1h)</h3>
          </div>
          <p className={`text-2xl font-bold ${(health?.error_logs_1h || 0) > 10 ? 'text-red-600' : 'text-gray-900'}`}>
            {health?.error_logs_1h || '—'}
          </p>
          <p className="text-sm text-gray-500 mt-1">Last hour</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg"><Clock className="w-5 h-5 text-purple-600" /></div>
            <h3 className="font-semibold text-gray-900">Uptime</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatUptime(health?.system?.uptime_seconds)}</p>
          <p className="text-sm text-gray-500 mt-1">{health?.system?.uptime_seconds ? 'Since restart' : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            CPU Usage
            <span className={`ml-auto text-sm font-medium ${getStatusColor(health?.system?.cpu_usage_percent)}`}>
              {health?.system?.cpu_usage_percent?.toFixed(1) || '—'}%
            </span>
          </h3>
          {cpuData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={cpuData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-600" />
            Memory Usage
            <span className={`ml-auto text-sm font-medium ${getStatusColor(health?.system?.memory_usage_percent)}`}>
              {health?.system?.memory_usage_percent?.toFixed(1) || '—'}%
            </span>
          </h3>
          {memoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={memoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-purple-600" />
            Disk Usage
            <span className={`ml-auto text-sm font-medium ${getStatusColor(health?.disk_usage)}`}>
              {health?.disk_usage?.toFixed(1) || '—'}%
            </span>
          </h3>
          {diskData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={diskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">No data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Cpu className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">CPU Cores</p>
                <p className="text-sm font-medium text-gray-900">{health?.system?.cpus || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <HardDrive className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Total Memory</p>
                <p className="text-sm font-medium text-gray-900">{formatBytes(health?.system?.memory_total)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Server className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">Node.js</p>
                <p className="text-sm font-medium text-gray-900">{health?.system?.node_version || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Database className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-500">DB Size</p>
                <p className="text-sm font-medium text-gray-900">{formatBytes(health?.db_size_bytes)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">Avg Query Time</span>
              </div>
              <span className={`font-medium ${getStatusColor((health?.avg_query_time_ms || 0) / 100, { warning: 0.5, critical: 1 })}`}>
                {health?.avg_query_time_ms?.toFixed(2) || '—'}ms
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">Slow Queries (1h)</span>
              </div>
              <span className={`font-medium ${(health?.slow_queries_1h || 0) > 10 ? 'text-red-600' : 'text-gray-900'}`}>
                {health?.slow_queries_1h || '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">Active Connections</span>
              </div>
              <span className="font-medium text-gray-900">{health?.active_connections || '—'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700">Error Rate (1h)</span>
              </div>
              <span className={`font-medium ${getStatusColor((health?.error_rate_1h || 0) * 100)}`}>
                {health?.error_rate_1h?.toFixed(2) || '—'}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">CPU</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Memory</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disk</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Connections</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Slow Queries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentMetrics.map((m, i) => (
                <tr key={i} className="text-sm">
                  <td className="px-4 py-2 text-gray-500">{new Date(m.recorded_at).toLocaleString()}</td>
                  <td className={`px-4 py-2 font-medium ${getStatusColor(parseFloat(m.cpu_usage))}`}>
                    {parseFloat(m.cpu_usage)?.toFixed(1) || '—'}%
                  </td>
                  <td className={`px-4 py-2 font-medium ${getStatusColor(parseFloat(m.memory_usage))}`}>
                    {parseFloat(m.memory_usage)?.toFixed(1) || '—'}%
                  </td>
                  <td className={`px-4 py-2 font-medium ${getStatusColor(parseFloat(m.disk_usage))}`}>
                    {parseFloat(m.disk_usage)?.toFixed(1) || '—'}%
                  </td>
                  <td className="px-4 py-2 text-gray-900">{m.active_connections || '—'}</td>
                  <td className="px-4 py-2 text-gray-900">{m.slow_queries_1h || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
