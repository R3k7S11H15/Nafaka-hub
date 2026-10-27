import { useState, useEffect } from 'react';
import { Warehouse, Package, BarChart3, AlertTriangle, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function WarehouseManagerDashboard() {
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [inv, mov] = await Promise.all([
          api.getInventory(),
          api.getInventoryMovements(),
        ]);
        if (!mounted) return;
        setInventory((inv?.inventory || inv?.data?.inventory || inv?.items || []));
        setMovements((mov?.movements || mov?.data?.movements || []));
      } catch {
        if (mounted) {
          setInventory([]);
          setMovements([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const totalCapacity = inventory.reduce((s, i) => s + Number(i.capacity || 0), 0);
  const totalUsed = inventory.reduce((s, i) => s + Number(i.stock || i.quantity || 0), 0);
  const utilizationPct = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;
  const lowStockCount = inventory.filter(i => (i.status || '').toLowerCase().includes('low') || Number(i.stock || 0) === 0).length;

  const warehouseStats = [
    { label: 'Total Items', value: inventory.length, icon: Warehouse },
    { label: 'Total Stock', value: totalUsed.toLocaleString(), icon: Package },
    { label: 'Utilization', value: totalCapacity > 0 ? `${utilizationPct}%` : '—', icon: BarChart3 },
    { label: 'Low Stock Alerts', value: lowStockCount, icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Warehouse Manager Dashboard</h1>
          <p className="text-gray-600 mt-2">Inventory and storage management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {warehouseStats.map((stat) => {
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

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Status</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading inventory...
            </div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No inventory data.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.slice(0, 20).map((item) => (
                  <tr key={item.id || item.item_id || item.sku}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.warehouse || item.warehouse_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.name || item.item_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.stock || item.quantity || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(item.status || '').toLowerCase().includes('low') || Number(item.stock || 0) === 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {item.status || (Number(item.stock || 0) === 0 ? 'Critical' : 'Good')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Movements</h2>
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <Loader2 className="animate-spin w-5 h-5 mr-2" /> Loading...
            </div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No recent movements.</div>
          ) : (
            <div className="space-y-4">
              {movements.slice(0, 10).map((movement, idx) => {
                const isIn = (movement.type || '').toLowerCase() === 'inward' || (movement.type || '').toLowerCase() === 'in';
                return (
                  <div key={movement.id || movement.movement_id || idx} className="flex items-center">
                    <div className={`p-2 rounded-lg mr-4 ${isIn ? 'bg-green-100' : 'bg-orange-100'}`}>
                      {isIn ? <ArrowDown className="w-5 h-5 text-green-600" /> : <ArrowUp className="w-5 h-5 text-orange-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{movement.item || movement.item_name || '—'} - {movement.quantity || '—'}</p>
                      <p className="text-sm text-gray-500">{movement.warehouse || movement.warehouse_name || '—'}</p>
                    </div>
                    <span className="text-sm text-gray-400">{movement.date || movement.created_at || '—'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
