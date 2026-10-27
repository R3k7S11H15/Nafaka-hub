import React, { useEffect, useState } from 'react'
import { FileText, Plus, Trash2, RefreshCw, Calendar, Clock, Mail, Download, ToggleLeft, ToggleRight, X, FileBarChart, Send } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'

const REPORT_TYPES = [
  { value: 'users', label: 'User Report' },
  { value: 'orders', label: 'Order Report' },
  { value: 'products', label: 'Product Report' },
  { value: 'financial', label: 'Financial Report' },
  { value: 'audit', label: 'Audit Log Report' },
]

export default function SuperAdminReports() {
  const toast = useToast()
  const confirm = useConfirm()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    report_type: 'users',
    schedule_type: 'weekly',
    schedule_time: '09:00',
    schedule_day: 1,
    recipients: '',
    format: 'pdf',
  })
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await api.getScheduledReports()
      if (res?.success) setReports(res.reports)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const recipients = form.recipients.split(',').map(r => r.trim()).filter(Boolean)
      await api.createScheduledReport({ ...form, recipients })
      setShowForm(false)
      setForm({ name: '', report_type: 'users', schedule_type: 'weekly', schedule_time: '09:00', schedule_day: 1, recipients: '', format: 'pdf' })
      fetchReports()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Delete this scheduled report?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteScheduledReport(id)
      toast.success('Report deleted')
      fetchReports()
    } catch (err) {
      toast.error('Failed to delete report', err.message)
    }
  }

  const handleToggle = async (id, current) => {
    try {
      await api.updateScheduledReport(id, { is_active: !current })
      fetchReports()
    } catch (err) {
      console.error(err)
    }
  }

  const handleExportNow = async (type) => {
    setExporting(true)
    try {
      let data, filename
      if (type === 'users') { data = await api.exportUsers(); filename = 'user-report.pdf' }
      else if (type === 'orders') { data = await api.exportOrders(); filename = 'order-report.csv' }
      else if (type === 'products') { data = await api.exportProducts(); filename = 'product-report.csv' }
      else if (type === 'financial') { data = await api.exportFinancial(); filename = 'financial-report.csv' }
      else if (type === 'audit') { data = await api.exportAuditLogs(); filename = 'audit-report.csv' }

      const blob = new Blob([data], { type: type === 'users' ? 'text/csv' : 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  const getScheduleDescription = (report) => {
    const typeLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }
    let desc = typeLabels[report.schedule_type] || report.schedule_type
    desc += ` at ${report.schedule_time}`
    if (report.schedule_type === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      desc += ` (${days[report.schedule_day] || 'Mon'})`
    }
    if (report.schedule_type === 'monthly') {
      desc += ` (Day ${report.schedule_day || 1})`
    }
    return desc
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Manage scheduled reports and export data</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchReports} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            <Plus className="w-4 h-4" /> Schedule Report
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Reports Now</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {REPORT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleExportNow(value)}
              disabled={exporting}
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <FileBarChart className="w-8 h-8 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Schedule New Report</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g., Weekly User Summary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  value={form.report_type}
                  onChange={(e) => setForm({ ...form, report_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {REPORT_TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={form.schedule_type}
                  onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={form.schedule_time}
                  onChange={(e) => setForm({ ...form, schedule_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day (for weekly/monthly)</label>
                <select
                  value={form.schedule_day}
                  onChange={(e) => setForm({ ...form, schedule_day: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(d => (
                    <option key={d} value={d}>{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d - 1]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipients (comma-separated emails)</label>
                <input
                  type="text"
                  value={form.recipients}
                  onChange={(e) => setForm({ ...form, recipients: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="admin@example.com, reports@example.com"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
        </div>
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{report.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 capitalize">{report.report_type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {getScheduleDescription(report)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 uppercase">{report.format}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {report.next_run ? new Date(report.next_run).toLocaleString() : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggle(report.id, report.is_active)}
                      className={`flex items-center gap-1 ${report.is_active ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      {report.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      {report.is_active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(report.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {reports.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No scheduled reports</p>
            <p className="text-sm mt-1">Create a schedule to automate reports</p>
          </div>
        )}
      </div>
    </div>
  )
}
