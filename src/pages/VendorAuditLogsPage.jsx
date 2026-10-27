import { useState, useEffect } from 'react'
import { FileText, Download, Filter, Search, Loader2, User, Clock } from 'lucide-react'
import api from '../services/api'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString()
}

export default function VendorAuditLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminAuditLogs()
        if (!mounted) return
        setLogs(Array.isArray(res?.logs) ? res.logs : Array.isArray(res) ? res : [])
      } catch {
        if (mounted) setLogs([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filtered = logs.filter(log => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (log.action || '').toLowerCase().includes(q) ||
      (log.entity_type || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.actor_name || log.actor || '').toLowerCase().includes(q)
    )
  })

  const handleExport = () => {
    window.open('/api/superadmin/export/audit', '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" /> Vendor Audit Logs
            </h1>
            <p className="text-gray-600 mt-1">Track all vendor admin actions and changes</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <Filter className="w-5 h-5 text-gray-400" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No audit logs found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Entity</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Details</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {log.action || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 capitalize">{log.entity_type || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-900 max-w-xs truncate">{log.details || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {log.actor_name || log.actor || 'System'}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtDate(log.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
