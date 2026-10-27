import { useState, useEffect } from 'react'
import { Users, RefreshCw, Loader2, Plus, X } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function LogisticsDrivers() {
  const toast = useToast()
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ open: false, name: '', phone: '', license_number: '', region: '' })

  const loadAll = async () => {
    try {
      const res = await api.getMyDrivers()
      setDrivers(res?.drivers || [])
    } catch {
      setDrivers([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  const addDriver = async () => {
    if (!form.name) return
    try {
      await api.addDriver(form.name, form.phone, form.license_number, form.region)
      setForm({ open: false, name: '', phone: '', license_number: '', region: '' })
      loadAll()
    } catch (e) {
      toast.error(e?.message || 'Failed to add driver')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading drivers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Drivers</h1>
          <p className="text-gray-600 mt-1">Manage your drivers</p>
        </div>
        <button onClick={() => setForm({ ...form, open: true })} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      {drivers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No drivers registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => (
            <div key={driver.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                  <p className="text-sm text-gray-500">{driver.phone || 'No phone'}</p>
                  <p className="text-xs text-gray-400 mt-1">License: {driver.license_number || '—'}</p>
                  <p className="text-xs text-gray-400">Region: {driver.region || '—'}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${driver.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {driver.is_active ? 'Active' : 'Inactive'}
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
              <h3 className="text-lg font-semibold text-gray-900">Add Driver</h3>
              <button onClick={() => setForm({ ...form, open: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Driver name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="+255 XXX XXX XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input type="text" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. DL-12345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input type="text" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Dar es Salaam" />
              </div>
              <button onClick={addDriver} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium">Add Driver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
