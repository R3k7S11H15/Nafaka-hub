import { useState, useEffect } from 'react'
import { Mail, MessageSquare, Plus, Edit, Trash2, Loader2, X, Save } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

export default function AdminTemplatesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [emailTemplates, setEmailTemplates] = useState([])
  const [smsTemplates, setSmsTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('email')
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    template_key: '',
    subject: '',
    body_html: '',
    body_text: '',
    variables: '',
    is_active: true,
  })

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const [emailRes, smsRes] = await Promise.all([
        api.getAdminEmailTemplates(),
        api.getAdminSmsTemplates(),
      ])
      setEmailTemplates(emailRes?.templates || [])
      setSmsTemplates(smsRes?.templates || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTemplates() }, [])

  const openEdit = (template) => {
    setEditingTemplate(template)
    setForm({
      template_key: template.template_key || '',
      subject: template.subject || '',
      body_html: template.body_html || '',
      body_text: template.body_text || '',
      variables: template.variables ? JSON.stringify(template.variables, null, 2) : '',
      is_active: template.is_active !== false,
    })
    setShowModal(true)
  }

  const openCreate = () => {
    setEditingTemplate(null)
    setForm({
      template_key: '',
      subject: '',
      body_html: '',
      body_text: '',
      variables: '',
      is_active: true,
    })
    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSave = async () => {
    if (!form.template_key || !form.subject) return
    setSaving(true)
    try {
      const payload = {
        template_key: form.template_key,
        subject: form.subject,
        body_html: form.body_html,
        body_text: form.body_text,
        variables: form.variables ? JSON.parse(form.variables) : null,
        is_active: form.is_active,
      }
      if (activeTab === 'email') {
        await api.saveAdminEmailTemplate(payload)
      } else {
        await api.saveAdminSmsTemplate(payload)
      }
      setShowModal(false)
      loadTemplates()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (key) => {
     const confirmed = await confirm({ title: 'Delete this template?', type: 'danger' })
     if (!confirmed) return
    try {
      await api.deleteAdminSmsTemplate(key)
      loadTemplates()
    } catch (err) {
      console.error(err)
    }
  }

  const type = activeTab
  const templates = type === 'email' ? emailTemplates : smsTemplates

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-7 h-7 text-blue-600" /> Notification Templates
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage email and SMS templates</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${activeTab === 'email' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Mail className="w-4 h-4 inline mr-2" /> Email Templates
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex-1 px-6 py-3 text-sm font-medium ${activeTab === 'sms' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" /> SMS Templates
          </button>
        </div>

        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">{type === 'email' ? 'Email' : 'SMS'} Templates</h3>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Template
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin w-6 h-6 mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject / Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Body Preview</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map((template) => (
                    <tr key={template.template_key || template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono">{template.template_key}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{template.subject || template.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{template.body_text || template.body_html || 'No content'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEdit(template)} className="p-1.5 text-gray-400 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        {type === 'sms' && (
                          <button onClick={() => handleDelete(template.template_key)} className="p-1.5 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {templates.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No templates found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{editingTemplate ? 'Edit' : 'Create'} Template</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template Key</label>
                <input
                  type="text"
                  name="template_key"
                  value={form.template_key}
                  onChange={handleChange}
                  disabled={!!editingTemplate}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100"
                />
              </div>
              {type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Body {type === 'email' ? '(HTML)' : '(Text)'}</label>
                <textarea
                  name={type === 'email' ? 'body_html' : 'body_text'}
                  value={type === 'email' ? form.body_html : form.body_text}
                  onChange={handleChange}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variables (JSON)</label>
                <textarea
                  name="variables"
                  value={form.variables}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                  placeholder='{"order_id": "ORD-001"}'
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    name="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={handleChange}
                    className="rounded"
                  />
                  Active
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
