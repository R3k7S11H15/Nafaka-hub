import { useState, useEffect } from 'react'
import { User, Save, Loader2, RefreshCw } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function LogisticsProfile() {
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ company_name: '', contact_person: '', phone: '', email: '', coverage_areas: '', vehicle_types: '', description: '', operating_regions: '', operating_hours: '', website_url: '' })

  const loadProfile = async () => {
    try {
      const res = await api.getMyLogisticsProfile()
      const p = res?.profile || null
      setProfile(p)
      if (p) {
        setForm({
          company_name: p.company_name || '',
          contact_person: p.contact_person || '',
          phone: p.phone || '',
          email: p.email || '',
          coverage_areas: p.coverage_areas || '',
          vehicle_types: p.vehicle_types || '',
          description: p.description || '',
          operating_regions: p.operating_regions || '',
          operating_hours: p.operating_hours || '',
          website_url: p.website_url || '',
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
      const res = await api.updateMyLogisticsProfile(form)
      if (res.success) { toast.success('Profile updated!'); loadProfile() } else toast.error(res.message || 'Update failed')
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-gray-600 mt-1">Manage your public logistics profile</p>
        </div>
        <button onClick={loadProfile} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Regions</label>
            <input type="text" value={form.operating_regions} onChange={(e) => setForm({ ...form, operating_regions: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Dar es Salaam, Morogoro" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Areas</label>
            <input type="text" value={form.coverage_areas} onChange={(e) => setForm({ ...form, coverage_areas: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Types</label>
            <input type="text" value={form.vehicle_types} onChange={(e) => setForm({ ...form, vehicle_types: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Truck, Van, Lorry" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Operating Hours</label>
            <input type="text" value={form.operating_hours} onChange={(e) => setForm({ ...form, operating_hours: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. 24/7" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input type="url" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
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
