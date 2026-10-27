import { useState, useEffect } from 'react'
import { Shield, Check, X, Loader2, RefreshCw, Search } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function AdminLogisticsDocuments() {
  const toast = useToast()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState(null)

  const loadAll = async () => {
    try {
      const res = await api.getAdminLogisticsDocuments()
      setDocuments(res?.documents || [])
    } catch {
      setDocuments([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  const verifyDocument = async (id, isVerified) => {
    const notes = window.prompt(isVerified ? 'Enter verification notes (optional):' : 'Enter rejection reason:')
    if (isVerified && notes === null) return
    if (!isVerified && !notes) { toast.error('Please provide a rejection reason'); return }
    setProcessing(id)
    try {
      await api.verifyLogisticsDocument(id, isVerified, notes)
      loadAll()
    } catch (e) {
      toast.error(e?.message || 'Failed to update document')
    } finally { setProcessing(null) }
  }

  const filtered = search
    ? documents.filter(d => (d.company_name || '').toLowerCase().includes(search.toLowerCase()) || (d.document_type || '').toLowerCase().includes(search.toLowerCase()) || (d.owner_name || '').toLowerCase().includes(search.toLowerCase()))
    : documents

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading logistics documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Logistics Documents</h1>
          <p className="text-gray-600 mt-1">Review and verify logistics company documents</p>
        </div>
        <button onClick={loadAll} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by company, owner, or document type..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No documents found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.company_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.owner_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{doc.document_type?.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{doc.document_number || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${doc.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {doc.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => verifyDocument(doc.id, true)} disabled={processing === doc.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium disabled:opacity-50">
                          {processing === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Verify
                        </button>
                        <button onClick={() => verifyDocument(doc.id, false)} disabled={processing === doc.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium disabled:opacity-50">
                          {processing === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
