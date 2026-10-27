import { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Mail, Phone, Shield, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-green-100 text-green-800',
    Suspended: 'bg-red-100 text-red-800',
    Pending: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getAdminUsers();
        if (!mounted) return;
        setUsers(res?.data || res?.users || res || []);
      } catch {
        if (mounted) setUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const stats = [
    { label: 'Total Users', value: users.length > 0 ? users.length.toLocaleString() : '—', icon: Users },
    { label: 'Active Today', value: '—', icon: Users },
    { label: 'New This Week', value: '—', icon: UserPlus },
    { label: 'Admins', value: users.filter(u => (u.role || '').toLowerCase() === 'admin').length.toString(), icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">All registered users across the platform</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Invite User
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
            <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="search" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Roles</option>
                <option>Customer</option>
                <option>Seller</option>
                <option>Vendor</option>
                <option>Driver</option>
                <option>Admin</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Status</option>
                <option>Active</option>
                <option>Suspended</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id || u.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600">{u.id || u.user_id || '—'}</div>
                      <div className="text-sm text-gray-900">{u.name || u.full_name || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-gray-700 inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email || '—'}</div>
                      <div className="text-gray-500 text-xs inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">{u.role || '—'}</span>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={u.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.joined || u.created_at || u.registration_date || '—'}</td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Manage</button>
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
