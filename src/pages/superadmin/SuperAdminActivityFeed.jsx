import { useEffect, useState } from 'react'
import { Activity, RefreshCw, Loader2, User, Shield, ShoppingCart, Package, FileText } from 'lucide-react'
import api from '../../services/api'

const ACTION_ICONS = {
  create_user: User,
  delete_user: User,
  update_user: User,
  create_order: ShoppingCart,
  cancel_order: ShoppingCart,
  update_order: ShoppingCart,
  create_product: Package,
  update_product: Package,
  delete_product: Package,
  login: Shield,
  logout: Shield,
  force_logout: Shield,
  default: FileText,
}

export default function SuperAdminActivityFeed() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [limit] = useState(50)
  const [offset, setOffset] = useState(0)

  const fetchFeed = async () => {
    setLoading(true)
    try {
      const res = await api.getSuperAdminActivityFeed(limit, offset)
      if (res?.success) {
        setLogs(res.logs || [])
        setTotal(res.total || 0)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFeed() }, [offset])

  const getActionIcon = (action) => {
    const key = action?.toLowerCase().replace(/[^a-z_]/g, '_') || 'default'
    const Icon = ACTION_ICONS[key] || ACTION_ICONS.default
    return <Icon className="w-4 h-4" />
  }

  const getActionColor = (action) => {
    const a = action?.toLowerCase() || ''
    if (a.includes('delete') || a.includes('cancel') || a.includes('logout')) return 'text-red-600 bg-red-50'
    if (a.includes('create') || a.includes('approve')) return 'text-green-600 bg-green-50'
    if (a.includes('update') || a.includes('edit')) return 'text-blue-600 bg-blue-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-7 h-7 text-red-600" /> Activity Feed
          </h1>
          <p className="text-gray-500 text-sm mt-1">Real-time system activity and audit events</p>
        </div>
        <button onClick={fetchFeed} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-red-600 mr-2" /> Loading...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No activity recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.entity_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{log.actor_name || log.actor_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{log.details || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{log.ip_address || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > limit && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
