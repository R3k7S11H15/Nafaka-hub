import { useState, useEffect } from 'react';
import { Shield, Users, Lock, Activity, AlertTriangle, Key, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function AdminPanelPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getAdminUsers({ role: 'admin' });
        if (!mounted) return;
        setAdmins(res?.data || res?.users || res || []);
      } catch {
        if (mounted) setAdmins([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const stats = [
    { label: 'Admin Accounts', value: admins.length, icon: Shield },
    { label: 'Active Sessions', value: '—', icon: Activity },
    { label: 'Failed Logins (24h)', value: '—', icon: AlertTriangle },
    { label: 'API Keys', value: '—', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" /> Admin Panel
          </h1>
          <p className="text-gray-600 mt-2">Manage administrators, sessions, and system access</p>
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

        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Administrators</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center gap-2">
              <Users className="w-4 h-4" /> Add Admin
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading admins...
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No administrators found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MFA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((a) => (
                  <tr key={a.id || a.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600">{a.id || a.user_id || '—'}</div>
                      <div className="text-sm text-gray-900">{a.name || a.full_name || '—'}</div>
                      <div className="text-xs text-gray-500">{a.email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{a.role || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${a.mfa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {a.mfa ? '✓ Enabled' : '✗ Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{a.last_login || a.lastLogin || a.updated_at || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(a.status || '').toLowerCase() === 'active' || a.status === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {typeof a.status === 'boolean' ? (a.status ? 'Active' : 'Suspended') : (a.status || '—')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-500" /> API Keys
            </h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center gap-2">
              <Lock className="w-4 h-4" /> Generate Key
            </button>
          </div>
          <div className="p-12 text-center text-gray-500">API keys are managed in environment configuration.</div>
        </div>
      </div>
    </div>
  );
}
