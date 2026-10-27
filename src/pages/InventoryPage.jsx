import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, Box, Loader2 } from 'lucide-react';
import api from '../services/api';

function statusStyle(status) {
  const s = (status || '').toLowerCase();
  if (s === 'in stock' || s === 'in_stock' || s === 'active') return 'bg-green-100 text-green-800';
  if (s === 'low stock' || s === 'low_stock' || s === 'low') return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

const fmtMoney = (v) => {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  return `TZS ${(Number(v) / 1_000_000).toFixed(1)}M`;
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getInventory();
        if (!mounted) return;
        setInventory(Array.isArray(res?.data) ? res.data : Array.isArray(res?.inventory) ? res.inventory : Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []);
      } catch {
        if (mounted) setInventory([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const inStockCount = inventory.filter(i => (i.status || '').toLowerCase() === 'in stock' || Number(i.stock || 0) > 0).length;
  const lowStockCount = inventory.filter(i => (i.status || '').toLowerCase().includes('low')).length;

  const stats = [
    { label: 'Total SKUs', value: inventory.length, icon: Box },
    { label: 'In Stock', value: inStockCount, icon: Package },
    { label: 'Low Stock', value: lowStockCount, icon: AlertTriangle },
    { label: 'Stock Value', value: '—', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-2">Stock levels across all warehouses</p>
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
            <h2 className="text-lg font-semibold text-gray-900">Stock Levels</h2>
            <div className="flex gap-2">
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Warehouses</option>
              </select>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                Add Item
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading inventory...
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No inventory items.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((item) => {
                  const stock = Number(item.stock || item.quantity || 0);
                  const capacity = Number(item.capacity || 0);
                  const pct = capacity ? Math.round((stock / capacity) * 100) : 0;
                  const bar = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500';
                  return (
                    <tr key={item.sku || item.id || item.item_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{item.sku || item.id || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.name || item.item_name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.warehouse || item.warehouse_name || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.category || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{stock.toLocaleString()} {item.unit || 'kg'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-24">
                            <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle(item.status)}`}>
                          {item.status || (stock === 0 ? 'Out of Stock' : (pct < 20 ? 'Low Stock' : 'In Stock'))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
