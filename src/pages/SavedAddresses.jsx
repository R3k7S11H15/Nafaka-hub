import React, { useState, useEffect } from 'react'
import { Plus, MapPin, Trash2, CheckCircle, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function SavedAddresses() {
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: '', address: '', city: '', phone: '' })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getSavedAddresses()
        if (!mounted) return
        setSaved(res?.data || res?.addresses || res || [])
      } catch {
        if (mounted) setSaved([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const addAddress = () => {
    if (!newAddr.address || !newAddr.city) return
    setSaved([...saved, { id: Date.now(), ...newAddr, primary: saved.length === 0 }])
    setNewAddr({ label: '', address: '', city: '', phone: '' })
    setShowForm(false)
  }

  const removeAddress = (id) => setSaved(saved.filter(a => a.id !== id))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Saved Addresses</h1>
          <p className="text-gray-500 mt-1">Manage your delivery addresses</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Address
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Add New Address</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Label</label>
              <input type="text" value={newAddr.label} onChange={(e) => setNewAddr({...newAddr, label: e.target.value})} className="input-field" placeholder="Home, Office, Warehouse" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <input type="text" value={newAddr.city} onChange={(e) => setNewAddr({...newAddr, city: e.target.value})} className="input-field" placeholder="City" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
              <input type="text" value={newAddr.address} onChange={(e) => setNewAddr({...newAddr, address: e.target.value})} className="input-field" placeholder="Street address" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
              <input type="tel" value={newAddr.phone} onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} className="input-field" placeholder="+255 712 345 678" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addAddress} className="btn-primary">Save Address</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading addresses...
        </div>
      ) : saved.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No saved addresses yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {saved.map((addr) => (
            <div key={addr.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl mt-1">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{addr.label || 'Address'}</h3>
                      {addr.primary && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Primary</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{addr.address}</p>
                    <p className="text-sm text-gray-500">{addr.city}</p>
                    <p className="text-sm text-gray-500">{addr.phone}</p>
                  </div>
                </div>
                <button onClick={() => removeAddress(addr.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
