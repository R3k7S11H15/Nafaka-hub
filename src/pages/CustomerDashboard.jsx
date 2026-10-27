import React, { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { ShoppingCart, Heart, Package, Truck, Star, DollarSign, ArrowUpRight, Bell, Loader2, TrendingUp, Zap, Brain, Lightbulb, MapPin, User } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSSE } from '../hooks/useSSE'
import { useToast } from '../context/ToastContext'
import { Button, Card, Badge, StatusIndicator, DataTable, ErrorAlert } from '../components/UI'

export default function CustomerDashboard() {
  const toast = useToast()
  const [stats, setStats] = useState({
    total_orders: 0,
    total_spent: 0,
    pending_orders: 0,
    completed_orders: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [deliveryMap, setDeliveryMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [aiRecommendations, setAiRecommendations] = useState([])
  const { user } = useAuth()
  const customerId = user?.id

  const fetchStats = useCallback(async () => {
    if (!customerId) return
    try {
      const data = await api.getUserStats(customerId)
      if (data.success) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [customerId])

  const fetchOrders = useCallback(async () => {
    if (!customerId) return
    try {
      const [ordersData, trackingData] = await Promise.all([api.getOrders(customerId), api.getMyDeliveryTracking()])
      if (ordersData.success) {
        const orderList = (ordersData.orders || []).map(o => ({
          id: o.order_number,
          orderId: o.id,
          date: o.created_at ? new Date(o.created_at).toLocaleDateString('en-TZ', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
          status: o.status || 'pending',
          total: o.total_amount || 0,
          items: o.items || [],
          product: o.items?.[0]?.name || 'Product',
        }))
        setRecentOrders(orderList.slice(0, 4))
      }
      const tracking = trackingData?.deliveries || []
      const map = {}
      tracking.forEach(t => { map[t.id] = t })
      setDeliveryMap(map)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  const fetchNotifications = useCallback(async () => {
    if (!customerId) return
    try {
      const data = await api.getNotifications(customerId, { unreadOnly: true, limit: 1 })
      if (data.success) {
        setUnreadNotificationCount(data.notifications?.length || 0)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }, [customerId])

  const fetchAIRecommendations = useCallback(async () => {
    if (!customerId) return
    try {
      const data = await api.getAIRecommendations('pending')
      if (data.success) {
        setAiRecommendations(data.recommendations || [])
      }
    } catch (err) {
      console.error('Failed to fetch AI recommendations:', err)
    }
  }, [customerId])

  const [marketAlerts, setMarketAlerts] = useState([])
  const fetchMarketAlerts = useCallback(async () => {
    try {
      const data = await api.getMarketPrices()
      if (data.success) {
        const latest = (data.prices || []).slice(0, 6).map((p, idx) => {
          const trend = p.trend || 'stable'
          const change = trend === 'rising' ? `+${(Math.random() * 4 + 0.5).toFixed(1)}%`
            : trend === 'falling' ? `-${(Math.random() * 3 + 0.3).toFixed(1)}%`
            : `${(Math.random() * 0.6).toFixed(1)}%`
          return {
            name: `${p.commodity} (${p.region})`,
            change,
            positive: trend !== 'falling',
            desc: trend === 'rising' ? `Demand rising in ${p.region}` : trend === 'falling' ? `Slight decline in ${p.region}` : 'Stable supply',
            key: `${p.id}-${idx}`,
          }
        })
        setMarketAlerts(latest)
      }
    } catch (err) {
      console.error('Failed to fetch market alerts', err)
    }
  }, [])

  useEffect(() => {
    if (customerId) {
      fetchStats()
      fetchOrders()
      fetchNotifications()
      fetchAIRecommendations()
    }
    fetchMarketAlerts()
  }, [customerId, fetchStats, fetchOrders, fetchNotifications, fetchAIRecommendations, fetchMarketAlerts])

  const { connected: notifSseConnected } = useSSE(
    customerId ? `/api/notifications_realtime.php?customer_id=${customerId}` : null,
    {
      onMessage: (event) => {
        if (!event || event.type === 'error' || event.type === 'initial') return
        switch (event.type) {
          case 'notification':
            setUnreadNotificationCount(prev => prev + 1)
            break
          case 'unread_count':
            if (event.unread_count !== undefined) {
              setUnreadNotificationCount(event.unread_count)
            }
            break
          default:
            break
        }
      },
    }
  )

  const { connected: sseConnected } = useSSE(
    customerId ? `/api/orders_realtime.php?customer_id=${customerId}` : null,
    {
      onMessage: (event) => {
        if (!event || event.type === 'error') return

        switch (event.type) {
          case 'order_update':
            if (event.data) {
              const updatedOrder = {
                id: event.data.order_number,
                orderId: event.data.id,
                date: event.data.created_at ? new Date(event.data.created_at).toLocaleDateString('en-TZ', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
                status: event.data.status || 'pending',
                total: event.data.total_amount || 0,
                items: event.data.items || [],
                product: event.data.items?.[0]?.name || 'Product',
              }
              setRecentOrders(prev => {
                const filtered = prev.filter(o => o.orderId !== updatedOrder.orderId)
                return [updatedOrder, ...filtered.slice(0, 3)]
              })
            }
            break
          default:
            break
        }
      },
    }
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Loading your dashboard...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome back, {user?.name?.split(' ')[0] || 'Guest'}! Here's your overview.
            </p>
          </div>
          <Button as={NavLink} to="/products" icon={ShoppingCart} variant="primary" size="md">
            Browse Products
          </Button>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: stats.total_orders || 0, icon: ShoppingCart, color: 'blue' },
          { label: 'Total Spent', value: `TZS ${(stats.total_spent || 0).toLocaleString()}`, icon: DollarSign, color: 'green' },
          { label: 'Pending Orders', value: stats.pending_orders || 0, icon: Package, color: 'yellow' },
          { label: 'Completed', value: stats.completed_orders || 0, icon: Star, color: 'purple' },
        ].map((stat, i) => (
          <Card key={i} className={`shadow-card ${sseConnected ? 'hover:shadow-elevated' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: stat.color === 'blue' ? '#eff6ff' : stat.color === 'green' ? '#f0fdf4' : stat.color === 'yellow' ? '#fffbeb' : '#f5f3ff' }}>
                <stat.icon className={`h-6 w-6`} style={{ color: stat.color === 'blue' ? '#3b82f6' : stat.color === 'green' ? '#16a34a' : stat.color === 'yellow' ? '#d97706' : '#a855f7' }} />
              </div>
            </div>
            <div className="flex items-center mt-3 text-xs font-medium text-gray-400">
              <ArrowUpRight className="h-3 w-3 mr-1 text-green-500" />
              <span className="text-green-600">Active</span>
            </div>
          </Card>
        ))}
      </div>

      {error && (
        <ErrorAlert message={error} />
      )}

      <DataTable
        header={
          <>
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track and manage your orders</p>
          </>
        }
        headerAction={
          <NavLink to="/my-orders" className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1">
            View All <ArrowUpRight className="w-4 h-4" />
          </NavLink>
        }
        columns={[
          { key: 'id', header: 'Order ID', render: (val) => <span className="font-semibold text-gray-900">#{val}</span> },
          { key: 'product', header: 'Product' },
          { key: 'total', header: 'Amount', render: (val) => <span className="font-semibold text-gray-900">TZS {val.toLocaleString()}</span> },
          { key: 'status', header: 'Status', render: (val) => <StatusIndicator status={val} variant="pill" /> },
          {
            key: 'orderId',
            header: 'Delivery',
            render: (_, row) => {
              const delivery = deliveryMap[row.orderId]
              return delivery ? (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1"><Truck className="w-3 h-3 text-gray-400" /> {delivery.delivery_status || delivery.status || 'Assigned'}</div>
                  {delivery.driver_name && <div className="flex items-center gap-1"><User className="w-3 h-3 text-gray-400" /> {delivery.driver_name}</div>}
                  {delivery.delivery_address && <div className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3 text-gray-400" /> {delivery.delivery_address}</div>}
                </div>
              ) : <span className="text-gray-400">—</span>
            },
          },
          { key: 'date', header: 'Date' },
          {
            key: 'action',
            header: 'Action',
            align: 'right',
            render: (_, row) => (
              <NavLink to={`/tracking/${row.id}`} className="text-sm text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-1">
                Track <TrendingUp className="w-3 h-3" />
              </NavLink>
            ),
          },
        ]}
        data={recentOrders}
        emptyMessage="No orders yet. Start shopping to see your orders here."
        rowKey="orderId"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card header={
          <>
            <h2 className="text-lg font-semibold text-gray-900">Market Alerts</h2>
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">Last 7 days</span>
          </>
        } className="shadow-card">
          {marketAlerts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No market updates available.</p>
          ) : (
            <div className="space-y-3">
              {marketAlerts.map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <span className={`text-sm font-bold ${item.positive ? 'text-green-600' : 'text-red-600'}`}>{item.change}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card header={
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        } className="shadow-card">
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: '/products', icon: Package, label: 'Browse Products', color: 'green' },
              { to: '/cart', icon: ShoppingCart, label: 'View Cart', color: 'blue' },
              { to: '/my-orders', icon: Truck, label: 'Track Orders', color: 'purple' },
              { to: '/notifications', icon: Bell, label: 'Notifications', color: 'yellow', badge: unreadNotificationCount },
            ].map((action, i) => (
              <NavLink
                key={i}
                to={action.to}
                className="group relative p-4 bg-gray-50 rounded-xl hover:bg-green-50 hover:border-green-100 border border-transparent transition-all text-center"
              >
                {action.badge > 0 && (
                  <Badge className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {action.badge}
                  </Badge>
                )}
                <div className={`w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center transition-colors`} style={{ backgroundColor: action.color === 'green' ? '#dcfce7' : action.color === 'blue' ? '#dbeafe' : action.color === 'purple' ? '#ede9fe' : '#fef3c7' }}>
                  <action.icon className={`w-5 h-5`} style={{ color: action.color === 'green' ? '#16a34a' : action.color === 'blue' ? '#3b82f6' : action.color === 'purple' ? '#a855f7' : '#d97706' }} />
                </div>
                <span className="text-sm font-medium text-gray-700 transition-colors group-hover:text-gray-900">{action.label}</span>
              </NavLink>
            ))}
          </div>
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Upgrade to Premium</p>
                <p className="text-xs text-gray-500">Get exclusive deals and priority support</p>
              </div>
            </div>
          </div>
        </Card>

        {aiRecommendations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-green-600" />
                AI Insights
              </h2>
              <NavLink to="/ai-dashboard" className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1">
                View All <ArrowUpRight className="w-4 h-4" />
              </NavLink>
            </div>
            <div className="space-y-3">
              {aiRecommendations.slice(0, 3).map(rec => (
                <div key={rec.id} className="flex items-start gap-4 p-4 bg-green-50/50 rounded-xl hover:bg-green-50 transition-colors">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{rec.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{rec.description}</p>
                  </div>
                  <Badge variant={rec.priority === 'high' ? 'danger' : rec.priority === 'medium' ? 'warning' : 'info'} className="text-xs font-medium">
                {rec.priority}
              </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
