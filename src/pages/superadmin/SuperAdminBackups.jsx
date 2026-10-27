import React, { useEffect, useState } from 'react'
import { Database, Download, Upload, Trash2, RefreshCw, Clock, Plus, X, Calendar, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'

export default function SuperAdminBackups() {
  const toast = useToast()
  const [backups, setBackups] = useState([])
  const confirm = useConfirm()
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    type: 'full',
    schedule_type: 'daily',
    schedule_time: '02:00',
    schedule_day: 0,
    retention_days: 7,
  })
  const [activeTab, setActiveTab] = useState('backups')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [backupRes, scheduleRes] = await Promise.all([
        api.getBackups(),
        api.getScheduledBackups(),
      ])
      setBackups(backupRes?.backups || [])
      setSchedules(scheduleRes?.schedules || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (type = 'full') => {
    setCreating(true)
    try {
      await api.createBackup(type)
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (id) => {
    const confirmed = await confirm({ title: 'Restore this backup?', message: 'This may cause temporary disruption.', type: 'warning' })
    if (!confirmed) return
    try {
      await api.restoreBackup(id)
      toast.success('Restore initiated')
    } catch (err) {
      toast.error('Restore failed', err.message)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Delete this backup?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteBackup(id)
      toast.success('Backup deleted')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete backup', err.message)
    }
  }

  const handleCreateSchedule = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.createScheduledBackup(scheduleForm)
      setShowScheduleForm(false)
      setScheduleForm({ name: '', type: 'full', schedule_type: 'daily', schedule_time: '02:00', schedule_day: 0, retention_days: 7 })
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  const handleToggleSchedule = async (id, isActive) => {
    try {
      await api.updateScheduledBackup(id, { is_active: !isActive })
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteSchedule = async (id) => {
    const confirmed = await confirm({ title: 'Delete this scheduled backup?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteScheduledBackup(id)
      toast.success('Scheduled backup deleted')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete scheduled backup', err.message)
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return '—'
    const mb = bytes / (1024 * 1024)
    if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb.toFixed(1)} MB`
  }

  const getScheduleDescription = (schedule) => {
    const typeLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', custom: 'Custom' }
    let desc = typeLabels[schedule.schedule_type] || schedule.schedule_type
    desc += ` at ${schedule.schedule_time}`
    if (schedule.schedule_type === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      desc += ` (${days[schedule.schedule_day] || 'Sunday'})`
    }
    return desc
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Backups</h1>
          <p className="text-gray-500 text-sm mt-1">Manage manual and scheduled backups</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab(activeTab === 'backups' ? 'scheduled' : 'backups')} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Clock className="w-4 h-4" />
            {activeTab === 'backups' ? 'Scheduled' : 'Manual'} Backups
          </button>
          {activeTab === 'backups' && (
            <>
              <button onClick={() => handleCreate('full')} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Backup Now
              </button>
              <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'backups' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filename</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{backup.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{backup.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatBytes(backup.size_bytes)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                        backup.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {backup.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(backup.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={() => handleRestore(backup.id)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">
                        <Upload className="w-3 h-3" /> Restore
                      </button>
                      <button onClick={() => handleDelete(backup.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {backups.length === 0 && !loading && (
            <div className="p-12 text-center text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No backups available</p>
              <p className="text-sm mt-1">Click "Backup Now" to create your first backup</p>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">{schedules.length} scheduled backup(s) configured</p>
            <button onClick={() => setShowScheduleForm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              <Plus className="w-4 h-4" /> Add Schedule
            </button>
          </div>

          {showScheduleForm && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Scheduled Backup</h3>
                <button onClick={() => setShowScheduleForm(false)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
                    <input
                      type="text"
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g., Daily Full Backup"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Backup Type</label>
                    <select
                      value={scheduleForm.type}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="full">Full Backup</option>
                      <option value="schema">Schema Only</option>
                      <option value="data">Data Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      value={scheduleForm.schedule_type}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_type: e.target.value })}
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
                      value={scheduleForm.schedule_time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                  </div>
                  {scheduleForm.schedule_type === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                      <select
                        value={scheduleForm.schedule_day}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_day: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value={0}>Sunday</option>
                        <option value={1}>Monday</option>
                        <option value={2}>Tuesday</option>
                        <option value={3}>Wednesday</option>
                        <option value={4}>Thursday</option>
                        <option value={5}>Friday</option>
                        <option value={6}>Saturday</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retention (days)</label>
                    <input
                      type="number"
                      value={scheduleForm.retention_days}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, retention_days: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                      min="1"
                      max="365"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowScheduleForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />} Create Schedule
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <TableSkeleton rows={8} cols={7} />
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retention</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{schedule.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">{schedule.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{getScheduleDescription(schedule)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{schedule.retention_days} days</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {schedule.next_run ? new Date(schedule.next_run).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleSchedule(schedule.id, schedule.is_active)}
                          className={`flex items-center gap-1 text-sm ${schedule.is_active ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {schedule.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                          {schedule.is_active ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleDeleteSchedule(schedule.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {schedules.length === 0 && !loading && (
              <div className="p-12 text-center text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No scheduled backups configured</p>
                <p className="text-sm mt-1">Click "Add Schedule" to create automated backups</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
