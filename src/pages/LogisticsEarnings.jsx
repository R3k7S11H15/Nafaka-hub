import { useState, useEffect } from 'react'
import { DollarSign, RefreshCw, Loader2, Banknote, X } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function LogisticsEarnings() {
  const toast = useToast()
  const [summary, setSummary] = useState({ today: 0, week: 0, month: 0, total: 0, available: 0 })
  const [earnings, setEarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [withdrawForm, setWithdrawForm] = useState({ open: false, amount: '' })
  const [withdrawing, setWithdrawing] = useState(false)

  const loadAll = async () => {
    try {
      const [sumRes, listRes] = await Promise.all([api.getMyEarningsSummary(), api.getMyEarnings()])
      setSummary(sumRes?.summary || { today: 0, week: 0, month: 0, total: 0, available: 0 })
      setEarnings(listRes?.earnings || [])
    } catch {
      setSummary({ today: 0, week: 0, month: 0, total: 0, available: 0 })
      setEarnings([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  const submitWithdraw = async () => {
    const amount = parseFloat(withdrawForm.amount)
    if (isNaN(amount) || amount <= 0) { toast.error('Please enter a valid amount'); return }
    if (amount > (summary.available || 0)) { toast.error('Amount exceeds available balance'); return }
    setWithdrawing(true)
    try {
      const res = await api.withdrawEarnings(amount)
      if (res.success) { toast.success('Withdrawal processed successfully!'); setWithdrawForm({ open: false, amount: '' }); loadAll() } else toast.error(res.message || 'Withdrawal failed')
    } catch (e) {
      toast.error(e?.message || 'Withdrawal failed')
    } finally { setWithdrawing(false) }
  }

  const formatCurrency = (val) => `${Number(val || 0).toLocaleString()} TZS`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading earnings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Earnings & Payments</h1>
          <p className="text-gray-600 mt-1">Track your income and withdrawals</p>
        </div>
        <button onClick={loadAll} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-5">
          <p className="text-xs text-gray-500 font-medium">Today</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(summary.today)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-5">
          <p className="text-xs text-gray-500 font-medium">This Week</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(summary.week)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-5">
          <p className="text-xs text-gray-500 font-medium">This Month</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(summary.month)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-5">
          <p className="text-xs text-gray-500 font-medium">Available Balance</p>
          <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(summary.available)}</p>
          <button onClick={() => setWithdrawForm({ ...withdrawForm, open: true })} className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Banknote className="w-4 h-4" /> Withdraw
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
        </div>
        {earnings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No earnings yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{e.order_number || e.id}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-medium">+{formatCurrency(e.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {withdrawForm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Withdraw Funds</h3>
              <button onClick={() => setWithdrawForm({ ...withdrawForm, open: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label>
                <input type="number" value={withdrawForm.amount} onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
                <p className="text-xs text-gray-500 mt-1">Available: {formatCurrency(summary.available)}</p>
              </div>
              <button onClick={submitWithdraw} disabled={withdrawing} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                {withdrawing ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
