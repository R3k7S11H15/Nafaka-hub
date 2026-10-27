import React, { useEffect, useState, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Users, Store, Package, ShoppingCart, DollarSign, Truck, Warehouse, Shield,
  Activity, ArrowUpRight, Loader2, RefreshCw, Monitor, AlertTriangle,
  TrendingUp, BarChart3, Globe, FileText, Settings, Bell, UserCheck,
  Ban, Eye, Edit3, Trash2, CheckCircle, XCircle, Clock, Search,
  ChevronDown, ChevronUp, MoreVertical, Zap
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import api from '../services/api'
import storage from '../utils/storage'
import { useSSE } from '../hooks/useSSE'

const COLORS = ['#059669', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6']

const fmtMoney = (v) => {
  if (v == null) return 'TZS 0'
  if (typeof v === 'string') return v
  if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `TZS ${(v / 1_000).toFixed(1)}K`
  return `TZS ${v.toLocaleString()}`
}

const fmtNum = (v) => {
  if (v == null) return '0'
  if (typeof v === 'string') return v
  return v.toLocaleString()
}

const timeAgo = (date) => {
  if (!date) return '—'
  const d = new Date(date)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const statusBadge = (status) => {
  const s = (status || '').toLowerCase()
  const colors = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    delivered: 'bg-green-100 text-green-700',
    shipped: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    refunded: 'bg-purple-100 text-purple-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    resolved: 'bg-green-100 text-green-700',
    open: 'bg-yellow-100 text-yellow-700',
    investigating: 'bg-blue-100 text-blue-700',
  }
  return colors[s] || 'bg-gray-100 text-gray-700'
}

export default function SuperAdminDashboard() {
  const [overview, setOverview] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [orderFilter, setOrderFilter] = useState('')

  const realtimeUrl = api.getSuperAdminRealtime()

  const { data: sseData, connected: sseConnected } = useSSE(realtimeUrl, {
    enabled: !!storage.getItem('auth_token'),
    autoReconnect: true,
    onMessage: (msg) => {
      if (msg.type === 'stats_update') {
        setOverview(prev => ({
          stats: msg.stats,
          recent: { users: msg.recent_users, orders: msg.recent_orders },
          timestamp: msg.timestamp
        }))
        setOrders(msg.recent_orders || [])
      }
    }
  })

  const fetchDashboardData = useCallback(async () => {
    try {
      const [overviewRes, analyticsRes, usersRes, ordersRes] = await Promise.all([
        api.getSuperAdminStats(),
        api.getSuperAdminAnalytics(30),
        api.getSuperAdminUsers({ limit: 20 }),
        api.getSuperAdminOrders({ limit: 10 }),
      ])

      setOverview(overviewRes?.data || overviewRes || null)
      setAnalytics(analyticsRes?.data || analyticsRes || null)
      setUsers(usersRes?.data?.users || usersRes?.users || [])
      setOrders(ordersRes?.data?.orders || ordersRes?.orders || [])
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await api.updateSuperAdminUser(userId, { is_active: currentStatus ? 0 : 1 })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
      api.createSuperAdminAuditLog({
        action: `user_${!currentStatus ? 'activated' : 'deactivated'}`,
        entity_type: 'user',
        entity_id: userId,
        details: `User status changed to ${!currentStatus ? 'active' : 'inactive'}`
      }).catch(() => {})
    } catch (err) {
      console.error('Failed to update user:', err)
    }
  }

  const stats = overview?.stats || {}
  const systemStats = [
    { label: 'Total Users', value: fmtNum(stats.users?.total), change: '+12%', up: true, icon: Users, color: 'blue' },
    { label: 'Total Customers', value: fmtNum(stats.users?.customers), change: '+8%', up: true, icon: UserCheck, color: 'green' },
    { label: 'Total Sellers', value: fmtNum(stats.users?.sellers), change: '+5%', up: true, icon: Store, color: 'purple' },
    { label: 'Total Orders', value: fmtNum(stats.orders?.total), change: '+15%', up: true, icon: ShoppingCart, color: 'orange' },
    { label: 'Pending Orders', value: fmtNum(stats.orders?.pending), change: '-3%', up: false, icon: Clock, color: stats.orders?.pending > 10 ? 'red' : 'yellow' },
    { label: 'Total Products', value: fmtNum(stats.products?.total), change: '+7%', up: true, icon: Package, color: 'indigo' },
    { label: 'Monthly Revenue', value: fmtMoney(stats.revenue?.monthly), change: '+22%', up: true, icon: DollarSign, color: 'green' },
    { label: 'Total Revenue', value: fmtMoney(stats.revenue?.total), change: '+18%', up: true, icon: TrendingUp, color: 'emerald' },
  ]

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }

  const managementLinks = [
    { name: 'User Management', href: '/admin/users', icon: Users, description: 'Manage all users and roles' },
    { name: 'Product Approval', href: '/marketplace/approvals', icon: Package, description: 'Review and approve products' },
    { name: 'Order Monitoring', href: '/admin', icon: ShoppingCart, description: 'Monitor all platform orders' },
    { name: 'Payment Monitoring', href: '/finance', icon: DollarSign, description: 'Track payments and commissions' },
    { name: 'Delivery Monitoring', href: '/logistics', icon: Truck, description: 'Track active deliveries' },
    { name: 'Warehouses', href: '/warehouse', icon: Warehouse, description: 'Manage warehouse services' },
    { name: 'Revenue Dashboard', href: '/revenue-dashboard', icon: BarChart3, description: 'Financial analytics' },
    { name: 'Security & Audit', href: '/admin/audit', icon: Shield, description: 'Security logs and settings' },
    { name: 'Support Tickets', href: '/messages', icon: FileText, description: 'Customer support management' },
    { name: 'Site Content', href: '/admin/panel', icon: Globe, description: 'CMS and banners' },
    { name: 'AI Agents', href: '/ai-dashboard', icon: Activity, description: 'AI system management' },
    { name: 'Logistics', href: '/logistics', icon: Truck, description: 'Transport management' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Super Admin Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Full system control and real-time oversight</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-sm">
              <div className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-gray-600">{sseConnected ? 'Live' : 'Offline'}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {systemStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${colorMap[stat.color] || 'bg-gray-50 text-gray-600'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="flex items-center mt-3 text-sm">
                  {stat.up ? <TrendingUp className="h-4 w-4 text-green-500 mr-1" /> : <TrendingUp className="h-4 w-4 text-red-500 mr-1 rotate-180" />}
                  <span className={stat.up ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>{stat.change}</span>
                  <span className="text-gray-400 ml-2">vs last month</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'orders', label: 'Orders', icon: ShoppingCart },
              { id: 'revenue', label: 'Revenue', icon: DollarSign },
              { id: 'system', label: 'System', icon: Monitor },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{[
                    { name: 'Manage Users', href: '/admin/users', icon: Users },
                    { name: 'Review Products', href: '/marketplace/approvals', icon: Package },
                    { name: 'View Orders', href: '/admin', icon: ShoppingCart },
                    { name: 'System Settings', href: '/settings', icon: Settings },
                ].map(item => (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </NavLink>
                  ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue (30 days)</h3>
                    {analytics?.daily_revenue?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={analytics.daily_revenue}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(value) => [fmtMoney(value), 'Revenue']} />
                          <Area type="monotone" dataKey="revenue" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">No revenue data available</div>
                    )}
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Orders (30 days)</h3>
                    {analytics?.daily_orders?.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={analytics.daily_orders}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="orders" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-gray-500">No order data available</div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {(overview?.recent?.orders || []).slice(0, 5).map((order, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <ShoppingCart className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Order #{order.order_number}</p>
                            <p className="text-xs text-gray-500">{order.customer_name} · {timeAgo(order.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{fmtMoney(order.total_amount)}</p>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(order.status)}`}>{order.status}</span>
                        </div>
                      </div>
                    ))}
                    {(overview?.recent?.orders || []).length === 0 && (
                      <div className="text-center py-8 text-gray-500">No recent activity</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Roles</option>
                    <option value="customer">Customers</option>
                    <option value="seller">Sellers</option>
                    <option value="vendor_admin">Vendor Admins</option>
                    <option value="logistics_company">Logistics</option>
                    <option value="warehouse">Warehouses</option>
                  </select>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.full_name || '—'}</p>
                              <p className="text-xs text-gray-500">{user.email || user.phone || '—'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-700 capitalize">{user.role || '—'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {user.is_verified ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-400" />}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{timeAgo(user.created_at)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                className={`p-1.5 rounded-lg ${user.is_active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                                title={user.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {user.is_active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                              <NavLink to={`/admin/users?user=${user.id}`} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                                <Eye className="w-4 h-4" />
                              </NavLink>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="p-12 text-center text-gray-500">No users found</div>
                  )}
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={orderFilter}
                    onChange={(e) => setOrderFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-gray-900">#{order.order_number}</p>
                            <p className="text-xs text-gray-500">{order.payment_method}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-900">{order.customer_name || '—'}</p>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{fmtMoney(order.total_amount)}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(order.status)}`}>{order.status}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{timeAgo(order.created_at)}</td>
                          <td className="px-6 py-4">
                            <select
                              value={order.status}
                              onChange={(e) => api.updateSuperAdminOrder(order.id, { status: e.target.value }).then(() => {
                                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: e.target.value } : o))
                              })}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && (
                    <div className="p-12 text-center text-gray-500">No orders found</div>
                  )}
                </div>
              </div>
            )}

            {/* Revenue Tab */}
            {activeTab === 'revenue' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 rounded-lg p-6">
                    <p className="text-sm text-green-600 font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">{fmtMoney(stats.revenue?.total)}</p>
                    <p className="text-sm text-green-600 mt-1">Lifetime platform revenue</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <p className="text-sm text-blue-600 font-medium">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">{fmtMoney(stats.revenue?.monthly)}</p>
                    <p className="text-sm text-blue-600 mt-1">Last 30 days</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-6">
                    <p className="text-sm text-purple-600 font-medium">Commissions</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">{fmtMoney(stats.commissions?.total)}</p>
                    <p className="text-sm text-purple-600 mt-1">{fmtMoney(stats.commissions?.pending)} pending</p>
                  </div>
                </div>
                {analytics?.revenue_by_type?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Type</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={analytics.revenue_by_type} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="total">
                            {analytics.revenue_by_type.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [fmtMoney(value), 'Revenue']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {analytics.revenue_by_type.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-sm text-gray-700 capitalize">{item.revenue_type.replace('_', ' ')}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{fmtMoney(item.total)}</p>
                              <p className="text-xs text-gray-500">{item.transactions} transactions</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg"><Activity className="w-5 h-5 text-green-600" /></div>
                      <h3 className="font-semibold text-gray-900">Database</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.db_size ? `${(stats.db_size / 1024 / 1024).toFixed(1)} MB` : '—'}</p>
                    <p className="text-sm text-gray-500 mt-1">Database size</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
                      <h3 className="font-semibold text-gray-900">Active Sessions</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.users?.total || '—'}</p>
                    <p className="text-sm text-gray-500 mt-1">Registered users</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
                      <h3 className="font-semibold text-gray-900">Open Tickets</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.tickets || '—'}</p>
                    <p className="text-sm text-gray-500 mt-1">Require attention</p>
                  </div>
                </div>

                {/* Management Links */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Management</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {managementLinks.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <item.icon className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">{item.name}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>

                {/* Order Status Distribution */}
                {analytics?.order_status?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={analytics.order_status}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* User Growth */}
                {analytics?.user_growth?.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth (30 days)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={analytics.user_growth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="new_users" stroke="#059669" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
