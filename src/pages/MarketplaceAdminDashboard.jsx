import { useState, useEffect } from 'react';
import { Settings, Package, Users, Clock, Shield, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function MarketplaceAdminDashboard() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [u, r, p] = await Promise.all([
          api.getAdminUsers({ role: 'vendor' }).catch(() => null),
          api.getReportedProducts(),
          api.getProducts({ status: 'pending' }).catch(() => api.getProducts()),
        ]);
        if (!mounted) return;
        setUsers((u?.users || u?.data?.users || []));
        setReports((r?.reports || r?.data?.reports || []));
        setProducts((p?.products || p?.data?.products || []));
      } catch {
        if (mounted) {
          setUsers([]);
          setReports([]);
          setProducts([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const marketplaceStats = [
    { label: 'Total Products', value: products.length, icon: Package },
    { label: 'Active Sellers', value: users.filter(u => (u.status || '').toString().toLowerCase() === 'active' || u.status === true).length, icon: Users },
    { label: 'Pending Approvals', value: products.filter(p => (p.status || '').toLowerCase() === 'pending').length, icon: Clock },
    { label: 'Reported Products', value: reports.length, icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Marketplace Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Product and listing management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {marketplaceStats.map((stat) => {
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

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Product Approvals</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No products pending review.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.slice(0, 20).map((product) => (
                  <tr key={product.id || product.product_id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name || product.title || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.vendor || product.vendor_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.category || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{product.created_at || product.submitted || '—'}</td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button className="text-green-600 hover:text-green-800"><CheckCircle className="w-4 h-4" /></button>
                      <button className="text-red-600 hover:text-red-800"><XCircle className="w-4 h-4" /></button>
                      <button className="text-blue-600 hover:text-blue-800"><FileText className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reported Products</h2>
            <div className="bg-white rounded-lg shadow p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading...
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No reported products.</div>
              ) : (
                <div className="space-y-4">
                  {reports.slice(0, 10).map((item, idx) => (
                    <div key={item.id || idx} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900">{item.product_name || item.product || 'Product'}</p>
                        <span className="text-xs text-red-600 font-medium">{item.reports ?? item.report_count ?? 0} reports</span>
                      </div>
                      <p className="text-xs text-gray-600">Vendor: {item.vendor || item.vendor_name || '—'}</p>
                      <p className="text-xs text-gray-500">Reason: {item.reason || item.description || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories Overview</h2>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8 text-gray-500">No category analytics available.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
