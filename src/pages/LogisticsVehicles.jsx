import { useState, useEffect } from 'react'
import { PackageCheck, RefreshCw, Loader2, Plus, X } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function LogisticsVehicles() {
  const toast = useToast()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ open: false, vehicle_type: '', registration_number: '', model: '', capacity_tonnes: '' })

  const loadAll = async () => {
    try {
      const res = await api.getMyVehicles()
      setVehicles(res?.vehicles || [])
    } catch {
      setVehicles([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  const addVehicle = async () => {
    if (!form.vehicle_type || !form.registration_number) return
    try {
      await api.addVehicle(form.vehicle_type, form.registration_number, form.model, form.capacity_tonnes)
      setForm({ open: false, vehicle_type: '', registration_number: '', model: '', capacity_tonnes: '' })
      loadAll()
    } catch (e) {
      toast.error(e?.message || 'Failed to add vehicle')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading vehicles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-gray-600 mt-1">Manage your fleet</p>
        </div>
        <button onClick={() => setForm({ ...form, open: true })} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <PackageCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No vehicles registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{vehicle.registration_number}</h3>
                  <p className="text-sm text-gray-500">{vehicle.vehicle_type}</p>
                  <p className="text-xs text-gray-400 mt-1">Model: {vehicle.model || '—'}</p>
                  <p className="text-xs text-gray-400">Capacity: {vehicle.capacity_tonnes ? `${vehicle.capacity_tonnes} tonnes` : '—'}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {vehicle.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {form.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Vehicle</h3>
              <button onClick={() => setForm({ ...form, open: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                <input type="text" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Truck, Van, Lorry" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number *</label>
                <input type="text" value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. T-1234 ABCD" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Isuzu NPR" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Tonnes)</label>
                <input type="number" value={form.capacity_tonnes} onChange={(e) => setForm({ ...form, capacity_tonnes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. 5" />
              </div>
              <button onClick={addVehicle} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium">Add Vehicle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
