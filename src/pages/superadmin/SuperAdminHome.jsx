import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, Activity, RefreshCw, Loader2, Settings, UserPlus, TrendingDown, GripVertical, Eye, EyeOff, Save, RotateCw, Shield, MapPin, Clock, Database, Server, Cpu, HardDrive, Zap, CreditCard, AlertTriangle, FolderOpen, FileText, Truck, Warehouse, Monitor, Filter, MessageSquare } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, PieChart as RePieChart, Pie, Cell } from 'recharts'
import api from '../../services/api'
import storage from '../../utils/storage'
import { useSSE } from '../../hooks/useSSE'

const fmtMoney = (v) => {
  if (v == null) return 'TZS 0'
  if (typeof v === 'string') return v
  if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `TZS ${(v / 1_000).toFixed(1)}K`
  return `TZS ${v.toLocaleString()}`
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

const getStatusColor = (status) => {
  switch (status) {
    case 'healthy': return 'text-green-600 bg-green-100'
    case 'warning': return 'text-yellow-600 bg-yellow-100'
    case 'critical': return 'text-red-600 bg-red-100'
    default: return 'text-blue-600 bg-blue-100'
  }
}

function HealthMetric({ label, value, icon: Icon, status, detail }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{detail}</p>
    </div>
  )
}

function TaskRow({ title, count, icon: Icon, color, link }) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }
  return (
    <NavLink to={link} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
      <div className={`p-2 rounded-lg ${colorMap[color] || 'bg-gray-100 text-gray-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">Click to manage</p>
      </div>
      <div className="text-right">
        <span className={`text-2xl font-bold ${colorMap[color]?.replace('bg-', 'text-').replace('100', '600') || 'text-gray-600'}`}>
          {count}
        </span>
        <span className="text-xs text-gray-400 block">pending</span>
      </div>
    </NavLink>
  )
}

function LiveMetric({ label, value, trend, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="p-2 bg-yellow-100 rounded-lg">
        <Icon className="w-5 h-5 text-yellow-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded ${trend === 'live' ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
        {trend === 'live' ? 'LIVE' : 'Static'}
      </span>
    </div>
  )
}

const DEFAULT_WIDGETS = [
  { key: 'statCards', label: 'Stats Cards', visible: true, position: 0 },
  { key: 'revenueChart', label: 'Revenue Chart', visible: true, position: 1 },
  { key: 'ordersChart', label: 'Orders Chart', visible: true, position: 2 },
  { key: 'userGrowth', label: 'User Growth', visible: true, position: 3 },
  { key: 'conversionFunnel', label: 'Conversion Funnel', visible: true, position: 4 },
  { key: 'geoDistribution', label: 'Geographic Distribution', visible: true, position: 5 },
  { key: 'roleDistribution', label: 'Role Distribution', visible: true, position: 6 },
  { key: 'systemHealth', label: 'System Health', visible: true, position: 7 },
  { key: 'platformTasks', label: 'Platform Tasks', visible: true, position: 8 },
  { key: 'recentUsers', label: 'Recent Users', visible: true, position: 9 },
  { key: 'recentOrders', label: 'Recent Orders', visible: true, position: 10 },
  { key: 'quickLinks', label: 'Quick Links', visible: true, position: 11 },
]

export default function SuperAdminHome() {
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [systemMetrics, setSystemMetrics] = useState(null)
  const [enhancedMetrics, setEnhancedMetrics] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS)
  const [draggedWidget, setDraggedWidget] = useState(null)
  const [realtimeStats, setRealtimeStats] = useState(null)
  const [sseConnected, setSseConnected] = useState(false)
  const [timeRange, setTimeRange] = useState(30)
  const sseUrl = api.getSuperAdminRealtimeMetrics()

  useEffect(() => {
    loadWidgets()
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Real-time SSE connection for live metrics
  const { connected: sseConn } = useSSE(sseUrl, {
    enabled: true,
    autoReconnect: true,
    onMessage: (msg) => {
      if (msg.type === 'metrics') {
        setRealtimeStats(msg.data)
        setSseConnected(true)
      }
    }
  })

  useEffect(() => {
    setSseConnected(sseConn)
  }, [sseConn])

  const loadWidgets = async () => {
    try {
      const saved = await storage.getItem('dashboard_widgets')
      if (saved) {
        const parsed = JSON.parse(saved)
        const merged = DEFAULT_WIDGETS.map(w => {
          const savedWidget = parsed.find(s => s.key === w.key)
          return savedWidget ? { ...w, ...savedWidget } : w
        })
        setWidgets(merged)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const saveWidgets = async (newWidgets) => {
    setWidgets(newWidgets)
    await storage.setItem('dashboard_widgets', JSON.stringify(newWidgets))
  }

  const fetchData = async () => {
    try {
      const [statsRes, analyticsRes, metricsRes, enhancedRes] = await Promise.all([
        api.getSuperAdminStats(),
        api.getSuperAdminAnalytics(timeRange),
        api.getSuperAdminEnhancedMetrics().catch(() => null),
        api.getSuperAdminEnhancedMetrics().catch(() => null),
      ])
      if (statsRes?.success) {
        setStats(statsRes.stats)
        setRecentUsers(statsRes.recent?.users || [])
        setRecentOrders(statsRes.recent?.orders || [])
      }
      if (analyticsRes?.success) setAnalytics(analyticsRes)
      if (metricsRes?.success) setSystemMetrics(metricsRes.metrics)
      if (enhancedRes?.success) setEnhancedMetrics(enhancedRes.metrics)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleTimeRangeChange = (days) => {
    setTimeRange(days)
    setRefreshing(true)
    fetchData()
  }

  const toggleWidget = (key) => {
    const newWidgets = widgets.map(w => w.key === key ? { ...w, visible: !w.visible } : w)
    saveWidgets(newWidgets)
  }

  const handleDragStart = (e, widget) => {
    setDraggedWidget(widget)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, targetWidget) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget.key === targetWidget.key) return

    const newWidgets = [...widgets]
    const draggedIdx = newWidgets.findIndex(w => w.key === draggedWidget.key)
    const targetIdx = newWidgets.findIndex(w => w.key === targetWidget.key)
    
    newWidgets.splice(draggedIdx, 1)
    newWidgets.splice(targetIdx, 0, draggedWidget)
    
    newWidgets.forEach((w, i) => { w.position = i })
    saveWidgets(newWidgets)
    setDraggedWidget(null)
  }

  const resetWidgets = () => {
    saveWidgets(DEFAULT_WIDGETS)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const userGrowth = analytics?.daily_users || []
  const userGrowthData = userGrowth.length > 0 ? userGrowth : [
    { date: '2024-01', users: 120 }, { date: '2024-02', users: 145 }, { date: '2024-03', users: 178 },
    { date: '2024-04', users: 203 }, { date: '2024-05', users: 267 }, { date: '2024-06', users: 312 },
    { date: '2024-07', users: 389 }, { date: '2024-08', users: 445 }, { date: '2024-09', users: 523 },
    { date: '2024-10', users: 612 }, { date: '2024-11', users: 701 }, { date: '2024-12', users: 789 },
  ]

  const statCards = [
    { key: 'users', label: 'Total Users', value: stats?.users?.total ?? '—', change: '+12%', trend: 'up', icon: Users, color: 'blue' },
    { key: 'orders', label: 'Total Orders', value: stats?.orders?.total ?? '—', change: '+15%', trend: 'up', icon: ShoppingCart, color: 'green' },
    { key: 'products', label: 'Total Products', value: stats?.products?.total ?? '—', change: '+7%', trend: 'up', icon: Package, color: 'purple' },
    { key: 'revenue', label: 'Monthly Revenue', value: fmtMoney(stats?.revenue?.monthly), change: '+22%', trend: 'up', icon: DollarSign, color: 'emerald' },
    { key: 'tickets', label: 'Open Tickets', value: systemMetrics?.open_tickets ?? stats?.tickets ?? '—', change: '-3%', trend: 'down', icon: Activity, color: 'yellow' },
    { key: 'withdrawals', label: 'Pending Withdrawals', value: systemMetrics?.pending_withdrawals ?? '—', change: '+5%', trend: 'up', icon: DollarSign, color: 'orange' },
    { key: 'applications', label: 'Pending Applications', value: systemMetrics?.pending_applications ?? stats?.applications?.vendor ?? '—', change: '-8%', trend: 'down', icon: Users, color: 'red' },
    { key: 'reports', label: 'Pending Reports', value: systemMetrics?.pending_reports ?? stats?.reports ?? '—', change: '-2%', trend: 'down', icon: Shield, color: 'purple' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Platform statistics and real-time activity</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={() => setShowCustomize(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <GripVertical className="w-4 h-4" /> Customize
          </button>
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${sseConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            {sseConnected ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      {showCustomize && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Customize Dashboard</h3>
            <div className="flex gap-2">
              <button onClick={resetWidgets} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                <RotateCw className="w-4 h-4" /> Reset
              </button>
              <button onClick={() => setShowCustomize(false)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                <Save className="w-4 h-4 inline mr-1" /> Done
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-4">Drag to reorder, toggle to show/hide widgets</p>
          <div className="space-y-2">
            {widgets.map((widget) => (
              <div
                key={widget.key}
                draggable
                onDragStart={(e) => handleDragStart(e, widget)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, widget)}
                className={`flex items-center gap-3 p-3 rounded-lg border ${draggedWidget?.key === widget.key ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'} cursor-move`}
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                <span className="flex-1 text-sm font-medium text-gray-700">{widget.label}</span>
                <button
                  onClick={() => toggleWidget(widget.key)}
                  className={`p-1 rounded ${widget.visible ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {widget.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {widgets.find(w => w.key === 'statCards')?.visible && (
        <div data-tour="stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600' : stat.color === 'green' ? 'bg-green-50 text-green-600' : stat.color === 'purple' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex items-center mt-3 text-sm">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}>{stat.change}</span>
                  <span className="text-gray-400 ml-2">vs last month</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {widgets.find(w => w.key === 'userGrowth')?.visible && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth (12 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="users" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} />
              <Bar dataKey="newUsers" fill="#10b981" barSize={12} radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.find(w => w.key === 'revenueChart')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue (30 days)</h3>
            {analytics?.daily_revenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={analytics.daily_revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => [fmtMoney(value), 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-gray-500">No revenue data</div>
            )}
          </div>
        )}

        {widgets.find(w => w.key === 'ordersChart')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders (30 days)</h3>
            {analytics?.daily_orders?.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.daily_orders}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-52 flex items-center justify-center text-gray-500">No order data</div>
            )}
          </div>
        )}
      </div>

      {/* Conversion Funnel & Geographic Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.find(w => w.key === 'conversionFunnel')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Conversion Funnel
            </h3>
            {analytics?.daily_orders?.length > 0 && analytics?.daily_revenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  layout="vertical"
                  data={[
                    { name: 'Visitors', value: (analytics.daily_revenue.length * 50) || 1000, fill: '#3b82f6' },
                    { name: 'Registered', value: stats?.users?.total || 500, fill: '#6366f1' },
                    { name: 'Active Buyers', value: stats?.users?.customers || 200, fill: '#8b5cf6' },
                    { name: 'Orders Placed', value: stats?.orders?.total || 100, fill: '#ec4899' },
                    { name: 'Completed', value: (stats?.orders?.total * 0.7) || 70, fill: '#10b981' },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(value) => [value.toLocaleString(), 'Count']} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">No funnel data</div>
            )}
          </div>
        )}

        {widgets.find(w => w.key === 'geoDistribution')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Geographic Distribution
            </h3>
            {analytics?.top_regions?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie
                    data={analytics.top_regions.slice(0, 6).map(r => ({
                      name: r.shipping_address || 'Unknown',
                      value: r.orders || 0,
                      revenue: r.revenue || 0
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {analytics.top_regions.slice(0, 6).map((r, i) => (
                      <Cell key={`cell-${i}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value.toLocaleString(), name]} />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">No geographic data</div>
            )}
          </div>
        )}
      </div>

      {/* Role Distribution & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.find(w => w.key === 'roleDistribution')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              User Role Distribution
            </h3>
            {enhancedMetrics?.role_distribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie
                    data={enhancedMetrics.role_distribution.map(r => ({
                      name: r.role.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                      value: r.count
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {enhancedMetrics.role_distribution.map((_, i) => (
                      <Cell key={`role-${i}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6'][i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Users']} />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">No role data</div>
            )}
          </div>
        )}

        {widgets.find(w => w.key === 'systemHealth')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-orange-600" />
              System Health Overview
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <HealthMetric
                  label="Database"
                  value={systemMetrics?.database ? 'Healthy' : 'Down'}
                  icon={Database}
                  status={systemMetrics?.database ? 'healthy' : 'critical'}
                  detail={`Latency: ${systemMetrics?.db_latency_ms || '—'}ms`}
                />
                <HealthMetric
                  label="Active Sessions"
                  value={systemMetrics?.active_sessions || '—'}
                  icon={Users}
                  status='info'
                  detail="Current connections"
                />
                <HealthMetric
                  label="Error Rate (1h)"
                  value={`${systemMetrics?.error_rate_1h || 0}%`}
                  icon={AlertTriangle}
                  status={(systemMetrics?.error_rate_1h || 0) > 5 ? 'warning' : 'healthy'}
                  detail="API errors per hour"
                />
                <HealthMetric
                  label="Slow Queries"
                  value={systemMetrics?.slow_queries_1h || '—'}
                  icon={Clock}
                  status={(systemMetrics?.slow_queries_1h || 0) > 10 ? 'warning' : 'healthy'}
                  detail="Last hour"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <HealthMetric
                  label="CPU Usage"
                  value={`${systemMetrics?.system?.cpu_usage_percent?.toFixed(1) || '—'}%`}
                  icon={Cpu}
                  status={
                    (systemMetrics?.system?.cpu_usage_percent || 0) > 80 ? 'critical' :
                    (systemMetrics?.system?.cpu_usage_percent || 0) > 60 ? 'warning' : 'healthy'
                  }
                  detail={`${systemMetrics?.system?.cpus || '—'} cores`}
                />
                <HealthMetric
                  label="Memory Usage"
                  value={`${systemMetrics?.system?.memory_usage_percent?.toFixed(1) || '—'}%`}
                  icon={HardDrive}
                  status={
                    (systemMetrics?.system?.memory_usage_percent || 0) > 85 ? 'critical' :
                    (systemMetrics?.system?.memory_usage_percent || 0) > 70 ? 'warning' : 'healthy'
                  }
                  detail={`${systemMetrics?.system?.memory_total ? (systemMetrics.system.memory_total / 1024 / 1024 / 1024).toFixed(1) + ' GB' : '—'}`}
                />
                <HealthMetric
                  label="Disk Usage"
                  value={`${systemMetrics?.disk_usage?.toFixed(1) || '—'}%`}
                  icon={Database}
                  status={
                    (systemMetrics?.disk_usage || 0) > 90 ? 'critical' :
                    (systemMetrics?.disk_usage || 0) > 75 ? 'warning' : 'healthy'
                  }
                  detail="Storage capacity"
                />
                <HealthMetric
                  label="Uptime"
                  value={systemMetrics?.system?.uptime_seconds ? formatUptime(systemMetrics.system.uptime_seconds) : '—'}
                  icon={Clock}
                  status='info'
                  detail="Since last restart"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Platform Tasks & Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {widgets.find(w => w.key === 'platformTasks')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              Platform Tasks & Alerts
            </h3>
            <div className="space-y-3">
              <TaskRow
                title="Pending Vendor Applications"
                count={stats?.applications?.vendor || 0}
                icon={FileText}
                color="blue"
                link="/superadmin/applications"
              />
              <TaskRow
                title="Open Support Tickets"
                count={stats?.tickets || 0}
                icon={MessageSquare}
                color="yellow"
                link="/superadmin/support-tickets"
              />
              <TaskRow
                title="Pending Withdrawals"
                count={stats?.withdrawals?.pending || 0}
                icon={CreditCard}
                color="green"
                link="/superadmin/withdrawals"
              />
              <TaskRow
                title="Reported Products"
                count={stats?.reports || 0}
                icon={Shield}
                color="red"
                link="/superadmin/reported-products"
              />
              <TaskRow
                title="Pending Logistics Applications"
                count={stats?.applications?.logistics || 0}
                icon={Truck}
                color="purple"
                link="/superadmin/applications"
              />
              <TaskRow
                title="Pending Warehouse Applications"
                count={stats?.applications?.warehouse || 0}
                icon={Warehouse}
                color="orange"
                link="/superadmin/applications"
              />
            </div>
          </div>
        )}

        {/* Real-time Metrics Card */}
        {widgets.find(w => w.key === 'platformTasks')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Live Metrics
            </h3>
            <div className="space-y-4">
              <LiveMetric
                label="Users Online"
                value={realtimeStats?.users || stats?.users?.total || '—'}
                trend={realtimeStats ? 'live' : 'static'}
                icon={Users}
              />
              <LiveMetric
                label="Orders Today"
                value={realtimeStats?.todayOrders || enhancedMetrics?.today_orders || '—'}
                trend={realtimeStats ? 'live' : 'static'}
                icon={ShoppingCart}
              />
              <LiveMetric
                label="Revenue Today"
                value={realtimeStats?.todayRevenue ? fmtMoney(realtimeStats.todayRevenue) : (enhancedMetrics?.today_revenue ? fmtMoney(enhancedMetrics.today_revenue) : '—')}
                trend={realtimeStats ? 'live' : 'static'}
                icon={DollarSign}
              />
              <LiveMetric
                label="Active Sessions"
                value={realtimeStats?.activeSessions || systemMetrics?.active_sessions || '—'}
                trend={realtimeStats ? 'live' : 'static'}
                icon={Monitor}
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.find(w => w.key === 'recentUsers')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Users</h3>
              <NavLink to="/superadmin/users" className="text-sm text-red-600 hover:text-red-700">View all</NavLink>
            </div>
            <div className="space-y-3">
              {recentUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email || user.phone}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 capitalize bg-white px-2 py-1 rounded-full">{user.role}</span>
                </div>
              ))}
              {recentUsers.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No recent users</p>}
            </div>
          </div>
        )}

        {widgets.find(w => w.key === 'recentOrders')?.visible && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
              <NavLink to="/superadmin/orders" className="text-sm text-red-600 hover:text-red-700">View all</NavLink>
            </div>
            <div className="space-y-3">
              {recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{order.order_number}</p>
                    <p className="text-xs text-gray-500">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{fmtMoney(order.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>{order.status}</span>
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No recent orders</p>}
            </div>
          </div>
        )}
      </div>

      {widgets.find(w => w.key === 'quickLinks')?.visible && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NavLink to="/superadmin/users" className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Manage Users</span>
          </NavLink>
          <NavLink to="/superadmin/products" className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all">
            <Package className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Manage Products</span>
          </NavLink>
          <NavLink to="/superadmin/orders" className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all">
            <ShoppingCart className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Manage Orders</span>
          </NavLink>
          <NavLink to="/superadmin/settings" className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-sm transition-all">
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">System Settings</span>
          </NavLink>
        </div>
      )}
    </div>
  )
}
