import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, XCircle, FileText, Loader2, Users } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }
  const normalized = (status || '').toLowerCase()
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[normalized] || 'bg-gray-100 text-gray-800'}`}>
      {status || 'Pending'}
    </span>
  )
}

function Tab({ label, value, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
        active ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label} ({value})
    </button>
  )
}

export default function LogisticsApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('logistics')
  const [processingId, setProcessingId] = useState(null)
  const toast = useToast()

  const fetchApplications = async () => {
    setLoading(true)
    try {
      if (activeTab === 'logistics') {
        const res = await api.getLogisticsApplications()
        setApplications(Array.isArray(res?.applications) ? res.applications : Array.isArray(res?.data) ? res.data : [])
      } else {
        const res = await api.getWarehouseApplications()
        setApplications(Array.isArray(res?.applications) ? res.applications : Array.isArray(res?.data) ? res.data : [])
      }
    } catch {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [activeTab])

  const handleApprove = async (id) => {
    const notes = prompt('Enter approval notes (optional):')
    if (notes === null) return
    setProcessingId(id)
    try {
      if (activeTab === 'logistics') {
        await api.approveLogisticsApplication(id, notes)
      } else {
        await api.approveWarehouseApplication(id, notes)
      }
      fetchApplications()
    } catch (err) {
      toast.error('Failed to approve application')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id) => {
    const notes = prompt('Enter rejection reason:')
    if (notes === null) return
    setProcessingId(id)
    try {
      if (activeTab === 'logistics') {
        await api.rejectLogisticsApplication(id, notes)
      } else {
        await api.rejectWarehouseApplication(id, notes)
      }
      fetchApplications()
    } catch (err) {
      toast.error('Failed to reject application')
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = applications.filter(a => (a.status || '').toLowerCase() === 'pending').length
  const approvedCount = applications.filter(a => (a.status || '').toLowerCase() === 'approved').length
  const rejectedCount = applications.filter(a => (a.status || '').toLowerCase() === 'rejected').length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {activeTab === 'logistics' ? 'Logistics Applications' : 'Warehouse Applications'}
            </h1>
            <p className="text-gray-600 mt-2">Review and process new provider onboarding requests</p>
          </div>
        </div>

        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <Tab label="Logistics" value={pendingCount} active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} />
          <Tab label="Warehouse" value={pendingCount} active={activeTab === 'warehouse'} onClick={() => setActiveTab('warehouse')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
            </div>
            <FileText className="w-10 h-10 text-blue-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-gray-900">{rejectedCount}</p>
            </div>
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'logistics' ? 'Logistics Applications' : 'Warehouse Applications'}
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading applications...
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No applications found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id || app.application_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{app.id || app.application_id || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{app.applicant_name || app.full_name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{app.business_name || app.company_name || app.business || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{app.location || app.region || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{app.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{app.created_at || app.submitted_at || app.date || '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                      <td className="px-6 py-4">
                        {(app.status || '').toLowerCase() === 'pending' ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(app.id || app.application_id)}
                              disabled={processingId === (app.id || app.application_id)}
                              className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                            >
                              {processingId === (app.id || app.application_id) ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleReject(app.id || app.application_id)}
                              disabled={processingId === (app.id || app.application_id)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
