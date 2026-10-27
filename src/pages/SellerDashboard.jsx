import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, ShoppingCart, Users, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Star, Bell, Search, Brain, Lightbulb, Zap, Loader2, Truck, MapPin, User, CreditCard } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function SellerDashboard() {
  const toast = useToast()
  const { user } = useAuth()
  const [stats, setStats] = useState([
    { label: 'Total Sales', value: '...', change: '', up: true, icon: DollarSign, color: 'green' },
    { label: 'Total Orders', value: '...', change: '', up: true, icon: ShoppingCart, color: 'blue' },
    { label: 'Products Listed', value: '...', change: '', up: true, icon: Package, color: 'purple' },
    { label: 'Customer Rating', value: '...', change: '', up: true, icon: Star, color: 'yellow' },
  ])
  const [recentOrders, setRecentOrders] = useState([])
  const [deliveryMap, setDeliveryMap] = useState({})
  const [topProducts, setTopProducts] = useState([])
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return
      try {
        const [statsRes, ordersRes, productsRes, aiRes, trackingRes] = await Promise.all([
          api.getSellerStats(user.id),
          api.getSellerOrders(user.id),
          api.getSellerTopProducts(user.id),
          api.getAIRecommendations('pending').catch(() => ({ success: false, recommendations: [] })),
          api.getSellerDeliveryTracking().catch(() => ({ success: true, deliveries: [] })),
        ])

        if (statsRes.success && statsRes.stats) {
          const s = statsRes.stats
          setStats([
            { label: 'Total Sales', value: `TZS ${(s.total_sales || 0).toLocaleString()}`, change: '', up: true, icon: DollarSign, color: 'green' },
            { label: 'Total Orders', value: String(s.total_orders || 0), change: '', up: true, icon: ShoppingCart, color: 'blue' },
            { label: 'Products Listed', value: String(s.total_products || 0), change: '', up: true, icon: Package, color: 'purple' },
            { label: 'Customer Rating', value: s.average_rating ? parseFloat(s.average_rating).toFixed(1) : '0.0', change: '', up: true, icon: Star, color: 'yellow' },
          ])
        }

        if (ordersRes.success && ordersRes.orders) {
          setRecentOrders(ordersRes.orders.slice(0, 5).map(o => ({
            id: o.order_number || `#${o.id}`,
            orderId: o.id,
            customer: o.customer_name || 'Customer',
            product: 'Order items',
            amount: `TZS ${(o.total_amount || 0).toLocaleString()}`,
            status: o.status || 'Processing',
            date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '',
          })))
        }

        const tracking = trackingRes?.deliveries || []
        const map = {}
        tracking.forEach(t => { map[t.id] = t })
        setDeliveryMap(map)

        if (productsRes.success && productsRes.products) {
          setTopProducts(productsRes.products.slice(0, 4).map(p => ({
            name: p.name,
            sales: p.sales_count || 0,
            revenue: `TZS ${(p.revenue || 0).toLocaleString()}`,
            trend: '',
          })))
        }

        if (aiRes.success && aiRes.recommendations) {
          setAiRecommendations(aiRes.recommendations || [])
        }
      } catch (err) {
        console.error('Failed to fetch seller dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user?.id])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
          <p className="text-gray-500 mt-1">Loading your store overview...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back, {user?.name || 'Seller'}! Here's your store overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <NavLink to="/my-orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">View All</NavLink>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No orders yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                 <thead>
                   <tr className="border-b border-gray-200">
                     <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order ID</th>
                     <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                     <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                     <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                     <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Delivery</th>
                     <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                   </tr>
                 </thead>
                 <tbody>
                   {recentOrders.map((order) => {
                     const delivery = deliveryMap[order.orderId]
                     return (
                     <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                       <td className="py-4 px-4 text-sm font-medium text-gray-900">{order.id}</td>
                       <td className="py-4 px-4 text-sm text-gray-600">{order.customer}</td>
                       <td className="py-4 px-4 text-sm text-gray-900 font-medium">{order.amount}</td>
                       <td className="py-4 px-4">
                         <span className={`px-3 py-1 text-xs font-medium rounded-full ${order.status === 'Completed' ? 'bg-green-100 text-green-700' : order.status === 'Processing' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                           {order.status}
                         </span>
                       </td>
                       <td className="py-4 px-4 text-sm text-gray-600">
                         {delivery ? (
                           <div className="space-y-0.5">
                             <div className="flex items-center gap-1"><Truck className="w-3 h-3 text-gray-400" /> {delivery.delivery_status || delivery.status || 'Assigned'}</div>
                             {delivery.driver_name && <div className="flex items-center gap-1 text-xs"><User className="w-3 h-3 text-gray-400" /> {delivery.driver_name}</div>}
                             {delivery.delivery_address && <div className="flex items-center gap-1 text-xs"><MapPin className="w-3 h-3 text-gray-400" /> {delivery.delivery_address}</div>}
                           </div>
                         ) : (
                           <span className="text-gray-400">—</span>
                         )}
                       </td>
                       <td className="py-4 px-4 text-sm text-gray-500">{order.date}</td>
                     </tr>
                     )
                   })}
                 </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No products yet</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sales} sales · {product.revenue}</p>
                  </div>
                  {product.trend && (
                    <span className={`text-xs font-medium ${product.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{product.trend}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
             <NavLink to="/sell-products" className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <Package className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Add Product</span>
            </NavLink>
            <NavLink to="/vendor/products" className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <Package className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-medium text-gray-700">Manage Products</span>
            </NavLink>
            <NavLink to="/my-orders" className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Manage Orders</span>
            </NavLink>
            <NavLink to="/messages" className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <Users className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Messages</span>
            </NavLink>
            <NavLink to="/vendor/payment-settings" className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <CreditCard className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Payment Settings</span>
            </NavLink>
            <NavLink to="/analytics" className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Analytics</span>
            </NavLink>
          </div>
        </div>

        {aiRecommendations.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="w-5 h-5 text-green-600" />
                AI Insights
              </h2>
              <NavLink to="/ai-dashboard" className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1">
                View All <ArrowUpRight className="w-4 h-4" />
              </NavLink>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiRecommendations.slice(0, 4).map(rec => (
                <div key={rec.id} className="flex items-start gap-3 p-4 bg-green-50/50 rounded-lg hover:bg-green-50 transition-colors">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{rec.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rec.description}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0 ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                    rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
