import React, { useEffect, useState } from 'react'
import { Key, Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react'
import { TableSkeleton, ChartSkeleton, CardSkeleton, FormSkeleton } from '../../components/Skeletons'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../components/ConfirmDialog'

export default function SuperAdminApiKeys() {
  const toast = useToast()
  const [keys, setKeys] = useState([])
  const confirm = useConfirm()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', scopes: [], permissions: {}, expires_at: '' })
  const [showKey, setShowKey] = useState({})

  useEffect(() => {
    fetchKeys()
  }, [])

  const fetchKeys = async () => {
    try {
      const res = await api.getApiKeys()
      setKeys(res?.api_keys || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const res = await api.createApiKey(form)
      if (res?.key) {
        setShowKey(prev => ({ ...prev, [res.key_prefix]: res.key }))
      }
      setShowForm(false)
      setForm({ name: '', scopes: [], permissions: {}, expires_at: '' })
      fetchKeys()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Delete this API key?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteApiKey(id)
      toast.success('API key deleted')
      fetchKeys()
    } catch (err) {
      toast.error('Failed to delete API key', err.message)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-500 text-sm mt-1">Manage API keys for external integrations</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
          <Plus className="w-4 h-4" /> Generate Key
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate API Key</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g. Mobile App" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (optional)</label>
              <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Generate</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key Prefix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{k.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 font-mono">{k.key_prefix}...</span>
                      {showKey[k.key_prefix] && (
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{showKey[k.key_prefix]}</code>
                          <button onClick={() => copyToClipboard(showKey[k.key_prefix])} className="text-gray-400 hover:text-gray-600"><Copy className="w-3 h-3" /></button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(k.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(k.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {keys.length === 0 && !loading && (
          <div className="p-12 text-center text-gray-500">No API keys generated yet</div>
        )}
      </div>
    </div>
  )
}
