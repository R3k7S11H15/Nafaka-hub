import { useState, useEffect } from 'react';
import { Users, Shield, Settings, Activity, UserCheck, Ban, Edit, Trash2, Globe, FileText, Loader2 } from 'lucide-react';
import { ROLE_LIST } from '../config/roles';
import api from '../services/api';

const iconMap = { Shield, Settings, Users, Activity, UserCheck, Globe, FileText, Ban };

const adminRoles = ROLE_LIST.map((r) => ({
  role: r.label,
  permissions: r.permissions,
  icon: iconMap[r.icon] || Settings,
}));

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    registrations: true,
    emailNotifications: true,
    maintenanceMode: false,
    twoFactor: true,
    sessionTimeout: '30 minutes',
    ipWhitelist: false,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [usersRes, logsRes, customersRes] = await Promise.all([
          api.getAdminUsers(),
          api.getAuditLogs(),
          api.getAdminCustomers().catch(() => null),
        ]);
        if (!mounted) return;
        setUsers((usersRes?.users || usersRes?.data?.users || []));
        const logs = (logsRes?.data || logsRes?.logs || logsRes || [])
        setActivities(Array.isArray(logs) ? logs.slice(0, 10).map((l) => ({
          action: l.action || l.event || 'Activity',
          user: l.user || l.user_name || l.user_id || 'System',
          time: l.created_at || l.timestamp || l.time || '—',
          icon: iconMap[l.type] || Activity,
        })) : [])
        if (customersRes) {
          const all = [...(usersRes?.users || usersRes?.data?.users || []), ...(customersRes?.data?.customers || customersRes?.customers || customersRes || [])]
          setUsers(all)
        }
      } catch {
        if (mounted) {
          setUsers([])
          setActivities([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })();
    return () => { mounted = false };
  }, []);

  const platformStats = [
    { label: 'Total Users', value: users.length > 0 ? users.length.toLocaleString() : '—', icon: Users },
    { label: 'Active Listings', value: '—', icon: Activity },
    { label: 'Daily Transactions', value: '—', icon: FileText },
    { label: 'Revenue', value: '—', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Platform management and oversight</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {platformStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <Icon className="w-10 h-10 text-blue-500" />
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Roles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {adminRoles.map((item) => {
            const Icon = item.icon;
            const staffCount = users.filter(u => (u.role || '').toLowerCase() === (item.role || '').toLowerCase()).length;
            return (
              <div key={item.role} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{item.role}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">{item.permissions}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{staffCount} staff assigned</span>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No users found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id || user.user_id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name || user.full_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.role || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(user.status || '').toLowerCase() === 'active' || user.status === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {typeof user.status === 'boolean' ? (user.status ? 'Active' : 'Inactive') : (user.status || '—')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{user.lastLogin || user.last_login || user.updated_at || '—'}</td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800"><Edit className="w-4 h-4" /></button>
                      <button className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4" /></button>
                      <button className="text-gray-600 hover:text-gray-800"><Ban className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h2>
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading activity...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No recent activity.</div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity, i) => {
                const Icon = activity.icon;
                return (
                  <div key={i} className="flex items-start">
                    <div className="p-2 bg-gray-100 rounded-lg mr-4">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-500">by {activity.user}</p>
                    </div>
                    <span className="text-sm text-gray-400">{activity.time}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Settings</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Platform Configuration</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Enable New Registrations</span>
                  <input type="checkbox" checked={settings.registrations} onChange={(e) => setSettings({ ...settings, registrations: e.target.checked })} className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Email Notifications</span>
                  <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })} className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Maintenance Mode</span>
                  <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })} className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Security Settings</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Two-Factor Authentication</span>
                  <input type="checkbox" checked={settings.twoFactor} onChange={(e) => setSettings({ ...settings, twoFactor: e.target.checked })} className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Session Timeout</span>
                  <select value={settings.sessionTimeout} onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })} className="text-sm border border-gray-300 rounded px-2 py-1">
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>2 hours</option>
                  </select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">IP Whitelist</span>
                  <input type="checkbox" checked={settings.ipWhitelist} onChange={(e) => setSettings({ ...settings, ipWhitelist: e.target.checked })} className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
