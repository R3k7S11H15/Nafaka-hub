import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, Loader2, TrendingUp, Target, Shield, DollarSign, Star } from 'lucide-react'
import api from '../services/api'

export default function LogisticsAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    try {
      const res = await api.getMyAnalytics()
      setAnalytics(res?.analytics || null)
    } catch {
      setAnalytics(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total Deliveries', value: analytics?.total_deliveries || 0, icon: BarChart3, color: 'bg-blue-500' },
    { label: 'Completed', value: analytics?.completed_deliveries || 0, icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Cancelled', value: analytics?.cancelled_deliveries || 0, icon: BarChart3, color: 'bg-red-500' },
    { label: 'In Progress', value: analytics?.in_progress_deliveries || 0, icon: BarChart3, color: 'bg-yellow-500' },
    { label: 'Revenue', value: analytics?.total_revenue ? `${Number(analytics.total_revenue).toLocaleString()} TZS` : '0 TZS', icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Average Rating', value: analytics?.average_rating ? `${parseFloat(analytics.average_rating).toFixed(1)} ★` : '0.0 ★', icon: Star, color: 'bg-amber-500' },
    { label: 'On-Time Delivery', value: `${analytics?.on_time_delivery_pct || 0}%`, icon: Target, color: 'bg-indigo-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">Performance insights for your logistics business</p>
        </div>
        <button onClick={loadAll} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                  <p className="text-lg lg:text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.color} bg-opacity-10`}>
                  <Icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {analytics?.top_route && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Top Route</h2>
          <p className="text-gray-600">{analytics.top_route}</p>
        </div>
      )}
    </div>
  )
}
