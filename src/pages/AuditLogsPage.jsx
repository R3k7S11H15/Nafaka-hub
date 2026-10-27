import { useState, useEffect } from 'react';
import { ClipboardCheck, User, Activity, AlertCircle, Eye, Loader2 } from 'lucide-react';
import api from '../services/api';

function SeverityBadge({ severity }) {
  const styles = {
    Info: 'bg-blue-100 text-blue-800',
    info: 'bg-blue-100 text-blue-800',
    Warning: 'bg-yellow-100 text-yellow-800',
    warning: 'bg-yellow-100 text-yellow-800',
    Critical: 'bg-red-100 text-red-800',
    critical: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[severity] || 'bg-gray-100 text-gray-800'}`}>
      {severity}
    </span>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getAuditLogs();
        if (!mounted) return;
        setLogs(Array.isArray(res?.data) ? res.data : Array.isArray(res?.logs) ? res.logs : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setLogs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const uniqueActors = new Set(logs.map(l => l.actor || l.user || l.user_email || l.user_id)).size;
  const criticalCount = logs.filter(l => (l.severity || '').toLowerCase() === 'critical' || (l.severity || '').toLowerCase() === 'warning').length;

  const stats = [
    { label: 'Total Events', value: logs.length, icon: Activity },
    { label: 'Unique Actors', value: uniqueActors, icon: User },
    { label: 'Flagged', value: criticalCount, icon: AlertCircle },
    { label: 'Today', value: '—', icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-8 h-8 text-blue-600" /> Audit Logs
            </h1>
            <p className="text-gray-600 mt-2">System-wide event log and security trail</p>
          </div>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Export Logs
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
            <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
            <div className="flex gap-2">
              <input type="search" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Severities</option>
                <option>Info</option>
                <option>Warning</option>
                <option>Critical</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No log entries found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, idx) => (
                  <tr key={log.id || `log-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{log.timestamp || log.created_at || log.time || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.actor || log.user || log.user_email || '—'}</div>
                      <div className="text-xs text-gray-500">{log.role || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.action || log.event || '—'}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 font-mono">{log.target || log.entity || log.entity_id || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{log.ip || log.ip_address || '—'}</td>
                    <td className="px-6 py-4"><SeverityBadge severity={log.severity || log.level} /></td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Details
                      </button>
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
