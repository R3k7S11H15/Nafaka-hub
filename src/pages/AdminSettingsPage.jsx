import { useState, useEffect } from 'react'
import { Settings, Save, Globe, CreditCard, Mail, MessageSquare, Wrench, Loader2, X } from 'lucide-react'
import api from '../services/api'

const TABS = [
  { key: 'general', label: 'General', icon: Globe },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench },
]

const TIMEZONES = ['Africa/Dar_es_Salaam', 'Africa/Nairobi', 'Africa/Kampala', 'Africa/Addis_Ababa', 'UTC']
const CURRENCIES = ['TZS', 'USD', 'KES', 'UGX', 'ETB', 'EUR']
const PAYMENT_GATEWAYS = ['mpesa', 'tigopesa', 'airtel_money', 'bank_transfer', 'paypal', 'stripe']
const SMS_PROVIDERS = ['africastalking', 'twilio', 'nexmo', 'local_sms']

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [general, setGeneral] = useState({ site_name: '', site_description: '', contact_email: '', support_phone: '', timezone: 'Africa/Dar_es_Salaam', currency: 'TZS' })
  const [payment, setPayment] = useState({ gateways: [], enabled_gateways: [] })
  const [email, setEmail] = useState({ smtp_host: '', smtp_port: '587', smtp_username: '', smtp_password: '', from_email: '', from_name: '', encryption: 'tls' })
  const [sms, setSms] = useState({ provider: 'africastalking', api_key: '', api_secret: '', from_number: '', sender_id: '' })
  const [maintenance, setMaintenance] = useState({ enabled: false, allowed_ips: '', message: '' })

  useEffect(() => {
    const saved = localStorage.getItem('admin_settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setGeneral(prev => ({ ...prev, ...parsed.general }))
        setPayment(prev => ({ ...prev, ...parsed.payment }))
        setEmail(prev => ({ ...prev, ...parsed.email }))
        setSms(prev => ({ ...prev, ...parsed.sms }))
        setMaintenance(prev => ({ ...prev, ...parsed.maintenance }))
      } catch (e) {}
    }
    setLoading(false)
  }, [])

  const saveToLocal = (key, data) => {
    const current = JSON.parse(localStorage.getItem('admin_settings') || '{}')
    localStorage.setItem('admin_settings', JSON.stringify({ ...current, [key]: data }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      saveToLocal('general', general)
      saveToLocal('payment', payment)
      saveToLocal('email', email)
      saveToLocal('sms', sms)
      saveToLocal('maintenance', maintenance)
      await api.updateAdminSettings({ general, payment, email, sms, maintenance })
    } catch {
    } finally {
      setSaving(false)
    }
  }

  const toggleGateway = (gw) => {
    setPayment(prev => ({
      ...prev,
      enabled_gateways: prev.enabled_gateways.includes(gw)
        ? prev.enabled_gateways.filter(g => g !== gw)
        : [...prev.enabled_gateways, gw]
    }))
  }

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-gray-400" /></div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-8 h-8 text-gray-700" /> Settings
            </h1>
            <p className="text-gray-600 mt-2">Manage platform configuration and preferences</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium inline-flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save All
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {TABS.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === tab.key ? 'border-b-2 border-gray-900 text-gray-900 bg-gray-50' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-6">
            {activeTab === 'general' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                  <input type="text" value={general.site_name} onChange={e => setGeneral({ ...general, site_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site Description</label>
                  <textarea value={general.site_description} onChange={e => setGeneral({ ...general, site_description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                    <input type="email" value={general.contact_email} onChange={e => setGeneral({ ...general, contact_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
                    <input type="text" value={general.support_phone} onChange={e => setGeneral({ ...general, support_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select value={general.timezone} onChange={e => setGeneral({ ...general, timezone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none">
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select value={general.currency} onChange={e => setGeneral({ ...general, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Enabled Payment Gateways</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PAYMENT_GATEWAYS.map(gw => (
                    <label key={gw} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={payment.enabled_gateways.includes(gw)} onChange={() => toggleGateway(gw)} className="w-4 h-4 text-gray-700" />
                      <span className="text-sm text-gray-700 capitalize">{gw.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                    <input type="text" value={email.smtp_host} onChange={e => setEmail({ ...email, smtp_host: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                    <input type="text" value={email.smtp_port} onChange={e => setEmail({ ...email, smtp_port: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Username</label>
                    <input type="text" value={email.smtp_username} onChange={e => setEmail({ ...email, smtp_username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Password</label>
                    <input type="password" value={email.smtp_password} onChange={e => setEmail({ ...email, smtp_password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
                    <input type="email" value={email.from_email} onChange={e => setEmail({ ...email, from_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                    <input type="text" value={email.from_name} onChange={e => setEmail({ ...email, from_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
                    <select value={email.encryption} onChange={e => setEmail({ ...email, encryption: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none">
                      <option value="tls">TLS</option>
                      <option value="ssl">SSL</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sms' && (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Provider</label>
                  <select value={sms.provider} onChange={e => setSms({ ...sms, provider: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none">
                    {SMS_PROVIDERS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                    <input type="text" value={sms.api_key} onChange={e => setSms({ ...sms, api_key: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                    <input type="password" value={sms.api_secret} onChange={e => setSms({ ...sms, api_secret: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Number / Sender ID</label>
                    <input type="text" value={sms.from_number} onChange={e => setSms({ ...sms, from_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
                    <input type="text" value={sms.sender_id} onChange={e => setSms({ ...sms, sender_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                  <input type="checkbox" id="maint_enabled" checked={maintenance.enabled} onChange={e => setMaintenance({ ...maintenance, enabled: e.target.checked })} className="w-5 h-5 text-gray-700" />
                  <label htmlFor="maint_enabled" className="text-sm font-medium text-gray-700">Enable Maintenance Mode</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowed IPs (comma separated)</label>
                  <input type="text" value={maintenance.allowed_ips} onChange={e => setMaintenance({ ...maintenance, allowed_ips: e.target.value })} placeholder="127.0.0.1, 192.168.1.0/24" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Message</label>
                  <textarea value={maintenance.message} onChange={e => setMaintenance({ ...maintenance, message: e.target.value })} rows={3} placeholder="Site is under maintenance. Please check back later." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-500 outline-none" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
