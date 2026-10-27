import { useState, useEffect } from 'react'
import { User, Save, Loader2, RefreshCw, Warehouse, Phone, Mail, MapPin, Calendar } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseProfile() {
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ warehouse_name: '', location: '', region: '', capacity_tonnes: '', available_space: '', rate_per_tonne_day: '', services: '', description: '', operating_hours: '', contact_person: '', phone: '', email: '' })

  const loadProfile = async () => {
    try {
      const data = await api.getMyWarehouseProfile()
      if (data.success && data.profile) {
        setProfile(data.profile)
        setForm({
          warehouse_name: data.profile.warehouse_name || '',
          location: data.profile.location || '',
          region: data.profile.region || '',
          capacity_tonnes: data.profile.capacity_tonnes || '',
          available_space: data.profile.available_space || '',
          rate_per_tonne_day: data.profile.rate_per_tonne_day || '',
          services: data.profile.services || '',
          description: data.profile.description || '',
          operating_hours: data.profile.operating_hours || '',
          contact_person: data.profile.contact_person || '',
          phone: data.profile.phone || '',
          email: data.profile.email || '',
        })
      }
    } catch {
      setProfile(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadProfile() }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await api.updateMyWarehouseProfile(form)
      if (res.success) { toast.success('Profile updated'); loadProfile() } else toast.error(res.message || 'Update failed')
    } catch (e) {
      toast.error(e?.message || 'Update failed')
    } finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Warehouse Profile</h1>
          <p className="text-gray-600 mt-1">Manage your public warehouse profile</p>
        </div>
        <button onClick={loadProfile} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name</label>
            <input type="text" value={form.warehouse_name} onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
            <input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
            <input type="text" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (tonnes)</label>
            <input type="number" value={form.capacity_tonnes} onChange={(e) => setForm({ ...form, capacity_tonnes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Available Space (tonnes)</label>
            <input type="number" value={form.available_space} onChange={(e) => setForm({ ...form, available_space: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rate per tonne/day (TZS)</label>
            <input type="number" value={form.rate_per_tonne_day} onChange={(e) => setForm({ ...form, rate_per_tonne_day: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
            <input type="text" value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. 24/7" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Services</label>
            <input type="text" value={form.services} onChange={(e) => setForm({ ...form, services: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. storage, inspection, packaging" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={saveProfile} disabled={saving} className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      </div>
    </div>
  )
}
