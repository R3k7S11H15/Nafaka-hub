import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Open: 'bg-yellow-100 text-yellow-800',
    open: 'bg-yellow-100 text-yellow-800',
    Investigating: 'bg-blue-100 text-blue-800',
    investigating: 'bg-blue-100 text-blue-800',
    Resolved: 'bg-green-100 text-green-800',
    resolved: 'bg-green-100 text-green-800',
    Dismissed: 'bg-gray-100 text-gray-800',
    dismissed: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    Critical: 'bg-red-100 text-red-800',
    critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    high: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-gray-100 text-gray-800',
    low: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[severity] || 'bg-gray-100 text-gray-800'}`}>
      {severity}
    </span>
  );
}

export default function ReportedProductsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getReportedProducts();
        if (!mounted) return;
        setReports(Array.isArray(res?.data) ? res.data : Array.isArray(res?.reports) ? res.reports : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setReports([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const openCount = reports.filter(r => (r.status || '').toLowerCase() === 'open').length;
  const resolvedCount = reports.filter(r => (r.status || '').toLowerCase() === 'resolved').length;
  const criticalCount = reports.filter(r => (r.severity || '').toLowerCase() === 'critical').length;

  const stats = [
    { label: 'Open Reports', value: openCount, icon: AlertTriangle },
    { label: 'Resolved', value: resolvedCount, icon: CheckCircle2 },
    { label: 'Critical', value: criticalCount, icon: Shield },
    { label: 'Total', value: reports.length, icon: Eye },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-red-500" /> Reported Products
            </h1>
            <p className="text-gray-600 mt-2">Investigate and resolve product complaints</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Export Reports
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

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Reports</h2>
            <div className="flex gap-2">
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Status</option>
                <option>Open</option>
                <option>Investigating</option>
                <option>Resolved</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Severity</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading reports...
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No reports found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((r) => (
                  <tr key={r.id || r.report_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{r.id || r.report_id || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-blue-600">{r.product_id || r.product_code || '—'}</div>
                      <div className="text-sm text-gray-900">{r.product_name || r.productName || r.product || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{r.vendor || r.vendor_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">{r.reason || r.description || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{r.reporter || r.reporter_email || r.reported_by || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{r.reported || r.created_at || r.reported_at || '—'}</td>
                    <td className="px-6 py-4"><SeverityBadge severity={r.severity} /></td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Review
                        </button>
                        <button className="text-xs text-gray-600 hover:text-gray-800 font-medium inline-flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Contact
                        </button>
                      </div>
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
