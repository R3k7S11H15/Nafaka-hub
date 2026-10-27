import { useState, useEffect } from 'react'
import { Package, RefreshCw, Loader2, Warehouse, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseInventory() {
  const toast = useToast()
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  const loadInventory = async () => {
    try {
      const data = await api.getMyWarehouseInventory()
      if (data.success) setInventory(data.inventory || [])
    } catch {
      setInventory([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadInventory() }, [])
  useEffect(() => { const i = setInterval(loadInventory, 30000); return () => clearInterval(i) }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Warehouse Inventory</h1>
          <p className="text-gray-600 mt-1">Current stock levels across your warehouses</p>
        </div>
        <button onClick={loadInventory} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {inventory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No inventory data yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Threshold</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.product_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.warehouse_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.quantity || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.min_threshold || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        (item.status || '').toLowerCase().includes('low') || Number(item.quantity || 0) === 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {item.status || (Number(item.quantity || 0) === 0 ? 'Critical' : 'Good')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.last_updated ? new Date(item.last_updated).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
