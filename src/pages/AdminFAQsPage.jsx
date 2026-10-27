import React, { useState, useEffect } from 'react'
import { HelpCircle, Search, Plus, Edit, Trash2, X } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

export default function AdminFAQsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingFaq, setEditingFaq] = useState(null)
  const [form, setForm] = useState({ question: '', answer: '', category: 'general', sort_order: 0, is_active: true })

  const loadFaqs = async () => {
    setLoading(true)
    try {
      const res = await api.getAdminFAQs()
      const all = res?.faqs || []
      setFaqs(search ? all.filter(f => f.question?.toLowerCase().includes(search.toLowerCase())) : all)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFaqs() }, [search])

  const openCreate = () => {
    setEditingFaq(null)
    setForm({ question: '', answer: '', category: 'general', sort_order: 0, is_active: true })
    setShowModal(true)
  }

  const openEdit = (faq) => {
    setEditingFaq(faq)
    setForm({ question: faq.question || '', answer: faq.answer || '', category: faq.category || 'general', sort_order: faq.sort_order || 0, is_active: faq.is_active !== false })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.question || !form.answer) { toast.error('Question and answer are required'); return }
    try {
      if (editingFaq) {
        await api.updateAdminFAQ(editingFaq.id, form)
        toast.success('FAQ updated')
      } else {
        await api.createAdminFAQ(form)
        toast.success('FAQ created')
      }
      setShowModal(false)
      loadFaqs()
    } catch (err) {
      toast.error('Failed to save FAQ', err.message)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Delete this FAQ?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteAdminFAQ(id)
      toast.success('FAQ deleted')
      loadFaqs()
    } catch (err) {
      toast.error('Failed to delete FAQ', err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-7 h-7 text-teal-600" /> FAQs
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage frequently asked questions</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
          <Plus className="w-4 h-4" /> Add FAQ
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search FAQs..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : faqs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No FAQs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {faqs.map((faq) => (
                  <tr key={faq.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">{faq.question}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{faq.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{faq.sort_order}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${faq.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {faq.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(faq)} className="p-1.5 text-gray-400 hover:text-teal-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(faq.id)} className="p-1.5 text-gray-400 hover:text-red-600 ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{editingFaq ? 'Edit' : 'Create'} FAQ</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <textarea rows={2} value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                <textarea rows={4} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
