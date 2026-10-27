import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Activity, ShoppingCart, LogIn, LogOut, FileText, User, Clock, ChevronRight, Loader2, ArrowLeft, RefreshCw } from 'lucide-react'
import api from '../../services/api'

export default function SuperAdminUserActivity() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (userId) {
      fetchData()
    }
  }, [userId, filter])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await api.getUserActivity(userId)
      if (res?.success) {
        setTimeline(res.timeline)
        if (res.timeline.length > 0) {
          const first = res.timeline[0]
          if (first.type === 'order') {
            setUser({ id: userId, type: 'order', data: first.data })
          }
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'order': return ShoppingCart
      case 'login': return LogIn
      case 'logout': return LogOut
      case 'audit': return FileText
      default: return Activity
    }
  }

  const getActivityColor = (type, data) => {
    switch (type) {
      case 'order':
        if (data?.status === 'delivered') return 'bg-green-100 text-green-600'
        if (data?.status === 'cancelled') return 'bg-red-100 text-red-600'
        return 'bg-blue-100 text-blue-600'
      case 'login': return 'bg-green-100 text-green-600'
      case 'logout': return 'bg-gray-100 text-gray-600'
      case 'audit': return 'bg-purple-100 text-purple-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getActivityDescription = (item) => {
    switch (item.type) {
      case 'order':
        return `Placed order #${item.data?.order_number} - ${item.data?.status || 'unknown'} - TZS ${item.data?.total_amount?.toLocaleString()}`
      case 'login':
        return item.data?.success ? 'Logged in successfully' : `Login failed: ${item.data?.failure_reason || 'Unknown reason'}`
      case 'logout':
        return 'Logged out'
      case 'audit':
        return `${item.data?.action}: ${item.data?.details || 'No details'}`
      default:
        return 'Unknown activity'
    }
  }

  const filteredTimeline = filter === 'all' ? timeline : timeline.filter(t => t.type === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">User Activity Timeline</h1>
          <p className="text-gray-500 text-sm mt-1">Track all user actions and history</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">User ID: {userId}</h2>
            <p className="text-sm text-gray-500">{filteredTimeline.length} activities recorded</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex gap-2 flex-wrap">
            {['all', 'order', 'login', 'audit'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin w-6 h-6 text-red-600" />
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No activity found</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="divide-y divide-gray-100">
              {filteredTimeline.map((item, idx) => {
                const Icon = getActivityIcon(item.type)
                const color = getActivityColor(item.type, item.data)
                return (
                  <div key={idx} className="p-4 pl-16 relative">
                    <div className={`absolute left-5 w-7 h-7 ${color} rounded-full flex items-center justify-center`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{getActivityDescription(item)}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-0.5 rounded">{item.type}</span>
                          {item.data?.ip_address && (
                            <span className="text-xs text-gray-500 font-mono">IP: {item.data.ip_address}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs">{new Date(item.date).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
