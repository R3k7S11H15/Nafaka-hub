import React, { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle, AlertTriangle, Globe, Shield, DollarSign, Bell, Settings as SettingsIcon, Lock, Database, Mail, Phone, FileText } from 'lucide-react'
import api from '../services/api'

export default function SuperAdminSettings() {
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.getSuperAdminSettings()
      const data = res?.data || res || {}
      const settingsObj = {}
      ;(data.settings || []).forEach(s => {
        settingsObj[s.setting_key] = s.setting_value
      })
      setSettings(settingsObj)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const settingsArray = Object.entries(settings).map(([setting_key, setting_value]) => ({ setting_key, setting_value }))
      await api.updateSuperAdminSettings(settingsArray)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const settingGroups = [
    {
      title: 'General',
      icon: Globe,
      items: [
        { key: 'site_name', label: 'Site Name', type: 'text' },
        { key: 'site_description', label: 'Site Description', type: 'text' },
        { key: 'currency', label: 'Currency', type: 'text' },
        { key: 'default_payment_method', label: 'Default Payment Method', type: 'text' },
      ]
    },
    {
      title: 'Commerce',
      icon: DollarSign,
      items: [
        { key: 'commission_rate', label: 'Platform Commission Rate (%)', type: 'number', step: '0.1' },
        { key: 'max_order_items', label: 'Max Items Per Order', type: 'number' },
      ]
    },
    {
      title: 'Access',
      icon: Lock,
      items: [
        { key: 'registration_open', label: 'Allow New Registrations', type: 'boolean' },
        { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'boolean' },
      ]
    },
    {
      title: 'Support',
      icon: Bell,
      items: [
        { key: 'support_email', label: 'Support Email', type: 'text' },
        { key: 'support_phone', label: 'Support Phone', type: 'text' },
      ]
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-blue-600" />
              System Settings
            </h1>
            <p className="text-gray-500 mt-1">Configure platform-wide settings and preferences</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {saved && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5" />
            Settings saved successfully!
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {settingGroups.map(group => {
            const Icon = group.icon
            return (
              <div key={group.title} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
                </div>
                <div className="p-6 space-y-4">
                  {group.items.map(item => (
                    <div key={item.key} className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">{item.label}</label>
                      {item.type === 'boolean' ? (
                        <button
                          onClick={() => handleChange(item.key, settings[item.key] === '1' ? '0' : '1')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[item.key] === '1' ? 'bg-blue-600' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings[item.key] === '1' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      ) : (
                        <input
                          type={item.type}
                          step={item.step}
                          value={settings[item.key] || ''}
                          onChange={(e) => handleChange(item.key, e.target.value)}
                          className="w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}