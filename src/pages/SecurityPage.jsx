import { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle2, XCircle, Smartphone, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../services/api';

const settings = [
  { label: 'Two-Factor Authentication', desc: 'Require 2FA for all admin accounts', enabled: true },
  { label: 'IP Allowlist', desc: 'Restrict admin access to known IP ranges', enabled: true },
  { label: 'Session Timeout (30 min)', desc: 'Auto-logout idle admins', enabled: true },
  { label: 'Password Rotation (90 days)', desc: 'Force periodic password changes', enabled: false },
  { label: 'Brute-force Protection', desc: 'Lock accounts after 5 failed attempts', enabled: true },
  { label: 'Audit Log Retention (1 year)', desc: 'Keep audit logs for compliance', enabled: true },
];

export default function SecurityPage() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getAuditLogs();
        if (!mounted) return;
        const logs = res?.data || res?.logs || res || [];
        const mapped = logs.map((l, idx) => ({
          id: l.id || `T-${String(idx + 1).padStart(3, '0')}`,
          type: l.action || l.event_type || l.type || 'Event',
          source: l.ip_address || l.source || 'unknown',
          count: l.count || l.attempts || 1,
          blocked: l.status === 'blocked' || l.blocked === true,
          time: l.created_at || l.timestamp || l.time || '—',
        }));
        setThreats(mapped);
      } catch {
        if (mounted) setThreats([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" /> Security
          </h1>
          <p className="text-gray-600 mt-2">Platform security policies and threat monitoring</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" /> Security Policies
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {settings.map((s) => (
                <div key={s.label} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                      {s.enabled ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {s.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ backgroundColor: s.enabled ? '#16a34a' : '#d1d5db' }}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${s.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-500" /> Authentication
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mt-1">All admin accounts require 2FA. SMS and TOTP supported.</p>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">Configure</button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900">Single Sign-On (SSO)</h3>
                <p className="text-sm text-gray-500 mt-1">Currently disabled. SAML/OIDC available.</p>
                <button className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium">Enable SSO</button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900">Active Sessions</h3>
                <p className="text-sm text-gray-500 mt-1">View active admin sessions.</p>
                <button className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium">Terminate All</button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Recent Threats
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View All</button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading audit logs...
            </div>
          ) : threats.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No recent security threats detected.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Threat ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detected</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {threats.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{t.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">{t.source}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{t.count}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.blocked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {t.blocked ? 'Blocked' : 'Investigating'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{t.time}</td>
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
