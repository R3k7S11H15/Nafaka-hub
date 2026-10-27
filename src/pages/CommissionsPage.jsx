import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Percent, Loader2, Download } from 'lucide-react';
import api from '../services/api';

const fmtMoney = (v) => {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`;
  return `TZS ${v.toLocaleString()}`;
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [c, s] = await Promise.all([
          api.getMyVendorCommissions({ limit: 1000 }),
          api.getMyVendorCommissionSummary(),
        ]);
        if (!mounted) return;
        setCommissions(Array.isArray(c?.data) ? c.data : Array.isArray(c?.commissions) ? c.commissions : Array.isArray(c) ? c : []);
        setSummary(s?.data || s || null);
      } catch {
        if (mounted) setCommissions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const total = commissions.reduce((s, c) => s + Number(c.commission || c.amount || 0), 0);
  const rates = commissions.map(c => Number(c.rate || 0)).filter(r => r > 0);
  const avgRate = rates.length > 0 ? (rates.reduce((a, b) => a + b, 0) / rates.length) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Commissions</h1>
              <p className="text-gray-600 mt-2">Platform commission earnings and rate tiers</p>
            </div>
            <button onClick={() => api.exportCommissions()} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900">{fmtMoney(summary?.total_commission ?? total)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{fmtMoney(summary?.month_commission)}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Rate</p>
                <p className="text-2xl font-bold text-gray-900">{avgRate > 0 ? `${avgRate.toFixed(1)}%` : '—'}</p>
              </div>
              <Percent className="w-10 h-10 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Commissions</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading commissions...
            </div>
          ) : commissions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No commission records.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {commissions.map((c) => (
                  <tr key={c.id || c.commission_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{c.id || c.commission_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-blue-600">{c.order || c.order_id || c.order_number || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{c.vendor || c.seller_name || c.seller_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{fmtMoney(c.order_total ?? c.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{c.rate ? `${c.rate}%` : '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">{fmtMoney(c.commission ?? c.amount)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.date || c.created_at || '—'}</td>
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
