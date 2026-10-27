import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, Truck, ClipboardList, PackageCheck, Users, DollarSign, FileText, User, CreditCard, Star, BarChart3, Loader2, RefreshCw, TrendingUp, Target, Shield, Bell, MessageSquare } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useSSE } from '../hooks/useSSE'

export default function LogisticsDashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState([])
  const [deliveries, setDeliveries] = useState([])
  const [history, setHistory] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [documents, setDocuments] = useState([])
  const [ratings, setRatings] = useState([])
  const [earningsSummary, setEarningsSummary] = useState({ today: 0, week: 0, month: 0, total: 0, available: 0 })
  const [profile, setProfile] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  const loadAll = async () => {
    try {
      const [reqRes, delRes, histRes, drvRes, vehRes, docRes, ratRes, earnSumRes, profRes, subRes, analyticsRes] = await Promise.all([
        api.getDeliveryRequests(), api.getMyDeliveries(), api.getDeliveryHistory(),
        api.getMyDrivers(), api.getMyVehicles(), api.getMyDocuments(), api.getMyRatings(),
        api.getMyEarningsSummary(), api.getMyLogisticsProfile(), api.getMyLogisticsSubscription(), api.getMyAnalytics(),
      ])
      setRequests(reqRes?.requests || [])
      setDeliveries(delRes?.deliveries || [])
      setHistory(histRes?.history || [])
      setDrivers(drvRes?.drivers || [])
      setVehicles(vehRes?.vehicles || [])
      setDocuments(docRes?.documents || [])
      setRatings(ratRes?.ratings || [])
      setEarningsSummary(earnSumRes?.summary || { today: 0, week: 0, month: 0, total: 0, available: 0 })
      setProfile(profRes?.profile || null)
      setSubscription(subRes?.subscription || null)
      setAnalytics(analyticsRes?.analytics || null)
    } catch {
      setRequests([]); setDeliveries([]); setHistory([]); setDrivers([]); setVehicles([]); setDocuments([]); setRatings([])
      setEarningsSummary({ today: 0, week: 0, month: 0, total: 0, available: 0 }); setProfile(null); setSubscription(null); setAnalytics(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  useSSE(
    user?.id ? `/api/notifications_realtime.php?customer_id=${user.id}` : null,
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

  const formatCurrency = (val) => `${Number(val || 0).toLocaleString()} TZS`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Available Deliveries', value: requests.length, icon: Package, color: 'bg-blue-500', href: '/logistics/available' },
    { label: 'Active Deliveries', value: deliveries.filter(d => ['in_transit', 'pending'].includes((d.status || '').toLowerCase())).length, icon: Truck, color: 'bg-yellow-500', href: '/logistics/active' },
    { label: 'Completed', value: history.filter(h => (h.status || '').toLowerCase() === 'delivered').length + deliveries.filter(d => (d.status || '').toLowerCase() === 'delivered').length, icon: Star, color: 'bg-green-500', href: '/logistics/history' },
    { label: 'Vehicles', value: vehicles.length, icon: PackageCheck, color: 'bg-purple-500', href: '/logistics/vehicles' },
    { label: 'Drivers', value: drivers.length, icon: Users, color: 'bg-orange-500', href: '/logistics/drivers' },
    { label: 'This Month', value: formatCurrency(earningsSummary.month), icon: DollarSign, color: 'bg-emerald-500', href: '/logistics/earnings' },
    { label: 'Avg Rating', value: analytics?.average_rating ? `${parseFloat(analytics.average_rating).toFixed(1)} ★` : '0.0 ★', icon: Shield, color: 'bg-amber-500', href: '/logistics/ratings' },
    { label: 'On-Time Delivery', value: `${analytics?.on_time_delivery_pct || 0}%`, icon: Target, color: 'bg-indigo-500', href: '/logistics/analytics' },
  ]

  const quickActions = [
    { name: 'Available Deliveries', href: '/logistics/available', icon: Package, color: 'bg-blue-50 text-blue-600' },
    { name: 'Active Deliveries', href: '/logistics/active', icon: Truck, color: 'bg-yellow-50 text-yellow-600' },
    { name: 'Vehicles', href: '/logistics/vehicles', icon: PackageCheck, color: 'bg-purple-50 text-purple-600' },
    { name: 'Drivers', href: '/logistics/drivers', icon: Users, color: 'bg-orange-50 text-orange-600' },
    { name: 'Earnings', href: '/logistics/earnings', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    { name: 'Documents', href: '/logistics/documents', icon: FileText, color: 'bg-gray-50 text-gray-600' },
    { name: 'Company Profile', href: '/logistics/profile', icon: User, color: 'bg-green-50 text-green-600' },
    { name: 'Subscription', href: '/logistics/subscription', icon: CreditCard, color: 'bg-indigo-50 text-indigo-600' },
  ]

  const recentRequests = requests.slice(0, 5)
  const recentDeliveries = deliveries.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Nafaka Hub Logistics</h1>
          <p className="text-gray-600 mt-1">Welcome back, {profile?.company_name || user?.name || 'Partner'}!</p>
        </div>
        <button onClick={loadAll} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <NavLink key={stat.label} to={stat.href} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-lg lg:text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.color} bg-opacity-10`}>
                  <Icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </NavLink>
          )
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <NavLink key={action.name} to={action.href} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow flex items-center gap-3">
              <div className={`p-2 rounded-lg ${action.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">{action.name}</span>
            </NavLink>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Delivery Requests</h2>
          </div>
          {recentRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No delivery requests at this time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{req.order_number || req.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.product_name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.shipping_address || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{req.total_amount ? `${Number(req.total_amount).toLocaleString()} TZS` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 border-t border-gray-100">
            <NavLink to="/logistics/available" className="text-sm text-green-600 hover:text-green-700 font-medium">View all requests →</NavLink>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Active Deliveries</h2>
          </div>
          {recentDeliveries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No active deliveries.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentDeliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{d.order_number || d.order_id || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (d.status || '').toLowerCase() === 'delivered' ? 'bg-green-100 text-green-800' :
                          (d.status || '').toLowerCase().includes('transit') ? 'bg-blue-100 text-blue-800' :
                          (d.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {d.status || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{d.delivery_cost ? `${Number(d.delivery_cost).toLocaleString()} TZS` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 border-t border-gray-100">
            <NavLink to="/logistics/active" className="text-sm text-green-600 hover:text-green-700 font-medium">View all deliveries →</NavLink>
          </div>
        </div>
      </div>
    </div>
  )
}
