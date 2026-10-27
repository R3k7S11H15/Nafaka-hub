import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Banknote, ArrowUpRight, Landmark } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import ntzs from '../services/ntzs';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const fmtMoney = (v) => {
  if (v == null) return '—';
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return isNaN(n) ? v : fmtMoney(n);
  }
  if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`;
  return `TZS ${Number(v).toLocaleString()}`;
};

const COLORS = ['#2563eb', '#16a34a', '#ca8a04', '#dc2626', '#9333ea', '#0891b2', '#ea580c'];

const STATUS_COLORS = {
  held: '#2563eb',
  released: '#16a34a',
  refunded: '#dc2626',
  pending: '#ca8a04',
  processing: '#0891b2',
  completed: '#16a34a',
  paid: '#16a34a',
  approved: '#16a34a',
  rejected: '#dc2626',
  failed: '#dc2626',
};

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <Icon className={`w-10 h-10 ${color}`} />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-32" />
    </div>
  );
}

export default function FinanceAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [trendDays, setTrendDays] = useState(30);

  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [revenueByType, setRevenueByType] = useState([]);
  const [commissionBreakdown, setCommissionBreakdown] = useState(null);
  const [escrowSummary, setEscrowSummary] = useState(null);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [refundSummary, setRefundSummary] = useState(null);
  const [recentRefunds, setRecentRefunds] = useState([]);
  const [treasuryAccounts, setTreasuryAccounts] = useState(null);
  const [ntzsConfig, setNtzsConfig] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [cashFlow, setCashFlow] = useState([]);
  const [projections, setProjections] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [o, t, rbt, cb, es, ps, rs, pm, ts, cf, proj, rf] = await Promise.all([
          api.getRevenueOverview(),
          api.getFinanceTrend(trendDays),
          api.getTopRevenueSources(),
          api.getCommissionBreakdown(),
          api.getEscrowFees(),
          api.getPayoutSummary(),
          api.getRefundSummary(),
          api.getFinancePaymentMethods(),
          api.getTopSellers(10),
          api.getCashFlow(6),
          api.getRevenueProjections(),
          api.getRefunds(),
        ]);
        if (!mounted) return;
        setOverview(o?.data || o || null);
        setTrend(t?.trend || t?.data?.trend || []);
        setRevenueByType(rbt?.sources || rbt?.data?.sources || []);
        setCommissionBreakdown(cb?.data || cb || null);
        setEscrowSummary(es?.data || es || null);
        setPayoutSummary(ps?.data || ps || null);
        setRefundSummary(rs?.data || rs || null);
        setRecentRefunds(rf?.refunds || rf?.data?.refunds || []);
        setPaymentMethods(pm?.methods || pm?.data?.methods || []);
        setTopSellers(ts?.sellers || ts?.data?.sellers || []);
        setCashFlow(cf?.cash_flow || cf?.data?.cash_flow || []);
        setProjections(proj?.projections || proj?.data?.projections || null);
      } catch (e) {
        if (mounted) setErr(e?.message || 'Failed to load finance data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [trendDays]);

  useEffect(() => {
    let cancelled = false;
    ntzs.getTreasury()
      .then(({ data }) => { if (!cancelled) setTreasuryAccounts(data.accounts || []); })
      .catch(() => { if (!cancelled) setTreasuryAccounts([]); });
    ntzs.getConfigStatus()
      .then(({ data }) => { if (!cancelled) setNtzsConfig(data.config || null); })
      .catch(() => { if (!cancelled) setNtzsConfig(null); });
    return () => { cancelled = true; };
  }, []);

  const reloadTrend = () => {
    setLoading(true);
    setErr('');
    api.getFinanceTrend(trendDays).then(res => {
      setTrend(res?.trend || res?.data?.trend || []);
    }).catch(e => setErr(e?.message || 'Failed to load trend')).finally(() => setLoading(false));
  };

  const totalRevenue = overview?.total_revenue ?? 0;
  const gmv = overview?.gmv ?? 0;
  const commission = overview?.commission_revenue ?? 0;
  const escrowHeld = Number(overview?.escrow?.held || 0);
  const paymentVolume = overview?.payment_volume ?? 0;
  const netRevenue = overview?.net_revenue ?? totalRevenue;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Finance Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Financial monitoring, reports, and analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={trendDays}
              onChange={(e) => { setTrendDays(parseInt(e.target.value)); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button onClick={reloadTrend} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Refresh
            </button>
          </div>
        </div>

        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {err}
          </div>
        )}

        {loading && !overview ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard label="Total Revenue" value={fmtMoney(totalRevenue)} icon={DollarSign} color="text-blue-600" />
            <StatCard label="GMV (Orders)" value={fmtMoney(gmv)} icon={TrendingUp} color="text-green-600" />
            <StatCard label="Commission Revenue" value={fmtMoney(commission)} icon={Banknote} color="text-emerald-600" />
            <StatCard label="Escrow Held" value={fmtMoney(escrowHeld)} icon={CreditCard} color="text-indigo-600" />
            <StatCard label="Payment Volume" value={fmtMoney(paymentVolume)} icon={Landmark} color="text-purple-600" />
            <StatCard label="Net Revenue" value={fmtMoney(netRevenue)} sub={netRevenue !== totalRevenue ? `Gross ${fmtMoney(totalRevenue)}` : ''} icon={ArrowUpRight} color="text-cyan-600" />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue &amp; GMV Trend</h2>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tickFormatter={v => fmtMoney(v)} width={80} />
                  <Tooltip formatter={(v) => [fmtMoney(v), '']} labelFormatter={l => l} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} name="Revenue" />
                  <Area type="monotone" dataKey="commission" stroke="#0891b2" fill="#0891b2" fillOpacity={0.1} name="Commission" />
                  <Area type="monotone" dataKey="gmv" stroke="#16a34a" fill="#16a34a" fillOpacity={0.1} name="GMV" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Type</h2>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByType.length ? revenueByType : [{ type: 'No data', total: 1 }]}
                    dataKey="total"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ type, percentage }) => `${type} ${percentage ? `${percentage}%` : ''}`}
                  >
                    {revenueByType.map((entry, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [fmtMoney(v), 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethods}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="method" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => fmtMoney(v)} width={80} />
                  <Tooltip formatter={(v) => [fmtMoney(v), 'Amount']} />
                  <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} name="Volume" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Commission Breakdown</h2>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={commissionBreakdown?.by_type || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => fmtMoney(v)} width={80} />
                  <Tooltip formatter={(v) => [fmtMoney(v), 'Amount']} />
                  <Bar dataKey="total" fill="#0891b2" radius={[4, 4, 0, 0]} name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {commissionBreakdown?.top_sellers?.length ? (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Top Sellers by Commission</h3>
                <div className="space-y-2">
                  {commissionBreakdown.top_sellers.map(s => (
                    <div key={s.seller_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                        <p className="text-xs text-gray-500">{s.business_name || ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{fmtMoney(s.total)}</p>
                        <p className="text-xs text-gray-500">{s.transactions} txns</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-3">No commission records yet.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Escrow Summary</h2>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={escrowSummary?.by_status || [{ status: 'No data', total: 1, fees: 0, transactions: 0 }]}
                    dataKey="total"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, total }) => `${status} ${fmtMoney(total)}`}
                  >
                    {(escrowSummary?.by_status || []).map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [fmtMoney(v), 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Transactions</p>
                <p className="text-sm font-bold text-gray-900">{escrowSummary?.totals?.count || 0}</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Volume</p>
                <p className="text-sm font-bold text-gray-900">{fmtMoney(escrowSummary?.totals?.total_volume)}</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-xs text-gray-500">Fees</p>
                <p className="text-sm font-bold text-gray-900">{fmtMoney(escrowSummary?.totals?.total_fees)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow (In vs Out)</h2>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => fmtMoney(v)} width={80} />
                  <Tooltip formatter={(v) => [fmtMoney(v), '']} />
                  <Legend />
                  <Bar dataKey="inflow" fill="#16a34a" radius={[4, 4, 0, 0]} name="Inflow" />
                  <Bar dataKey="outflow" fill="#dc2626" radius={[4, 4, 0, 0]} name="Outflow" />
                  <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} name="Net" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Projections</h2>
            {projections ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Avg Daily Revenue</p>
                    <p className="text-sm font-bold text-gray-900">{fmtMoney(projections.avg_daily_revenue)}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Projected Month Revenue</p>
                    <p className="text-sm font-bold text-gray-900">{fmtMoney(projections.projected_month_revenue)}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Revenue Growth</p>
                    <p className={`text-sm font-bold ${projections.revenue_growth_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {projections.revenue_growth_pct >= 0 ? '+' : ''}{projections.revenue_growth_pct}%
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Projected GMV</p>
                    <p className="text-sm font-bold text-gray-900">{fmtMoney(projections.projected_month_gmv)}</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-xs text-blue-700">Based on {projections.days_elapsed} of {projections.days_in_month} days elapsed</p>
                  <p className="text-xs text-blue-600 mt-1">30d actual: {fmtMoney(projections.actual_revenue_30d)} revenue, {fmtMoney(projections.actual_gmv_30d)} GMV, {projections.actual_orders_30d} orders</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No projection data.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Sellers by GMV</h2>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSellers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => fmtMoney(v)} />
                  <YAxis dataKey="full_name" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [fmtMoney(v), 'GMV']} />
                  <Bar dataKey="gmv" fill="#16a34a" radius={[0, 4, 4, 0]} name="GMV" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {topSellers.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">Total tracked GMV: {fmtMoney(topSellers[0]?.total_gmv || topSellers.reduce((s, x) => s + Number(x.gmv || 0), 0))}</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payouts &amp; Refunds Summary</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-yellow-50 rounded p-3">
                <p className="text-xs text-yellow-700">Pending Payouts</p>
                <p className="text-sm font-bold text-yellow-900">{fmtMoney(payoutSummary?.by_status?.filter(s => s.status === 'pending' || s.status === 'processing').reduce((s, x) => s + Number(x.total || 0), 0))}</p>
              </div>
              <div className="bg-green-50 rounded p-3">
                <p className="text-xs text-green-700">Completed Payouts</p>
                <p className="text-sm font-bold text-green-900">{fmtMoney(payoutSummary?.by_status?.filter(s => s.status === 'completed' || s.status === 'paid').reduce((s, x) => s + Number(x.total || 0), 0))}</p>
              </div>
              <div className="bg-red-50 rounded p-3">
                <p className="text-xs text-red-700">Pending Refunds</p>
                <p className="text-sm font-bold text-red-900">{fmtMoney(refundSummary?.by_status?.filter(s => s.status === 'pending' || s.status === 'approved').reduce((s, x) => s + Number(x.total || 0), 0))}</p>
              </div>
              <div className="bg-blue-50 rounded p-3">
                <p className="text-xs text-blue-700">Processed Refunds</p>
                <p className="text-sm font-bold text-blue-900">{fmtMoney(refundSummary?.by_status?.filter(s => s.status === 'processed' || s.status === 'rejected').reduce((s, x) => s + Number(x.total || 0), 0))}</p>
              </div>
            </div>
            {payoutSummary?.monthly?.length ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={payoutSummary.monthly.slice(0, 6).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => fmtMoney(v)} width={80} />
                    <Tooltip formatter={(v) => [fmtMoney(v), 'Amount']} />
                    <Area type="monotone" dataKey="total" stroke="#ca8a04" fill="#ca8a04" fillOpacity={0.2} name="Payouts" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No payout history.</p>
            )}
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Refunds</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          {recentRefunds.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No refund records.</div>
          ) : (
            <div>
              <div className="overflow-x-auto">
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
                  {recentRefunds.slice(0, 10).map((refund) => (
                    <tr key={refund.id || refund.refund_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{refund.id || refund.refund_id || '—'}</td>
                      <td className="px-6 py-3 text-sm text-blue-600">{refund.order || refund.order_id || refund.order_number || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-900">{refund.customer || refund.customer_name || refund.full_name || '—'}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{refund.vendor || refund.vendor_name || '—'}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">{fmtMoney(refund.amount)}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{refund.reason || refund.reason_code || '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (refund.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          (refund.status || '').toLowerCase() === 'processing' ? 'bg-blue-100 text-blue-800' :
                          (refund.status || '').toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                          (refund.status || '').toLowerCase() === 'completed' ? 'bg-green-100 text-green-800' :
                          (refund.status || '').toLowerCase() === 'processed' ? 'bg-green-100 text-green-800' :
                          (refund.status || '').toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'}`}>
                          {refund.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{refund.requested_on || refund.requestedOn || refund.created_at ? new Date(refund.requested_on || refund.requestedOn || refund.created_at).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-3">
                        <NavLink to="/finance/refunds" className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</NavLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-100">
              <NavLink to="/finance/refunds" className="text-sm text-blue-600 hover:text-blue-800 font-medium">View all refunds →</NavLink>
            </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <NavLink to="/finance/transactions" className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Transactions</span>
            </NavLink>
            <NavLink to="/finance/payouts" className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <CreditCard className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Payouts</span>
            </NavLink>
            <NavLink to="/finance/invoices" className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Invoices</span>
            </NavLink>
            <NavLink to="/finance/statements" className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <TrendingDown className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Statements</span>
            </NavLink>
            <NavLink to="/finance/ntzs" className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
              <Banknote className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-gray-700">nTZS Treasury</span>
            </NavLink>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">nTZS Treasury</h2>
            <NavLink to="/finance/ntzs" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Open console →</NavLink>
          </div>
          {treasuryAccounts === null ? (
            <div className="text-sm text-gray-500">Loading treasury…</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {treasuryAccounts.map((account) => (
                  <div key={account.id} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-500">{account.label || 'Treasury'}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{fmtMoney(account.balanceTzs)}</p>
                    <dl className="mt-2 space-y-1 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <dt>Available</dt>
                        <dd className="font-medium text-gray-700">{fmtMoney(account.availableTzs)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>In flight</dt>
                        <dd>{fmtMoney(account.reservedTzs)}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
                {treasuryAccounts.length === 0 && (
                  <div className="col-span-full text-sm text-gray-500">No treasury account yet — created on first collection or payout.</div>
                )}
              </div>
              {ntzsConfig && ntzsConfig.issues && ntzsConfig.issues.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-900 mb-1">Configuration issues</p>
                  <ul className="space-y-1 text-xs text-amber-800">
                    {ntzsConfig.issues.slice(0, 3).map((issue) => (
                      <li key={issue.code}>• {issue.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {ntzsConfig && ntzsConfig.issues && ntzsConfig.issues.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  nTZS integration configured
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
