import React, { useEffect, useState } from 'react'
import { Shield, Monitor, Smartphone, Globe, Clock, LogOut, RefreshCw, Settings, AlertTriangle, CheckCircle } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'

export default function SuperAdminSessions() {
  const toast = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({ session_timeout_minutes: 30, max_sessions_per_admin: 5 })
  const [showSettings, setShowSettings] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSessions()
    fetchSettings()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await api.getAdminSessions(true)
      if (res?.success) setSessions(res.sessions)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await api.getSessionSettings()
      if (res?.success) setSettings(res.settings)
    } catch (err) {
      console.error(err)
    }
  }

  const handleForceLogout = async (sessionId) => {
    const confirmed = await confirm({ title: 'Terminate this session?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.forceLogoutSession(sessionId)
      toast.success('Session terminated')
      fetchSessions()
    } catch (err) {
      toast.error('Failed to terminate session', err.message)
    }
  }

  const handleLogoutAll = async () => {
    const confirmed = await confirm({ title: 'Terminate all admin sessions?', message: 'You will be logged out.', type: 'danger' })
    if (!confirmed) return
    try {
      await api.logoutAllSessions(true)
      fetchSessions()
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateSessionSettings(settings)
      setShowSettings(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <Monitor className="w-4 h-4" />
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) return <Smartphone className="w-4 h-4" />
    return <Monitor className="w-4 h-4" />
  }

  const formatLastActivity = (timestamp) => {
    if (!timestamp) return '—'
    const diff = Date.now() - new Date(timestamp).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const isSessionActive = (expires_at) => {
    return new Date(expires_at) > new Date()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor and control active admin sessions</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button onClick={handleLogoutAll} className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm">
            <LogOut className="w-4 h-4" /> Logout All
          </button>
          <button onClick={fetchSessions} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg"><Monitor className="w-5 h-5 text-blue-600" /></div>
            <h3 className="font-semibold text-gray-900">Active Sessions</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{sessions.filter(s => isSessionActive(s.expires_at)).length}</p>
          <p className="text-sm text-gray-500 mt-1">Currently logged in</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg"><Clock className="w-5 h-5 text-green-600" /></div>
            <h3 className="font-semibold text-gray-900">Session Timeout</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{settings.session_timeout_minutes}m</p>
          <p className="text-sm text-gray-500 mt-1">Max inactive time</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg"><Shield className="w-5 h-5 text-purple-600" /></div>
            <h3 className="font-semibold text-gray-900">Max Sessions</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{settings.max_sessions_per_admin}</p>
          <p className="text-sm text-gray-500 mt-1">Per admin account</p>
        </div>
      </div>

      {showSettings && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Settings</h3>
          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.session_timeout_minutes}
                onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                min="5"
                max="480"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Sessions Per Admin</label>
              <input
                type="number"
                value={settings.max_sessions_per_admin}
                onChange={(e) => setSettings({ ...settings, max_sessions_per_admin: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                min="1"
                max="10"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowSettings(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Settings
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
        </div>
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Device</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.filter(s => isSessionActive(s.expires_at)).map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <Shield className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.full_name}</p>
                        <p className="text-xs text-gray-500">{session.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      {getDeviceIcon(session.user_agent)}
                      <span className="text-sm truncate max-w-[150px]">{session.user_agent?.split(' ')[0] || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-mono">{session.ip_address || '—'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{formatLastActivity(session.last_activity)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm ${isSessionActive(session.expires_at) ? 'text-green-600' : 'text-red-600'}`}>
                      {session.expires_at ? new Date(session.expires_at).toLocaleString() : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleForceLogout(session.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" /> Terminate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {sessions.filter(s => isSessionActive(s.expires_at)).length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No active sessions</p>
          </div>
        )}
      </div>
    </div>
  )
}
