import React, { useEffect, useState } from 'react'
import { HelpCircle, AlertTriangle, Clock, CheckCircle2, XCircle, Search, Eye, Loader2 } from 'lucide-react'
import api from '../services/api'

const getStatusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'open': return 'bg-red-100 text-red-700'
    case 'investigating': return 'bg-amber-100 text-amber-700'
    case 'resolved': return 'bg-green-100 text-green-700'
    case 'rejected': return 'bg-gray-100 text-gray-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [updateStatus, setUpdateStatus] = useState('')
  const [resolution, setResolution] = useState('')
  const limit = 20

  useEffect(() => { fetchDisputes() }, [search, statusFilter, page])

  const fetchDisputes = async () => {
    setLoading(true)
    try {
      const res = await api.getAdminDisputes({ search, status: statusFilter, limit, offset: page * limit })
      setDisputes(res?.disputes || [])
      setTotal(res?.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openDetail = async (dispute) => {
    try {
      const res = await api.getAdminDispute(dispute.id)
      setSelectedDispute(res?.dispute || dispute)
      setUpdateStatus(res?.dispute?.status || '')
      setResolution(res?.dispute?.resolution || '')
      setShowDetail(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdate = async () => {
    if (!selectedDispute || !updateStatus) return
    try {
      await api.updateAdminDispute(selectedDispute.id, { status: updateStatus, resolution })
      setShowDetail(false)
      fetchDisputes()
    } catch (err) {
      console.error(err)
    }
  }

  const openCount = disputes.filter(d => (d.status || '').toLowerCase() === 'open').length
  const investigatingCount = disputes.filter(d => (d.status || '').toLowerCase() === 'investigating').length
  const resolvedCount = disputes.filter(d => (d.status || '').toLowerCase() === 'resolved').length
  const rejectedCount = disputes.filter(d => (d.status || '').toLowerCase() === 'rejected').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HelpCircle className="w-7 h-7 text-amber-600" /> Dispute Resolution
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage and resolve customer disputes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: openCount, color: 'bg-red-50 text-red-600', icon: AlertTriangle },
          { label: 'Investigating', value: investigatingCount, color: 'bg-amber-50 text-amber-600', icon: Clock },
          { label: 'Resolved', value: resolvedCount, color: 'bg-green-50 text-green-600', icon: CheckCircle2 },
          { label: 'Rejected', value: rejectedCount, color: 'bg-gray-50 text-gray-600', icon: XCircle },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search disputes..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin w-6 h-6 mx-auto" /></div>
        ) : disputes.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No disputes found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Complainant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {disputes.map((dispute) => (
                  <tr key={dispute.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{dispute.order_number || `#${dispute.order_id || 'N/A'}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{dispute.complainant_name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{dispute.subject || 'No subject'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dispute.status)}`}>
                        {dispute.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(dispute.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openDetail(dispute)} className="p-1.5 text-gray-400 hover:text-amber-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">Total: {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={disputes.length < limit} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {showDetail && selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Dispute Details</h3>
              <button onClick={() => setShowDetail(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-gray-500 uppercase">Order</label><p className="text-sm text-gray-900 mt-1">{selectedDispute.order_number || `#${selectedDispute.order_id || 'N/A'}`}</p></div>
                <div><label className="text-xs font-medium text-gray-500 uppercase">Status</label><p className="text-sm text-gray-900 mt-1">{selectedDispute.status}</p></div>
                <div><label className="text-xs font-medium text-gray-500 uppercase">Complainant</label><p className="text-sm text-gray-900 mt-1">{selectedDispute.complainant_name || 'Unknown'}</p></div>
                <div><label className="text-xs font-medium text-gray-500 uppercase">Respondent</label><p className="text-sm text-gray-900 mt-1">{selectedDispute.respondent_name || 'N/A'}</p></div>
                <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Subject</label><p className="text-sm text-gray-900 mt-1">{selectedDispute.subject || 'No subject'}</p></div>
                <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Description</label><p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedDispute.description || 'No description'}</p></div>
                {selectedDispute.resolution && <div className="col-span-2"><label className="text-xs font-medium text-gray-500 uppercase">Resolution</label><p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedDispute.resolution}</p></div>}
              </div>
              <div className="border-t border-gray-200 pt-4">
                <label className="text-xs font-medium text-gray-500 uppercase">Update Status</label>
                <select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)} className="mt-2 w-full px-4 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="">Select status</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Resolution Notes</label>
                <textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Add resolution notes..." className="mt-2 w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowDetail(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
                <button onClick={handleUpdate} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm">Update Dispute</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
