import { useState, useEffect } from 'react';
import { Shield, AlertCircle, Calendar, MessageSquare, Loader2 } from 'lucide-react';
import api from '../services/api';

function DurationBadge({ duration }) {
  const styles = {
    'Indefinite': 'bg-red-100 text-red-800',
    'indefinite': 'bg-red-100 text-red-800',
  };
  const color = styles[duration] || 'bg-yellow-100 text-yellow-800';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {duration}
    </span>
  );
}

export default function SuspendedVendorsPage() {
  const [suspended, setSuspended] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getSuspendedVendors();
        if (!mounted) return;
        setSuspended(Array.isArray(res?.data) ? res.data : Array.isArray(res?.vendors) ? res.vendors : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setSuspended([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const totalReports = suspended.reduce((s, v) => s + Number(v.reports || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-red-500" /> Suspended Vendors
          </h1>
          <p className="text-gray-600 mt-2">Vendors currently blocked from selling on the platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Currently Suspended</p>
                <p className="text-2xl font-bold text-red-600">{suspended.length}</p>
              </div>
              <Shield className="w-10 h-10 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Reports</p>
                <p className="text-2xl font-bold text-yellow-600">{totalReports}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Suspension</p>
                <p className="text-2xl font-bold text-gray-900">—</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Suspension List</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading vendors...
            </div>
          ) : suspended.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No suspended vendors.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reports</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suspended On</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suspended.map((v) => (
                  <tr key={v.id || v.vendor_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{v.id || v.vendor_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{v.name || v.full_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{v.business || v.business_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{v.region || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">{v.reason || v.suspension_reason || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                        <AlertCircle className="w-3 h-3" /> {v.reports || v.report_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{v.suspendedOn || v.suspended_on || v.suspended_at || '—'}</td>
                    <td className="px-6 py-4"><DurationBadge duration={v.duration} /></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Review
                        </button>
                        <button className="text-xs text-green-600 hover:text-green-800 font-medium">Reinstate</button>
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
