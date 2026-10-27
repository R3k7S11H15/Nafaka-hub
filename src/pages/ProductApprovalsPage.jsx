import { useState, useEffect } from 'react';
import { ClipboardCheck, Package, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Pending: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function ProductApprovalsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getProducts({ status: 'pending' });
        if (!mounted) return;
        const all = Array.isArray(res?.products) ? res.products : Array.isArray(res?.data?.products) ? res.data.products : Array.isArray(res) ? res : []
        setProducts(all);
      } catch {
        if (!mounted) return;
        try {
          const res = await api.getProducts();
          if (!mounted) return;
          setProducts(Array.isArray(res?.products) ? res.products : Array.isArray(res?.data?.products) ? res.data.products : Array.isArray(res) ? res : []);
        } catch {
          if (mounted) setProducts([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const pendingCount = products.filter(p => (p.status || '').toLowerCase() === 'pending').length;
  const approvedCount = products.filter(p => (p.status || '').toLowerCase() === 'approved' || (p.status || '').toLowerCase() === 'active').length;
  const rejectedCount = products.filter(p => (p.status || '').toLowerCase() === 'rejected').length;

  const stats = [
    { label: 'Pending Approval', value: pendingCount, icon: Clock },
    { label: 'Approved', value: approvedCount, icon: CheckCircle2 },
    { label: 'Rejected', value: rejectedCount, icon: XCircle },
    { label: 'Total', value: products.length, icon: Package },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-8 h-8 text-blue-600" /> Product Approvals
            </h1>
            <p className="text-gray-600 mt-2">Review and approve vendor product listings</p>
          </div>
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            Approve Selected
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
            <h2 className="text-lg font-semibold text-gray-900">Product Review Queue</h2>
            <div className="flex gap-2">
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Status</option>
                <option>Pending</option>
                <option>Approved</option>
                <option>Rejected</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No products to review.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                       <input type="checkbox" checked={!!selected[p.id || p.product_id]} onChange={(e) => {
                        const id = p.id || p.product_id
                        const newSel = { ...selected }
                        if (e.target.checked) newSel[id] = true
                        else delete newSel[id]
                        setSelected(newSel)
                      }} className="rounded" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((p) => (
                  <tr key={p.id || p.product_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                    <input type="checkbox" checked={Object.keys(selected).length === products.length} onChange={(e) => {
                      const checked = e.target.checked
                      if (checked) {
                        const all = {}
                        products.forEach(p => { all[p.id || p.product_id] = true })
                        setSelected(all)
                      } else {
                        setSelected({})
                      }
                    }} className="rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-blue-600">{p.sku || p.id || p.product_id || '—'}</div>
                      <div className="text-sm text-gray-900">{p.name || p.title || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{p.vendor || p.vendor_name || p.seller_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.category || p.category_name || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{p.price || (p.price_per_kg ? `TZS ${p.price_per_kg}/kg` : '—')}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{p.stock || p.stock_quantity || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                    <td className="px-6 py-4">
                      {(p.status || '').toLowerCase() === 'pending' && (
                        <div className="flex gap-2">
                          <button className="text-xs text-green-600 hover:text-green-800 font-medium">Approve</button>
                          <button className="text-xs text-red-600 hover:text-red-800 font-medium">Reject</button>
                        </div>
                      )}
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
