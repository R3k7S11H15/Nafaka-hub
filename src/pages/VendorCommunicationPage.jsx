import { useState, useEffect } from 'react'
import { Send, Users, Bell, MessageSquare, Loader2, CheckCircle } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function VendorCommunicationPage() {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({
    title: '',
    message: '',
    target: 'all',
    type: 'announcement',
  })
  const [recent, setRecent] = useState([])
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminNotifications()
        if (!mounted) return
        setRecent(Array.isArray(res?.notifications) ? res.notifications : Array.isArray(res) ? res : [])
      } catch {
        if (mounted) setRecent([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleSend = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await api.request('/superadmin/notifications', {
        method: 'POST',
        body: {
          title: form.title,
          message: form.message,
          type: form.type,
          target_role: form.target === 'all' ? null : form.target,
          target_user_id: form.target === 'specific' ? null : null,
        },
      })
      toast.success('Notification sent successfully')
      setForm({ title: '', message: '', target: 'all', type: 'announcement' })
    } catch {
      toast.error('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-blue-600" /> Vendor Communications
          </h1>
          <p className="text-gray-600 mt-1">Send announcements and messages to vendors</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Notification</h2>
              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Notification title"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Enter your message..."
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                    <select
                      value={form.target}
                      onChange={(e) => setForm({ ...form, target: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="all">All Vendors</option>
                      <option value="seller">Sellers Only</option>
                      <option value="vendor_admin">Vendor Admins</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      <option value="announcement">Announcement</option>
                      <option value="alert">Alert</option>
                      <option value="update">Update</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Notification
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Communications</h2>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : recent.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recent communications</p>
              ) : (
                <div className="space-y-3">
                  {recent.slice(0, 10).map((n) => (
                    <div key={n.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">{n.title || 'Notification'}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.message || '—'}</p>
                      <p className="text-xs text-gray-400 mt-2">{n.created_at ? new Date(n.created_at).toLocaleDateString() : '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
