import { useState, useEffect } from 'react';
import { DollarSign, Banknote, CheckCircle2, Clock, AlertCircle, ArrowDownToLine, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Completed: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    Processing: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    Failed: 'bg-red-100 text-red-800',
    failed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

const fmtMoney = (v) => {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  return `TZS ${Number(v).toLocaleString()}`;
};

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const [form, setForm] = useState({ amount: '', method: 'mpesa', account: '' });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getWithdrawals();
        if (!mounted) return;
        setWithdrawals(Array.isArray(res?.data) ? res.data : Array.isArray(res?.withdrawals) ? res.withdrawals : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setWithdrawals([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) < 50000) {
      toast.error('Minimum withdrawal is TZS 50,000')
      return
    }
    if (!form.account) {
      toast.error('Please provide your account/number')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.withdrawEarnings(Number(form.amount))
      if (res?.success) {
        toast.success('Withdrawal request submitted!')
        setForm({ amount: '', method: 'mpesa', account: '' })
        const refreshed = await api.getWithdrawals()
        setWithdrawals(Array.isArray(refreshed?.data) ? refreshed.data : Array.isArray(refreshed?.withdrawals) ? refreshed.withdrawals : [])
      } else {
        toast.error(res?.message || 'Failed to submit withdrawal')
      }
    } catch {
      toast.error('Failed to submit withdrawal')
    } finally {
      setSubmitting(false)
    }
  }

  const completed = withdrawals.filter(w => (w.status || '').toLowerCase() === 'completed');
  const pending = withdrawals.filter(w => (w.status || '').toLowerCase() === 'pending');
  const totalWithdrawn = completed.reduce((s, w) => s + Number(w.amount || 0), 0);
  const pendingAmount = pending.reduce((s, w) => s + Number(w.amount || 0), 0);

  const stats = [
    { label: 'Pending Withdrawals', value: fmtMoney(pendingAmount), icon: Clock },
    { label: 'Completed', value: completed.length.toString(), icon: CheckCircle2 },
    { label: 'Withdrawn Total', value: fmtMoney(totalWithdrawn), icon: Banknote },
    { label: 'All Withdrawals', value: withdrawals.length.toString(), icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-8 h-8 text-green-500" /> Withdrawals
            </h1>
            <p className="text-gray-600 mt-2">Withdraw your earnings to mobile money or bank</p>
          </div>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium inline-flex items-center gap-2">
            <ArrowDownToLine className="w-4 h-4" /> Request Withdrawal
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className="w-10 h-10 text-blue-500" />
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Withdrawal</h2>
          <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label>
              <input type="number" placeholder="500,000" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="mpesa">M-Pesa</option>
                <option value="tigopesa">Tigo Pesa</option>
                <option value="airtel">Airtel Money</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account / Number</label>
              <input type="text" placeholder="+255 ..." value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={submitting} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium inline-flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
          <p className="text-xs text-gray-500 mt-2 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Minimum withdrawal: TZS 50,000 · Processing time: 1-2 business days
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Withdrawal History</h2>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All Status</option>
              <option>Pending</option>
              <option>Processing</option>
              <option>Completed</option>
              <option>Failed</option>
            </select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading withdrawals...
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No withdrawals yet.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Withdrawal ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {withdrawals.map((w) => (
                  <tr key={w.id || w.withdrawal_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{w.id || w.withdrawal_id || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{fmtMoney(w.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{w.method || w.payment_method || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{w.account || w.account_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{w.reference || w.transaction_ref || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{w.requested_on || w.requestedOn || w.created_at || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
