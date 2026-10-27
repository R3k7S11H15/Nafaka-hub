import React, { useEffect, useState } from 'react'
import { Webhook, Plus, Trash2, RefreshCw, Loader2, CheckCircle, AlertCircle, X, Activity } from 'lucide-react'
import api from '../../services/api'
import { useConfirm } from '../../components/ConfirmDialog'
import { useToast } from '../../context/ToastContext'

const EVENT_TYPES = [
  { value: 'user.created', label: 'User Created' },
  { value: 'user.updated', label: 'User Updated' },
  { value: 'user.deleted', label: 'User Deleted' },
  { value: 'product.created', label: 'Product Created' },
  { value: 'product.updated', label: 'Product Updated' },
  { value: 'order.created', label: 'Order Created' },
  { value: 'order.updated', label: 'Order Updated' },
  { value: 'order.deleted', label: 'Order Deleted' },
  { value: 'payment.completed', label: 'Payment Completed' },
  { value: 'system.alert', label: 'System Alert' },
]

export default function SuperAdminWebhooks() {
  const [webhooks, setWebhooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', url: '', events: [], secret: '' })
  const confirm = useConfirm()
  const toast = useToast()

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      const res = await api.getWebhooks()
      setWebhooks(res?.webhooks || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.createWebhook(form)
      toast.success('Webhook created', 'Your webhook has been configured.')
      setShowForm(false)
      setForm({ name: '', url: '', events: [], secret: '' })
      fetchWebhooks()
    } catch (err) {
      toast.error('Failed to create webhook', err.message)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete webhook?',
      message: 'This webhook will no longer receive notifications.',
      confirmText: 'Delete',
      type: 'danger',
    })
    if (!confirmed) return
    try {
      await api.deleteWebhook(id)
      toast.success('Webhook deleted')
      fetchWebhooks()
    } catch (err) {
      toast.error('Delete failed', err.message)
    }
  }

  const toggleEvent = (event) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter(e => e !== event) : [...prev.events, event]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhooks</h1>
          <p className="text-gray-500 text-sm mt-1">Send real-time notifications to external services</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchWebhooks} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
            <Plus className="w-4 h-4" /> Add Webhook
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Create Webhook</h3>
            <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="e.g., Slack Notifications"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="https://example.com/webhook"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret (optional)</label>
                <input
                  type="text"
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Webhook secret for verification"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map(event => (
                  <button
                    key={event.value}
                    type="button"
                    onClick={() => toggleEvent(event.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.events.includes(event.value)
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {event.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Create Webhook
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin w-6 h-6 text-red-600" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Webhook className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No webhooks configured</p>
            <p className="text-sm mt-1">Add a webhook to send notifications to external services</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${webhook.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      <Webhook className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{webhook.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{webhook.url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {webhook.is_active ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <AlertCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {webhook.failure_count > 0 && `${webhook.failure_count} failures`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
