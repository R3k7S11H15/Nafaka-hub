import React, { useEffect, useState } from 'react'
import { Settings, Save, Loader2, Globe, Mail, CreditCard, Gauge } from 'lucide-react'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function SuperAdminSettings() {
  const toast = useToast()
  const [settings, setSettings] = useState([])
  const [emailTemplates, setEmailTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await api.getSuperAdminSettingsFull()
      if (res?.success) {
        setSettings(res.settings || [])
        setEmailTemplates(res.email_templates || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = (key, value) => {
    setSettings(prev => prev.map(s => s.setting_key === key ? { ...s, setting_value: value } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateSuperAdminSettingsFull(settings)
      toast.success('Settings saved successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  const getSetting = (key) => settings.find(s => s.setting_key === key)?.setting_value || ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure platform settings</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'general', label: 'General', icon: Globe },
              { id: 'commerce', label: 'Commerce', icon: CreditCard },
              { id: 'access', label: 'Access', icon: Settings },
              { id: 'support', label: 'Support', icon: Mail },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                <input type="text" value={getSetting('site_name')} onChange={(e) => updateSetting('site_name', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Description</label>
                <textarea value={getSetting('site_description')} onChange={(e) => updateSetting('site_description', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <input type="text" value={getSetting('currency')} onChange={(e) => updateSetting('currency', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          )}

          {activeTab === 'commerce' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                <input type="number" value={getSetting('commission_rate')} onChange={(e) => updateSetting('commission_rate', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Order Items</label>
                <input type="number" value={getSetting('max_order_items')} onChange={(e) => updateSetting('max_order_items', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Payment Method</label>
                <input type="text" value={getSetting('default_payment_method')} onChange={(e) => updateSetting('default_payment_method', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Registration Open</p>
                  <p className="text-xs text-gray-500">Allow new user registrations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={getSetting('registration_open') === '1' || getSetting('registration_open') === 'true'} onChange={(e) => updateSetting('registration_open', e.target.checked ? '1' : '0')} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
                  <p className="text-xs text-gray-500">Show maintenance page to all users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={getSetting('maintenance_mode') === '1' || getSetting('maintenance_mode') === 'true'} onChange={(e) => updateSetting('maintenance_mode', e.target.checked ? '1' : '0')} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
                <input type="email" value={getSetting('support_email')} onChange={(e) => updateSetting('support_email', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                <input type="text" value={getSetting('support_phone')} onChange={(e) => updateSetting('support_phone', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
