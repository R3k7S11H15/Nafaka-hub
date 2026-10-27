import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Truck, RefreshCw, Loader2, MapPin, Navigation, Check, X, Map, Clock, Package } from 'lucide-react'
import api from '../services/api'
import { useSSE } from '../hooks/useSSE'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const STATUS_STEPS = ['pending', 'in_transit', 'delivered']

export default function LogisticsActiveDeliveries() {
  const { user } = useAuth()
  const toast = useToast()
  const [deliveries, setDeliveries] = useState([])
  const [providerId, setProviderId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [locationForm, setLocationForm] = useState({ open: false, deliveryId: null, location: '' })

  const loadAll = async () => {
    try {
      const res = await api.getMyDeliveries()
      setDeliveries(res?.deliveries || [])
      setProviderId(res?.provider_id || null)
    } catch {
      setDeliveries([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  useSSE(
    providerId ? `/api/deliveries_realtime.php?provider_id=${providerId}` : null,
    {
      onMessage: (event) => {
        if (!event || event.type === 'error' || event.type === 'initial') return
        if (event.deliveries && Array.isArray(event.deliveries)) {
          setDeliveries(prev => {
            const updated = [...prev]
            event.deliveries.forEach(updatedDelivery => {
              const index = updated.findIndex(d => d.id === updatedDelivery.id)
              if (index >= 0) {
                updated[index] = { ...updated[index], ...updatedDelivery }
              }
            })
            return updated
          })
        }
      },
    }
  )

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.updateDeliveryStatus(id, status)
      loadAll()
    } catch (e) {
      toast.error(e?.message || 'Failed to update status')
    } finally { setUpdating(null) }
  }

  const updateLocation = async () => {
    const { deliveryId, location } = locationForm
    if (!location.trim()) { toast.error('Please enter a location'); return }
    setUpdating(deliveryId)
    try {
      await api.updateDeliveryLocation(deliveryId, location.trim())
      setLocationForm({ open: false, deliveryId: null, location: '' })
      loadAll()
    } catch (e) {
      toast.error(e?.message || 'Failed to update location')
    } finally { setUpdating(null) }
  }

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('deliver')) return 'bg-green-100 text-green-800'
    if (s.includes('transit')) return 'bg-blue-100 text-blue-800'
    if (s.includes('pending')) return 'bg-yellow-100 text-yellow-800'
    if (s.includes('cancel')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getStatusIndex = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'delivered') return 2
    if (s === 'in_transit') return 1
    if (s === 'pending') return 0
    return -1
  }

  const buildMapUrl = (delivery) => {
    const from = encodeURIComponent(delivery.pickup_location || '')
    const to = encodeURIComponent(delivery.delivery_address || delivery.destination || '')
    if (!from && !to) return null
    return `https://www.openstreetmap.org/export/embed.html?bbox=29.5%2C-6.8%2C39.5%2C-1.0&layer=mapnik&marker=-6.8%2C35.5`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading active deliveries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Active Deliveries</h1>
          <p className="text-gray-600 mt-1">Track and manage your current deliveries</p>
        </div>
        <button onClick={loadAll} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Truck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No active deliveries.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {deliveries.map((d) => {
            const statusIndex = getStatusIndex(d.status)
            const mapUrl = buildMapUrl(d)
            return (
              <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Delivery #{d.order_number || d.order_id || d.id}</h3>
                      <p className="text-sm text-gray-500">Created: {d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'}</p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(d.status)}`}>
                      {d.status || '—'}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" /> Delivery Progress
                    </h4>
                    <div className="flex items-center justify-between">
                      {STATUS_STEPS.map((step, idx) => (
                        <div key={step} className="flex-1 flex items-center">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${statusIndex >= idx ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                              {statusIndex >= idx ? <Check className="w-4 h-4" /> : idx + 1}
                            </div>
                            <span className="text-xs text-gray-500 mt-1 capitalize">{step.replace('_', ' ')}</span>
                          </div>
                          {idx < STATUS_STEPS.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 rounded ${statusIndex > idx ? 'bg-green-500' : 'bg-gray-200'}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {mapUrl && (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Map className="w-4 h-4 text-gray-400" /> Route Map
                      </h4>
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <iframe
                          title="Delivery Route Map"
                          src={mapUrl}
                          width="100%"
                          height="300"
                          style={{ border: 0 }}
                          allowFullScreen=""
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Pickup</p>
                            <p>{d.pickup_location || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <Navigation className="w-4 h-4 text-red-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">Destination</p>
                            <p>{d.delivery_address || d.destination || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span>Driver: {d.driver_name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Navigation className="w-4 h-4 text-gray-400" />
                      <span>Vehicle: {d.vehicle_number || '—'} {d.vehicle_type ? `(${d.vehicle_type})` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span>Cargo: {d.cargo_type || 'General'} {d.cargo_weight ? `${d.cargo_weight}t` : ''}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-sm text-gray-600">Cost: <span className="font-medium text-gray-900">{d.delivery_cost ? `${Number(d.delivery_cost).toLocaleString()} TZS` : '—'}</span></div>
                    <div className="text-sm text-gray-600">Distance: <span className="font-medium text-gray-900">{d.delivery_distance ? `${d.delivery_distance} km` : '—'}</span></div>
                    {d.current_location && <div className="text-sm text-gray-600">Location: <span className="font-medium text-gray-900">{d.current_location}</span></div>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 mr-2">Update status:</span>
                    {STATUS_STEPS.map((status) => (
                      <button key={status} onClick={() => updateStatus(d.id, status)} disabled={updating === d.id} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 capitalize">
                        {updating === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : status.replace('_', ' ')}
                      </button>
                    ))}
                    <button onClick={() => setLocationForm({ open: true, deliveryId: d.id, location: d.current_location || '' })} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
                      Update Location
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {locationForm.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Update Location</h3>
              <button onClick={() => setLocationForm({ ...locationForm, open: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Location</label>
                <input type="text" value={locationForm.location} onChange={(e) => setLocationForm({ ...locationForm, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Dar es Salaam, 6.8° S, 39.2° E" />
              </div>
              <button onClick={updateLocation} disabled={updating === locationForm.deliveryId} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                {updating === locationForm.deliveryId ? 'Updating...' : 'Update Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
