import { useState, useEffect } from 'react'
import { Save, Bell, Shield, Users, Globe, Loader2, DollarSign } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function VendorSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const [settings, setSettings] = useState({
    autoApproveVendors: false,
    requireDocumentVerification: true,
    sendWelcomeEmail: true,
    notifyOnNewApplication: true,
    notifyOnNewOrder: true,
    defaultCommissionRate: 3.0,
    currency: 'TZS',
    language: 'en',
    timezone: 'Africa/Dar_es_Salaam',
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminSettings()
        if (!mounted) return
        if (res?.settings) {
          setSettings(prev => ({ ...prev, ...res.settings }))
        }
      } catch {
        // use defaults
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateAdminSettings(settings)
      toast.success('Settings saved successfully')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Settings</h1>
            <p className="text-gray-600 mt-1">Configure vendor admin preferences and defaults</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" /> Verification & Approval
            </h2>
            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Auto-approve vendors</p>
                  <p className="text-xs text-gray-500">Automatically approve new vendor registrations</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoApproveVendors}
                  onChange={(e) => setSettings({ ...settings, autoApproveVendors: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Require document verification</p>
                  <p className="text-xs text-gray-500">Vendors must upload business documents before approval</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.requireDocumentVerification}
                  onChange={(e) => setSettings({ ...settings, requireDocumentVerification: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-yellow-600" /> Notifications
            </h2>
            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">New application notifications</p>
                  <p className="text-xs text-gray-500">Receive alerts when new vendors apply</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifyOnNewApplication}
                  onChange={(e) => setSettings({ ...settings, notifyOnNewApplication: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Welcome email to new vendors</p>
                  <p className="text-xs text-gray-500">Send welcome email when vendor is approved</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.sendWelcomeEmail}
                  onChange={(e) => setSettings({ ...settings, sendWelcomeEmail: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" /> Financial Defaults
            </h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.defaultCommissionRate}
                  onChange={(e) => setSettings({ ...settings, defaultCommissionRate: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="TZS">TZS - Tanzanian Shilling</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="KES">KES - Kenyan Shilling</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" /> Regional Settings
              </h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="Africa/Dar_es_Salaam">East Africa Time (EAT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
