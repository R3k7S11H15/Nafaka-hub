import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, Loader2, DollarSign, Clock, CheckCircle, XCircle, Plus } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ amount: '', payment_method: 'mpesa', account_details: '' })
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getMyVendorWithdrawals({ limit: 1000 })
        if (!mounted) return
        const list = Array.isArray(res?.withdrawals) ? res.withdrawals : Array.isArray(res?.data) ? res.data : []
        setWithdrawals(list)
      } catch {
        if (mounted) setWithdrawals([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleRequest = async (e) => {
    e.preventDefault()
    try {
      await api.requestVendorWithdrawal(form)
      toast.success('Withdrawal request submitted')
      setShowModal(false)
      setForm({ amount: '', payment_method: 'mpesa', account_details: '' })
      const res = await api.getMyVendorWithdrawals({ limit: 1000 })
      const list = Array.isArray(res?.withdrawals) ? res.withdrawals : Array.isArray(res?.data) ? res.data : []
      setWithdrawals(list)
    } catch {
      toast.error('Failed to submit withdrawal request')
    }
  }

  const stats = {
    total: withdrawals.length,
    pending: withdrawals.filter(w => (w.status || '').toLowerCase() === 'pending').length,
    processing: withdrawals.filter(w => (w.status || '').toLowerCase() === 'processing').length,
    completed: withdrawals.filter(w => (w.status || '').toLowerCase() === 'paid' || (w.status || '').toLowerCase() === 'completed').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Withdrawals</h1>
            <p className="text-gray-600 mt-1">Request and track your payout withdrawals</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Request Withdrawal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Requests', value: String(stats.total), icon: DollarSign, color: 'blue' },
            { label: 'Pending', value: String(stats.pending), icon: Clock, color: 'yellow' },
            { label: 'Processing', value: String(stats.processing), icon: Loader2, color: 'purple' },
            { label: 'Completed', value: String(stats.completed), icon: CheckCircle, color: 'green' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No withdrawal requests yet</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Method</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Reference</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id || w.withdrawal_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-blue-600">{w.id || w.withdrawal_id || '—'}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-gray-900">{fmtMoney(w.amount)}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{w.payment_method || w.method || '—'}</td>
                    <td className="py-4 px-4 text-sm text-gray-500 font-mono">{w.transaction_ref || w.reference || '—'}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(w.status || '').toLowerCase() === 'paid' || (w.status || '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' : (w.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                        {w.status || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-500">{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Request Withdrawal</h2>
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Details</label>
                  <textarea value={form.account_details} onChange={(e) => setForm({ ...form, account_details: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
