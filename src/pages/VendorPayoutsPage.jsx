import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle2, Clock, AlertCircle, Banknote, Loader2, CheckSquare, Square } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

function StatusBadge({ status }) {
  const styles = {
    Paid: 'bg-green-100 text-green-800',
    paid: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    Processing: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    'On Hold': 'bg-red-100 text-red-800',
    on_hold: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
    Rejected: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorPayoutsPage() {
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [processing, setProcessing] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getWithdrawals()
        if (!mounted) return
        setPayouts(Array.isArray(res?.data) ? res.data : Array.isArray(res?.withdrawals) ? res.withdrawals : Array.isArray(res) ? res : [])
      } catch {
        if (mounted) setPayouts([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const paid = payouts.filter(p => (p.status || '').toLowerCase() === 'paid' || (p.status || '').toLowerCase() === 'completed')
  const pending = payouts.filter(p => (p.status || '').toLowerCase() === 'pending')
  const processingPayouts = payouts.filter(p => (p.status || '').toLowerCase() === 'processing')
  const onHold = payouts.filter(p => (p.status || '').toLowerCase() === 'on hold' || (p.status || '').toLowerCase() === 'on_hold')

  const paidSum = paid.reduce((s, p) => s + Number(p.amount || 0), 0)
  const pendingSum = pending.reduce((s, p) => s + Number(p.amount || 0), 0)

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (selected.length === payouts.length) {
      setSelected([])
    } else {
      setSelected(payouts.map(p => p.id || p.withdrawal_id))
    }
  }

  const handleBulkApprove = async () => {
    if (selected.length === 0) return
    setProcessing(true)
    try {
      await api.request('/content/admin/payouts/bulk', {
        method: 'POST',
        body: { withdrawal_ids: selected, action: 'approve' },
      })
      toast.success(`Approved ${selected.length} payouts`)
      setSelected([])
    } catch {
      toast.error('Bulk approve failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleRelease = async (payoutId) => {
    setProcessing(true)
    try {
      await api.request(`/content/admin/withdrawals/${payoutId}/approve`, {
        method: 'POST',
        body: {},
      })
      setPayouts(payouts.map(p => (p.id === payoutId || p.withdrawal_id === payoutId) ? { ...p, status: 'processing' } : p))
    } catch {
      toast.error('Failed to release payout')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vendor Payouts</h1>
          <p className="text-gray-600 mt-2">Manage and release payments to vendors</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Paid Out</p>
              <p className="text-2xl font-bold text-green-600">{fmtMoney(paidSum)}</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{fmtMoney(pendingSum)}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Processing</p>
              <p className="text-2xl font-bold text-blue-600">{processingPayouts.length}</p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">On Hold</p>
              <p className="text-2xl font-bold text-red-600">{onHold.length}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Payout Queue</h2>
            <button
              onClick={handleBulkApprove}
              disabled={selected.length === 0 || processing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {processing ? 'Processing...' : `Approve Selected (${selected.length})`}
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading payouts...
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No payouts to process.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button onClick={toggleAll}>
                      {selected.length === payouts.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payout ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id || payout.withdrawal_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(payout.id || payout.withdrawal_id)}>
                        {selected.includes(payout.id || payout.withdrawal_id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{payout.id || payout.withdrawal_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{payout.vendor || payout.vendor_name || payout.account || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{fmtMoney(payout.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="w-3 h-3" /> {payout.method || payout.payment_method || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{payout.reference || payout.transaction_ref || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={payout.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{payout.date || payout.created_at || '—'}</td>
                    <td className="px-6 py-4">
                      {(payout.status || '').toLowerCase() === 'pending' && (
                        <button onClick={() => handleRelease(payout.id || payout.withdrawal_id)} disabled={processing} className="text-sm text-green-600 hover:text-green-800 font-medium disabled:opacity-50">
                          Release
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
