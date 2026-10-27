import { useState, useEffect } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

function StatusBadge({ status }) {
  const styles = {
    Completed: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-yellow-100 text-yellow-800',
    'In Transit': 'bg-blue-100 text-blue-800',
    in_transit: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function InwardOutwardPage() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState({ inward: false, outward: false });
  const toast = useToast();
  const [inwardForm, setInwardForm] = useState({ po_number: '', item_name: '', quantity: '', warehouse: '', supplier: '' });
  const [outwardForm, setOutwardForm] = useState({ order_number: '', item_name: '', quantity: '', warehouse: '', customer: '' });
  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.getInventoryMovements();
        if (!mounted) return;
        setMovements(res?.data || res?.movements || res || []);
       } catch {
        if (mounted) setMovements([]);
      }
      try {
        const whRes = await api.getWarehouses();
        if (mounted) setWarehouses(whRes?.data || whRes?.warehouses || []);
      } catch {
        if (mounted) setWarehouses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const handleSubmitInward = async (e) => {
    e.preventDefault()
    setSubmitting(s => ({ ...s, inward: true }))
    try {
      const res = await api.request('/content/inventory/movements', {
        method: 'POST',
        body: { ...inwardForm, type: 'inward', csrf_token: await api.getCSRFToken()?.then(t => t?.csrf_token || '') },
      })
      if (res?.success) {
        toast.success('Inward recorded')
        setInwardForm({ po_number: '', item_name: '', quantity: '', warehouse: '', supplier: '' })
        const refreshed = await api.getInventoryMovements()
        setMovements(refreshed?.data || refreshed?.movements || refreshed || [])
      } else {
        toast.error(res?.message || 'Failed to record inward')
      }
    } catch {
      toast.error('Failed to record inward')
    } finally {
      setSubmitting(s => ({ ...s, inward: false }))
    }
  }

  const handleSubmitOutward = async (e) => {
    e.preventDefault()
    setSubmitting(s => ({ ...s, outward: true }))
    try {
      const res = await api.request('/content/inventory/movements', {
        method: 'POST',
        body: { ...outwardForm, type: 'outward', csrf_token: await api.getCSRFToken()?.then(t => t?.csrf_token || '') },
      })
      if (res?.success) {
        toast.success('Outward recorded')
        setOutwardForm({ order_number: '', item_name: '', quantity: '', warehouse: '', customer: '' })
        const refreshed = await api.getInventoryMovements()
        setMovements(refreshed?.data || refreshed?.movements || refreshed || [])
      } else {
        toast.error(res?.message || 'Failed to record outward')
      }
    } catch {
      toast.error('Failed to record outward')
    } finally {
      setSubmitting(s => ({ ...s, outward: false }))
    }
  }

  const inward = movements.filter(m => (m.type || '').toLowerCase() === 'inward' || (m.type || '').toLowerCase() === 'in');
  const outward = movements.filter(m => (m.type || '').toLowerCase() === 'outward' || (m.type || '').toLowerCase() === 'out');
  const completed = movements.filter(m => (m.status || '').toLowerCase() === 'completed').length;
  const pending = movements.filter(m => (m.status || '').toLowerCase() === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inward / Outward</h1>
          <p className="text-gray-600 mt-2">Stock movements in and out of warehouses</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inward</p>
              <p className="text-2xl font-bold text-gray-900">{inward.length}</p>
            </div>
            <ArrowDownToLine className="w-10 h-10 text-green-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Outward</p>
              <p className="text-2xl font-bold text-gray-900">{outward.length}</p>
            </div>
            <ArrowUpFromLine className="w-10 h-10 text-blue-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completed}</p>
            </div>
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <div className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pending}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-green-500" /> Record Inward
            </h2>
            <form className="space-y-3" onSubmit={handleSubmitInward}>
              <input value={inwardForm.po_number} onChange={(e) => setInwardForm({ ...inwardForm, po_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="PO Number" />
              <input value={inwardForm.item_name} onChange={(e) => setInwardForm({ ...inwardForm, item_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Item name" />
              <div className="grid grid-cols-2 gap-3">
                <input value={inwardForm.quantity} onChange={(e) => setInwardForm({ ...inwardForm, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Quantity (kg)" />
                <select value={inwardForm.warehouse} onChange={(e) => setInwardForm({ ...inwardForm, warehouse: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>{w.name || w.warehouse_name}</option>)}
                </select>
              </div>
              <input value={inwardForm.supplier} onChange={(e) => setInwardForm({ ...inwardForm, supplier: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Supplier" />
              <button type="submit" disabled={submitting.inward} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium inline-flex items-center justify-center gap-2">
                {submitting.inward && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting.inward ? 'Recording...' : 'Confirm Inward'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5 text-blue-500" /> Record Outward
            </h2>
            <form className="space-y-3" onSubmit={handleSubmitOutward}>
              <input value={outwardForm.order_number} onChange={(e) => setOutwardForm({ ...outwardForm, order_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Order Number" />
              <input value={outwardForm.item_name} onChange={(e) => setOutwardForm({ ...outwardForm, item_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Item name" />
              <div className="grid grid-cols-2 gap-3">
                <input value={outwardForm.quantity} onChange={(e) => setOutwardForm({ ...outwardForm, quantity: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Quantity (kg)" />
                <select value={outwardForm.warehouse} onChange={(e) => setOutwardForm({ ...outwardForm, warehouse: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => <option key={w.id || w.warehouse_id} value={w.id || w.warehouse_id}>{w.name || w.warehouse_name}</option>)}
                </select>
              </div>
              <input value={outwardForm.customer} onChange={(e) => setOutwardForm({ ...outwardForm, customer: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Customer" />
              <button type="submit" disabled={submitting.outward} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium inline-flex items-center justify-center gap-2">
                {submitting.outward && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting.outward ? 'Recording...' : 'Confirm Outward'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Movements</h2>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All</option>
              <option>Inward</option>
              <option>Outward</option>
            </select>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading movements...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No stock movements recorded.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Movement ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handler</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {movements.map((m) => (
                  <tr key={m.id || m.movement_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{m.id || m.movement_id || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${(m.type || '').toLowerCase() === 'inward' || (m.type || '').toLowerCase() === 'in' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                        {(m.type || '').toLowerCase() === 'inward' || (m.type || '').toLowerCase() === 'in' ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                        {m.type || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-blue-600">{m.ref || m.reference || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{m.item || m.item_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.warehouse || m.warehouse_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{m.quantity || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.party || m.supplier || m.customer || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{m.handler || m.handled_by || '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={m.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{m.date || m.created_at || '—'}</td>
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
