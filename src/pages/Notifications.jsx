import React, { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { Bell, Check, Package, MessageSquare, TrendingUp, Star, Loader2, AlertCircle } from 'lucide-react'
import api from '../services/api'
import { useSSE } from '../hooks/useSSE'
import { useAuth } from '../context/AuthContext'

const getIcon = (type) => {
  switch (type) {
    case 'order': return <Package className="w-5 h-5 text-blue-600" />
    case 'price': return <TrendingUp className="w-5 h-5 text-green-600" />
    case 'message': return <MessageSquare className="w-5 h-5 text-purple-600" />
    case 'review': return <Star className="w-5 h-5 text-yellow-600" />
    case 'promotion': return <Bell className="w-5 h-5 text-red-600" />
    default: return <Bell className="w-5 h-5 text-gray-600" />
  }
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [markingRead, setMarkingRead] = useState(false)
  const { user } = useAuth()
  const customerId = user?.id

  const fetchNotifications = useCallback(async () => {
    if (!customerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.getNotifications(customerId)
      if (data.success) {
        setNotifications(data.notifications || [])
      } else {
        setError(data.message || 'Failed to load notifications')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  const { connected: sseConnected } = useSSE(
    customerId ? `/api/notifications_realtime.php?customer_id=${customerId}` : null,
    {
      onMessage: (event) => {
        if (!event || event.type === 'error') return

        switch (event.type) {
          case 'initial':
            break
          case 'notification':
            if (event.data) {
              setNotifications(prev => [event.data, ...prev])
            }
            break
          case 'unread_count':
            setNotifications(prev =>
              prev.map(n => ({ ...n, is_read: n.is_read ? n.is_read : 1 }))
            )
            break
          default:
            break
        }
      },
    }
  )

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAllRead = async () => {
    if (!customerId) return
    setMarkingRead(true)
    try {
      const data = await api.markNotificationsRead(customerId)
      if (data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      }
    } catch (err) {
      console.error('Mark all read error:', err)
    } finally {
      setMarkingRead(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">Real-time alerts and updates</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-500 mt-1">Real-time alerts and updates</p>
          </div>
          <button onClick={fetchNotifications} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Retry
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Failed to load notifications</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            {sseConnected && <span className="ml-2 text-green-600 text-xs font-medium">Connected (real-time)</span>}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingRead}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 disabled:opacity-50"
          >
            {markingRead ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No notifications yet</h2>
            <p className="text-gray-600">You'll receive notifications here when there are updates.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
                !notif.is_read ? 'border-green-200 bg-green-50/30' : 'border-gray-200 opacity-75'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-gray-50 rounded-xl flex-shrink-0">
                  {getIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {notif.created_at ? new Date(notif.created_at).toLocaleString() : 'Recently'}
                  </p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
