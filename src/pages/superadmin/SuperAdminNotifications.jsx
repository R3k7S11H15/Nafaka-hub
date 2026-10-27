import React, { useEffect, useState } from 'react'
import { Bell, BellOff, CheckCircle, AlertTriangle, AlertCircle, Info, X, Check, RefreshCw, Filter, Eye, Trash2 } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'

const NOTIFICATION_TYPES = [
  { value: 'info', label: 'Info', icon: Info, color: 'blue' },
  { value: 'success', label: 'Success', icon: CheckCircle, color: 'green' },
  { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'yellow' },
  { value: 'error', label: 'Error', icon: AlertCircle, color: 'red' },
  { value: 'critical', label: 'Critical', icon: AlertTriangle, color: 'purple' },
]

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export default function SuperAdminNotifications() {
  const toast = useToast()
  const confirm = useConfirm()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ type: '', severity: '', is_read: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  useEffect(() => {
    fetchNotifications()
  }, [filters, page])

  const fetchNotifications = async () => {
    try {
      const res = await api.getAdminNotifications({ ...filters, limit, offset: (page - 1) * limit })
      if (res?.success) {
        setNotifications(res.notifications)
        setTotal(res.total)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDismiss = async (id) => {
    const confirmed = await confirm({ title: 'Dismiss this notification?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.dismissNotification(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      setTotal(prev => prev - 1)
    } catch (err) {
      console.error(err)
    }
  }

  const getTypeConfig = (type) => NOTIFICATION_TYPES.find(t => t.value === type) || NOTIFICATION_TYPES[0]

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleString()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Admin alerts and system events</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${showFilters ? 'bg-gray-100 border-gray-300' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Mark All Read
          </button>
          <button onClick={fetchNotifications} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.type}
                onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Types</option>
                {NOTIFICATION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => { setFilters({ ...filters, severity: e.target.value }); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Severities</option>
                {SEVERITY_LEVELS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.is_read}
                onChange={(e) => { setFilters({ ...filters, is_read: e.target.value }); setPage(1) }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All</option>
                <option value="false">Unread</option>
                <option value="true">Read</option>
              </select>
            </div>
          </div>
          {(filters.type || filters.severity || filters.is_read) && (
            <button
              onClick={() => setFilters({ type: '', severity: '', is_read: '' })}
              className="mt-3 text-sm text-red-600 hover:text-red-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">All Notifications ({total})</h3>
          {unreadCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {unreadCount} unread
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-4 p-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => {
              const typeConfig = getTypeConfig(notification.type)
              const TypeIcon = typeConfig.icon
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${typeConfig.color === 'blue' ? 'bg-blue-100 text-blue-600' : typeConfig.color === 'green' ? 'bg-green-100 text-green-600' : typeConfig.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' : typeConfig.color === 'red' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600'}`}>
                      <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          notification.severity === 'critical' ? 'bg-purple-100 text-purple-700' :
                          notification.severity === 'high' ? 'bg-red-100 text-red-700' :
                          notification.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {notification.severity}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-gray-500">{formatDate(notification.created_at)}</span>
                        {notification.admin_name && (
                          <span className="text-xs text-gray-500">by {notification.admin_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkRead(notification.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDismiss(notification.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {notifications.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500">
            <BellOff className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications</p>
            <p className="text-sm mt-1">You're all caught up!</p>
          </div>
        )}
      </div>

      {total > limit && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            Page {page} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
