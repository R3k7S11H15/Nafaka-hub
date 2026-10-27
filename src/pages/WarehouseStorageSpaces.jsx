import { useState, useEffect } from 'react'
import { Warehouse, RefreshCw, Loader2, Plus, X, AlertTriangle } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseStorageSpaces() {
  const toast = useToast()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ open: false, warehouse_name: '', capacity_tonnes: '', available_space: '', location: '', region: '', rate_per_tonne_day: '', services: '' })

  const loadSpaces = async () => {
    try {
      const data = await api.getMyWarehouseSpaces()
      if (data.success) setSpaces(data.spaces || [])
    } catch {
      setSpaces([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadSpaces() }, [])

  const addSpace = async () => {
    if (!form.warehouse_name || !form.capacity_tonnes) { toast.error('Name and capacity are required'); return }
    try {
      await api.addWarehouseSpace(form)
      toast.success('Storage space added')
      setForm({ open: false, warehouse_name: '', capacity_tonnes: '', available_space: '', location: '', region: '', rate_per_tonne_day: '', services: '' })
      loadSpaces()
    } catch (e) {
      toast.error(e?.message || 'Failed to add space')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading storage spaces...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Storage Spaces</h1>
          <p className="text-gray-600 mt-1">Manage your warehouse sections and capacity</p>
        </div>
        <button onClick={() => setForm({ ...form, open: true })} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Space
        </button>
      </div>

      {spaces.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No storage spaces registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => {
            const capacity = Number(space.capacity_tonnes || 0)
            const available = Number(space.available_space || 0)
            const used = capacity - available
            const pct = capacity > 0 ? Math.round((used / capacity) * 100) : 0
            return (
              <div key={space.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{space.warehouse_name}</h3>
                    <p className="text-xs text-gray-500">{space.location || '—'} • {space.region || '—'}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pct > 80 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {pct}% used
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full ${pct > 80 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>Capacity: <span className="font-medium text-gray-900">{capacity.toLocaleString()} t</span></div>
                  <div>Available: <span className="font-medium text-green-600">{available.toLocaleString()} t</span></div>
                  <div>Used: <span className="font-medium text-gray-900">{used.toLocaleString()} t</span></div>
                  <div>Rate: <span className="font-medium text-gray-900">{space.rate_per_tonne_day ? `${Number(space.rate_per_tonne_day).toLocaleString()} TZS/t/day` : '—'}</span></div>
                </div>
                {space.services && <p className="text-xs text-gray-500 mt-2">Services: {space.services}</p>}
              </div>
            )
          })}
        </div>
      )}

      {form.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Storage Space</h3>
              <button onClick={() => setForm({ ...form, open: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name *</label>
                <input type="text" value={form.warehouse_name} onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Section A" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (tonnes) *</label>
                  <input type="number" value={form.capacity_tonnes} onChange={(e) => setForm({ ...form, capacity_tonnes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Available Space</label>
                  <input type="number" value={form.available_space} onChange={(e) => setForm({ ...form, available_space: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Morogoro" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input type="text" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Morogoro" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate per tonne/day (TZS)</label>
                <input type="number" value={form.rate_per_tonne_day} onChange={(e) => setForm({ ...form, rate_per_tonne_day: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Services</label>
                <input type="text" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. storage, inspection, packaging" />
              </div>
              <button onClick={addSpace} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium">Add Space</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
