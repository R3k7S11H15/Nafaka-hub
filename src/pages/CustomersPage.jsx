import { useState, useEffect } from 'react';
import { Users, Mail, Phone, ShoppingBag, DollarSign, Search, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const isActive = (status || '').toString().toLowerCase() === 'active' || status === true;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
      {typeof status === 'boolean' ? (status ? 'Active' : 'Inactive') : (status || '—')}
    </span>
  );
}

const fmtSpent = (v) => {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `TZS ${(v / 1_000).toFixed(0)}K`;
  return `TZS ${v}`;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getAdminCustomers();
        if (!mounted) return;
        setCustomers(Array.isArray(res?.data) ? res.data : Array.isArray(res?.customers) ? res.customers : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setCustomers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const stats = [
    { label: 'Total Customers', value: customers.length > 0 ? customers.length.toLocaleString() : '—', icon: Users },
    { label: 'Repeat Buyers', value: customers.filter(c => (c.orders || c.total_orders || 0) > 1).length.toLocaleString(), icon: ShoppingBag },
    { label: 'Revenue / Customer', value: '—', icon: DollarSign },
    { label: 'New This Month', value: '—', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-500" /> Customers
            </h1>
            <p className="text-gray-600 mt-2">Customers who have purchased from your store</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Export List
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
            <h2 className="text-lg font-semibold text-gray-900">Customer List</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="search" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading customers...
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No customers found.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((c) => (
                  <tr key={c.id || c.customer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600">{c.id || c.customer_id || '—'}</div>
                      <div className="text-sm text-gray-900">{c.name || c.full_name || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-gray-700 inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email || '—'}</div>
                      <div className="text-gray-500 text-xs inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{c.orders ?? c.total_orders ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{fmtSpent(c.spent ?? c.total_spent)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{c.lastOrder || c.last_order || c.updated_at || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-6 py-4">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">View</button>
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
