import React, { useEffect, useState } from 'react'
import { Shield, AlertTriangle, Users, BarChart2, Search, Filter, RefreshCw, UserCheck, UserX, Settings, Check, X } from 'lucide-react'
import api from '../services/api'
import { DataTable, Badge, Button } from '../components/UI'
import { useToast } from '../context/ToastContext'

const VIOLATION_LABELS = {
  PHONE_NUMBER: 'Phone Number',
  EMAIL: 'Email',
  SOCIAL_MEDIA: 'Social Media',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
  EXTERNAL_URL: 'External URL',
  PAYMENT_ACCOUNT: 'Payment Account',
  BANK_ACCOUNT: 'Bank Account',
  MOBILE_MONEY: 'Mobile Money',
  QR_CODE: 'QR Code',
  OFF_PLATFORM_TRANSACTION: 'Off-Platform',
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
}

const SEVERITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
}

export default function AdminChatModerationPage() {
  const [activeTab, setActiveTab] = useState('stats')
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [reports, setReports] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'stats') {
        const res = await api.getModerationStats()
        setStats(res)
      } else if (activeTab === 'events') {
        const res = await api.getModerationEvents({ search: searchQ })
        setEvents(res?.events || [])
      } else if (activeTab === 'reports') {
        const res = await api.getReportedMessages({ search: searchQ })
        setReports(res?.reports || [])
      } else if (activeTab === 'users') {
        const res = await api.getUserWarnings()
        setUsers(res?.users || [])
      } else if (activeTab === 'settings') {
        const res = await api.getModerationEvents({ limit: 0 })
        const settingsRes = await api.getModerationSettings()
        setSettings(settingsRes?.settings || {})
      }
    } catch (err) {
      setError(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeTab, searchQ])

  const handleResolveReport = async (reportId, status) => {
    try {
      await api.resolveReport(reportId, status)
      setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status } : r))
    } catch (err) {
      setError(err?.message || 'Failed to resolve report')
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      await api.updateChatSettings(settings)
      toast.success('Settings saved')
    } catch (err) {
      setError(err?.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

const eventColumns = [
  { key: 'violation_type', header: 'Violation' },
  { key: 'severity', header: 'Severity' },
  { key: 'user_id', header: 'User' },
  { key: 'detection_method', header: 'Detection' },
  { key: 'created_at', header: 'Date' },
]

  const reportColumns = [
  { key: 'category', header: 'Category' },
  { key: 'status', header: 'Status' },
  { key: 'reporter_name', header: 'Reported By' },
  { key: 'target_name', header: 'Reported User' },
  { key: 'content', header: 'Message' },
  { key: 'created_at', header: 'Date' },
  { key: '_actions', header: 'Actions' },
]

const userColumns = [
  { key: 'full_name', header: 'User' },
  { key: 'role', header: 'Role' },
  { key: 'warning_count', header: 'Warnings' },
  { key: 'moderation_status', header: 'Status' },
  { key: 'last_violation_at', header: 'Last Violation' },
]

  return (
    <div className="p-6 min-h-[calc(100vh-80px)]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Chat Moderation</h1>
        <p className="text-sm text-gray-600 mt-1">Monitor and manage marketplace conversation safety</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
         {[
           { id: 'stats', label: 'Overview', icon: BarChart2 },
           { id: 'events', label: 'Moderation Events', icon: Shield },
           { id: 'reports', label: 'User Reports', icon: AlertTriangle },
           { id: 'users', label: 'User Warnings', icon: Users },
           { id: 'settings', label: 'Settings', icon: Settings },
         ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />} {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>
      )}

      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.total_blocked || 0}</div>
            <p className="text-xs text-gray-500">Messages Blocked (30d)</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.restricted_users || 0}</div>
            <p className="text-xs text-gray-500">Restricted Users</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.pending_reports || 0}</div>
            <p className="text-xs text-gray-500">Pending Reports</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-2">Top Violations</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {stats.stats?.slice(0, 6).map((s) => (
                <div key={s.violation_type} className="flex items-center justify-between text-sm">
                  <span>{VIOLATION_LABELS[s.violation_type] || s.violation_type}</span>
                  <Badge variant={s.severity === 'high' ? 'danger' : s.severity === 'medium' ? 'warning' : 'neutral'} size="sm">
                    {s.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(activeTab === 'events' || activeTab === 'reports' || activeTab === 'users') && (
        <div className="mb-4">
          <div className="relative inline-block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {activeTab === 'settings' ? (
          settings ? (
            <div className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 mb-4">Chat Safety Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Message Length</label>
                  <input
                    type="number"
                    value={settings.max_message_length || '2000'}
                    onChange={(e) => setSettings({ ...settings, max_message_length: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Messages Per Minute</label>
                  <input
                    type="number"
                    value={settings.messages_per_minute || '30'}
                    onChange={(e) => setSettings({ ...settings, messages_per_minute: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warning Threshold</label>
                  <input
                    type="number"
                    value={settings.warning_threshold || '2'}
                    onChange={(e) => setSettings({ ...settings, warning_threshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restriction Threshold</label>
                  <input
                    type="number"
                    value={settings.restriction_threshold || '5'}
                    onChange={(e) => setSettings({ ...settings, restriction_threshold: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restriction Duration (hours)</label>
                  <input
                    type="number"
                    value={settings.restriction_duration_hours || '24'}
                    onChange={(e) => setSettings({ ...settings, restriction_duration_hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Domains</label>
                  <input
                    type="text"
                    value={settings.allowed_domains || ''}
                    onChange={(e) => setSettings({ ...settings, allowed_domains: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
                    placeholder="comma-separated, e.g. nafakahub.co.tz"
                  />
                </div>
                <div className="md:col-span-2 flex gap-2 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.contact_protection_enabled === '1'}
                      onChange={(e) => setSettings({ ...settings, contact_protection_enabled: e.target.checked ? '1' : '0' })}
                    />
                    <span>Contact protection (phones, emails, social media)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.url_protection_enabled === '1'}
                      onChange={(e) => setSettings({ ...settings, url_protection_enabled: e.target.checked ? '1' : '0' })}
                    />
                    <span>URL protection</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={settings.payment_protection_enabled === '1'}
                      onChange={(e) => setSettings({ ...settings, payment_protection_enabled: e.target.checked ? '1' : '0' })}
                    />
                    <span>Payment protection</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">Loading settings…</div>
          )
        ) : loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : (activeTab === 'events' ? events : activeTab === 'reports' ? reports : users).length === 0 ? (
          <div className="p-8 text-center text-gray-500">No data found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {(activeTab === 'events' ? eventColumns : activeTab === 'reports' ? reportColumns : userColumns).map((col) => (
                    <th key={col.key} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(activeTab === 'events' ? events : activeTab === 'reports' ? reports : users).map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    {(activeTab === 'events' ? eventColumns : activeTab === 'reports' ? reportColumns : userColumns).map((col) => (
                      <td key={col.key} className="px-6 py-4 text-sm text-gray-700 align-top">
                        {activeTab === 'events' && col.key === 'violation_type' ? (
                          VIOLATION_LABELS[row[col.key]] || row[col.key]
                        ) : activeTab === 'events' && col.key === 'user_id' ? (
                          `${row.full_name || ''} (#${row[col.key]})`
                        ) : activeTab === 'events' && col.key === 'original_message' ? (
                          row[col.key]?.substring(0, 80) || '—'
                        ) : activeTab === 'reports' && col.key === 'content' ? (
                          row[col.key]?.substring(0, 80) || '—'
                        ) : activeTab === 'reports' && col.key === '_actions' ? (
                          row.status === 'pending' ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleResolveReport(row.id, 'dismissed')}
                                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                title="Dismiss"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleResolveReport(row.id, 'reviewed')}
                                className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 rounded"
                                title="Review"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleResolveReport(row.id, 'action_taken')}
                                className="px-2 py-1 text-xs text-red-600 hover:bg-red-100 rounded"
                                title="Take action (delete message)"
                              >
                                Delete
                              </button>
                            </div>
                          ) : (
                            <Badge variant="neutral" size="sm">{row.status}</Badge>
                          )
                        ) : activeTab === 'users' && col.key === 'warning_count' ? (
                          <Badge variant={row[col.key] > 3 ? 'danger' : row[col.key] > 1 ? 'warning' : 'success'} size="sm">
                            {row[col.key]}
                          </Badge>
                        ) : activeTab === 'users' && col.key === 'moderation_status' ? (
                          <Badge variant={row[col.key] === 'restricted' ? 'danger' : row[col.key] === 'warned' ? 'warning' : 'success'} size="sm">
                            {row[col.key]}
                          </Badge>
                        ) : (
                          row[col.key] || '—'
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
