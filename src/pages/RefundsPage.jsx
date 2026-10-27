import { useState, useEffect } from 'react';
import { TrendingDown, CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Processing: 'bg-blue-100 text-blue-800',
    processing: 'bg-blue-100 text-blue-800',
    Approved: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    Completed: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
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

export default function RefundsPage() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getRefunds();
        if (!mounted) return;
        setRefunds(Array.isArray(res?.data) ? res.data : Array.isArray(res?.refunds) ? res.refunds : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setRefunds([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const processing = refunds.filter(r => (r.status || '').toLowerCase() === 'processing');
  const approved = refunds.filter(r => (r.status || '').toLowerCase() === 'approved' || (r.status || '').toLowerCase() === 'completed');
  const rejected = refunds.filter(r => (r.status || '').toLowerCase() === 'rejected');
  const total = refunds.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Refunds</h1>
          <p className="text-gray-600 mt-2">Manage customer refund requests and disputes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Refunds</p>
              <p className="text-2xl font-bold text-gray-900">{fmtMoney(total)}</p>
            </div>
            <TrendingDown className="w-10 h-10 text-red-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Processing</p>
              <p className="text-2xl font-bold text-blue-600">{processing.length}</p>
            </div>
            <Clock className="w-10 h-10 text-blue-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">{approved.length}</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejected.length}</p>
            </div>
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Refund Requests</h2>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All Status</option>
              <option>Processing</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading refunds...
            </div>
          ) : refunds.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No refund requests.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Refund ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {refunds.map((refund) => (
                  <tr key={refund.id || refund.refund_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{refund.id || refund.refund_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-blue-600">{refund.order || refund.order_id || refund.order_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{refund.customer || refund.customer_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{refund.vendor || refund.vendor_name || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{fmtMoney(refund.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{refund.reason || refund.description || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={refund.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{refund.requested_on || refund.requestedOn || refund.created_at || '—'}</td>
                    <td className="px-6 py-4">
                      {(refund.status || '').toLowerCase() === 'processing' && (
                        <div className="flex gap-2">
                          <button onClick={() => api.approveRefund(refund.id || refund.refund_id)} className="text-xs text-green-600 hover:text-green-800 font-medium">Approve</button>
                          <button onClick={() => api.rejectRefund(refund.id || refund.refund_id)} className="text-xs text-red-600 hover:text-red-800 font-medium">Reject</button>
                        </div>
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
  );
}
