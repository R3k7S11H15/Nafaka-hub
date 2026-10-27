import React, { useEffect, useState } from 'react'
import { FileText, Search, Filter, Download, ChevronLeft, ChevronRight, Calendar, X, RefreshCw, Eye } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'

const ENTITY_TYPES = ['users', 'products', 'orders', 'settings', 'session', 'security', 'api_key', 'backup', 'report', 'mfa', 'template']
const ACTIONS = ['login', 'logout', 'create', 'update', 'delete', 'bulk_activate', 'bulk_deactivate', 'bulk_delete', 'export', 'import', 'force_logout', 'update_mfa_policy', 'add_ip_whitelist', 'create_sub_admin', 'create_api_key']

export default function SuperAdminAudit() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    q: '',
    action: '',
    entity_type: '',
    date_from: '',
    date_to: ''
  })
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const limit = 50

  useEffect(() => {
    fetchLogs()
  }, [filters, page])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = { ...filters, limit, offset: page * limit }
      const res = await api.searchAuditLogs(params)
      if (res?.success) {
        setLogs(res.logs)
        setTotal(res.total)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const clearFilters = () => {
    setFilters({ q: '', action: '', entity_type: '', date_from: '', date_to: '' })
    setPage(0)
  }

  const handleExport = async () => {
    try {
      const res = await api.exportAuditLogsFiltered(filters)
      const blob = new Blob([res], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  const getActionColor = (action) => {
    if (action?.includes('delete') || action?.includes('bulk_delete')) return 'bg-red-100 text-red-700'
    if (action?.includes('create') || action?.includes('bulk_activate')) return 'bg-green-100 text-green-700'
    if (action?.includes('login') || action?.includes('logout')) return 'bg-blue-100 text-blue-700'
    if (action?.includes('update') || action?.includes('bulk')) return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-700'
  }

  const hasFilters = filters.q || filters.action || filters.entity_type || filters.date_from || filters.date_to

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">Track all admin actions and system changes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm ${showFilters || hasFilters ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" /> Filters
            {hasFilters && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search actions, details, users..."
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Actions</option>
                  {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Entity Type</label>
                <select
                  value={filters.entity_type}
                  onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Types</option>
                  {ENTITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-3 text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                <X className="w-4 h-4" /> Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{log.actor_name || 'System'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          <span className="capitalize">{log.entity_type}</span>
                          {log.entity_id && <span className="text-gray-400 ml-1">#{log.entity_id}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 truncate max-w-[200px] block">{log.details || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 font-mono">{log.ip_address || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No audit logs found</p>
              </div>
            )}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">Showing {logs.length} of {total} logs</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">Page {page + 1}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page * limit + logs.length >= total} className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={() => setSelectedLog(null)}>
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Audit Log Details</h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <DetailRow label="ID" value={selectedLog.id} />
              <DetailRow label="Timestamp" value={new Date(selectedLog.created_at).toLocaleString()} />
              <DetailRow label="Actor" value={selectedLog.actor_name || 'System'} />
              <DetailRow label="Action" value={selectedLog.action} />
              <DetailRow label="Entity Type" value={selectedLog.entity_type} />
              <DetailRow label="Entity ID" value={selectedLog.entity_id || '—'} />
              <DetailRow label="IP Address" value={selectedLog.ip_address || '—'} />
              <DetailRow label="Details" value={selectedLog.details || '—'} full />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, full }) {
  return (
    <div className={full ? '' : 'flex gap-4'}>
      <span className={`text-sm text-gray-500 ${full ? 'mb-1' : 'w-24 shrink-0'}`}>{label}</span>
      <span className={`text-sm text-gray-900 ${full ? 'break-all' : 'flex-1'}`}>{value}</span>
    </div>
  )
}
