import { useEffect, useState } from 'react'
import { Calendar, RefreshCw, Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react'
import api from '../../services/api'

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    running: 'bg-purple-100 text-purple-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleString()
}

export default function SuperAdminScheduledTasks() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const res = await api.getSuperAdminScheduledTasks()
      if (res?.success) setData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-12 h-12 animate-spin text-red-600" />
      </div>
    )
  }

  const backups = data?.scheduled_backups || []
  const reports = data?.scheduled_reports || []
  const recentBackups = data?.recent_backups || []
  const recentImports = data?.recent_imports || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-red-600" /> Scheduled Tasks
          </h1>
          <p className="text-gray-500 text-sm mt-1">Backups, reports, and background jobs</p>
        </div>
        <button onClick={fetchTasks} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Scheduled Backups</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{task.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{task.schedule_type}{task.schedule_day ? ` (${task.schedule_day})` : ''}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(task.next_run)}</td>
                    <td className="px-6 py-4"><StatusBadge status={task.is_active ? 'active' : 'inactive'} /></td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No scheduled backups</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{task.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{task.report_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{task.schedule_type}{task.schedule_day ? ` (${task.schedule_day})` : ''}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 uppercase">{task.format}</td>
                    <td className="px-6 py-4"><StatusBadge status={task.is_active ? 'active' : 'inactive'} /></td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No scheduled reports</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Backups</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBackups.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{b.filename}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{b.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{b.size_bytes ? `${(b.size_bytes / 1024 / 1024).toFixed(1)} MB` : '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(b.created_at)}</td>
                  </tr>
                ))}
                {recentBackups.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No recent backups</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Imports</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentImports.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">{job.entity_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{job.filename}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{job.processed_rows || 0}/{job.total_rows || 0}</td>
                    <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatDate(job.created_at)}</td>
                  </tr>
                ))}
                {recentImports.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No recent imports</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
