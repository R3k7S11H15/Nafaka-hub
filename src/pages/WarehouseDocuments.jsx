import { useState, useEffect } from 'react'
import { FileText, RefreshCw, Loader2, Plus, X, Shield, Check } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseDocuments() {
  const toast = useToast()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ open: false, document_type: '', document_url: '', document_number: '', issued_date: '', expiry_date: '' })

  const loadDocuments = async () => {
    try {
      const data = await api.getMyWarehouseDocuments()
      if (data.success) setDocuments(data.documents || [])
    } catch {
      setDocuments([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadDocuments() }, [])

  const addDocument = async () => {
    if (!form.document_type || !form.document_url) { toast.error('Document type and URL are required'); return }
    try {
      await api.addWarehouseDocument(form)
      toast.success('Document uploaded')
      setForm({ open: false, document_type: '', document_url: '', document_number: '', issued_date: '', expiry_date: '' })
      loadDocuments()
    } catch (e) {
      toast.error(e?.message || 'Failed to upload document')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">Manage warehouse documents and verification</p>
        </div>
        <button onClick={() => setForm({ ...form, open: true })} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issued</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">{doc.document_type?.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.document_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.issued_date || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.expiry_date || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${doc.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {doc.is_verified ? <Check className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                        {doc.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Document</h3>
              <button onClick={() => setForm({ ...form, open: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
                <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">Select type</option>
                  <option value="business_registration">Business Registration</option>
                  <option value="tin_certificate">TIN Certificate</option>
                  <option value="warehouse_license">Warehouse License</option>
                  <option value="insurance">Insurance</option>
                  <option value="safety_certificate">Safety Certificate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document URL *</label>
                <input type="text" value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Number</label>
                <input type="text" value={form.document_number} onChange={(e) => setForm({ ...form, document_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. BRN-12345" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issued Date</label>
                  <input type="date" value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
              </div>
              <button onClick={addDocument} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium">Add Document</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
