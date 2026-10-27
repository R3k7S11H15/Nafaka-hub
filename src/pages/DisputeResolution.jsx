import { useState, useEffect } from 'react'
import { HelpCircle, AlertTriangle, Clock, CheckCircle, MessageSquare, Upload, Eye, Plus, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

const getStatusColor = (status) => {
  switch (status) {
    case 'Open': return 'bg-red-100 text-red-700 border-red-200'
    case 'In Progress': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'Resolved': return 'bg-green-100 text-green-700 border-green-200'
    default: return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function DisputeResolution() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReportForm, setShowReportForm] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const toast = useToast()
  const [reportForm, setReportForm] = useState({ orderId: '', issueType: '', description: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getDisputes()
        if (!mounted) return
        setDisputes(res?.data || res?.disputes || res || [])
      } catch {
        if (mounted) setDisputes([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const openCount = disputes.filter(d => (d.status || '').toLowerCase() === 'open').length
  const inProgressCount = disputes.filter(d => (d.status || '').toLowerCase() === 'in progress' || (d.status || '').toLowerCase() === 'in_progress').length
  const resolvedCount = disputes.filter(d => (d.status || '').toLowerCase() === 'resolved').length

  const stats = [
    { label: 'Open Disputes', value: openCount, color: 'bg-red-50 text-red-600', icon: AlertTriangle },
    { label: 'In Progress', value: inProgressCount, color: 'bg-amber-50 text-amber-600', icon: Clock },
    { label: 'Resolved', value: resolvedCount, color: 'bg-green-50 text-green-600', icon: CheckCircle },
    { label: 'Avg Resolution Time', value: '—', color: 'bg-blue-50 text-blue-600', icon: Clock },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">Dispute Resolution</h1>
        </div>
        <p className="text-gray-600 ml-11">Fair and transparent issue resolution</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="text-sm text-gray-600">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Active Disputes</h2>
        <button
          onClick={() => setShowReportForm(!showReportForm)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
          Report Issue
        </button>
      </div>

      {showReportForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Report a New Issue</h3>
          <form className="space-y-6" onSubmit={async (e) => {
            e.preventDefault()
            if (!reportForm.orderId || !reportForm.issueType || !reportForm.description) {
              toast.error('Please fill in all required fields')
              return
            }
            setSubmitting(true)
            try {
              const res = await api.createDispute({
                order_id: reportForm.orderId,
                issue_type: reportForm.issueType,
                description: reportForm.description,
              })
              if (res?.success) {
                toast.success('Dispute filed successfully')
                setReportForm({ orderId: '', issueType: '', description: '' })
                setShowReportForm(false)
                const refreshed = await api.getDisputes()
                setDisputes(refreshed?.data || refreshed?.disputes || refreshed || [])
              } else {
                toast.error(res?.message || 'Failed to file dispute')
              }
            } catch {
              toast.error('Failed to file dispute')
            } finally {
              setSubmitting(false)
            }
          }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Order ID</label>
              <input type="text" placeholder="e.g., #1235" value={reportForm.orderId} onChange={(e) => setReportForm({ ...reportForm, orderId: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type</label>
              <select value={reportForm.issueType} onChange={(e) => setReportForm({ ...reportForm, issueType: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">Select issue type</option>
                <option value="quality">Quality</option>
                <option value="delivery">Delivery</option>
                <option value="payment">Payment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea rows={4} value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} placeholder="Describe your issue in detail..." className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Evidence Upload</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-amber-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, PDF up to 10MB</p>
              </div>
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={() => setShowReportForm(false)} className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 inline-flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500 mb-8">
          <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading disputes...
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500 mb-8">No disputes found.</div>
      ) : (
        <div className="space-y-6 mb-8">
          {disputes.map((dispute, index) => (
            <div key={dispute.id || dispute.dispute_id || index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{dispute.orderId || dispute.order_id || dispute.order_number || `Dispute ${dispute.id || ''}`}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(dispute.status)}`}>
                      {dispute.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{dispute.parties || dispute.parties_text || ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-gray-900">{dispute.issueType || dispute.issue_type || dispute.category || 'Issue'}</span>
                </div>
                <p className="text-sm text-gray-700 ml-6">{dispute.description || dispute.details || ''}</p>
              </div>

              <div className="flex items-center gap-6 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>{dispute.evidence ?? dispute.evidence_count ?? 0} evidence files</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Filed: {dispute.date || dispute.created_at || '—'}</span>
                </div>
                {dispute.id && <span className="text-gray-400">ID: #{dispute.id}</span>}
              </div>

              {Array.isArray(dispute.timeline) && dispute.timeline.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-3">Resolution Timeline</p>
                  <div className="flex items-center gap-4">
                    {dispute.timeline.map((step, i) => (
                      <div key={i} className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-3 h-3 rounded-full ${step.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={`text-xs font-medium ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                            {step.step}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 ml-5">{step.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
                  View Details
                </button>
                <button className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Support Chat</h2>
          </div>
          <button
            onClick={() => setShowChat(!showChat)}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
          >
            {showChat ? 'Hide Chat' : 'Open Chat'}
          </button>
        </div>

        {showChat && (
          <div className="border border-gray-200 rounded-lg p-4 h-96 flex flex-col">
            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3 max-w-md">
                  <p className="text-sm text-gray-900">Hello! How can we help you with your dispute?</p>
                  <p className="text-xs text-gray-500 mt-1">Support Agent - Just now</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <input type="text" placeholder="Type your message..." value={chatMsg} onChange={(e) => setChatMsg(e.target.value)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
