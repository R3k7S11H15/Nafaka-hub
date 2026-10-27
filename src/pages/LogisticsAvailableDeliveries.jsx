import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, RefreshCw, Check, X, Loader2, Truck, MapPin, Calendar, Weight, Navigation } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function LogisticsAvailableDeliveries() {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(null)
  const loadAll = async () => {
    try {
      const [reqRes, drvRes, vehRes] = await Promise.all([api.getDeliveryRequests(), api.getMyDrivers(), api.getMyVehicles()])
      setRequests(reqRes?.requests || [])
      setDrivers(drvRes?.drivers || [])
      setVehicles(vehRes?.vehicles || [])
    } catch {
      setRequests([]); setDrivers([]); setVehicles([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])
  useEffect(() => { const i = setInterval(loadAll, 30000); return () => clearInterval(i) }, [])

  const [form, setForm] = useState({
    open: false, orderId: null,
    delivery_cost: '', distance: '', driver_id: '', vehicle_id: '',
    vehicle_type: '', cargo_type: '', cargo_weight: '',
    pickup_location: '', destination: '',
    pickup_lat: '', pickup_lng: '',
    dest_lat: '', dest_lng: '',
  })

  const openAccept = (orderId) => {
    setForm(f => ({ ...f, open: true, orderId }))
  }

  const submitAccept = async () => {
    const { orderId, delivery_cost, distance, driver_id, vehicle_id, vehicle_type, cargo_type, cargo_weight, pickup_location, destination, pickup_lat, pickup_lng, dest_lat, dest_lng } = form
    const cost = parseFloat(delivery_cost || '0')
    const dist = parseFloat(distance || '0')

    if (isNaN(cost) || cost < 0) { toast.error('Please enter a valid delivery cost'); return }
    if (isNaN(dist) || dist < 0) { toast.error('Please enter a valid distance'); return }
    if (!cargo_type) { toast.error('Please enter cargo type'); return }
    if (!pickup_location) { toast.error('Please enter pickup location'); return }
    if (!destination) { toast.error('Please enter destination'); return }

    setAccepting(orderId)
    try {
      await api.acceptDeliveryRequest(orderId, {
        delivery_cost: cost,
        distance: dist,
        driver_id: driver_id || null,
        vehicle_id: vehicle_id || null,
        vehicle_type,
        cargo_type,
        cargo_weight: cargo_weight ? parseFloat(cargo_weight) : null,
        pickup_location,
        destination,
        pickup_latitude: pickup_lat ? parseFloat(pickup_lat) : null,
        pickup_longitude: pickup_lng ? parseFloat(pickup_lng) : null,
        destination_latitude: dest_lat ? parseFloat(dest_lat) : null,
        destination_longitude: dest_lng ? parseFloat(dest_lng) : null,
      })
      setForm({ open: false, orderId: null, delivery_cost: '', distance: '', driver_id: '', vehicle_id: '', vehicle_type: '', cargo_type: '', cargo_weight: '', pickup_location: '', destination: '', pickup_lat: '', pickup_lng: '', dest_lat: '', dest_lng: '' })
      loadAll()
      toast.success('Delivery accepted successfully!')
    } catch (e) {
      toast.error(e?.message || 'Failed to accept delivery')
    } finally { setAccepting(null) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading available deliveries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Available Deliveries</h1>
          <p className="text-gray-600 mt-1">Delivery opportunities from Nafaka Hub orders</p>
        </div>
        <button onClick={loadAll} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No available delivery requests at this time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{req.order_number || req.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{req.customer_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{req.product_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{req.shipping_address || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{req.total_amount ? `${Number(req.total_amount).toLocaleString()} TZS` : '—'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openAccept(req.id)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium">
                        <Check className="w-3 h-3" /> Accept
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Accept Delivery</h3>
              <button onClick={() => setForm({ ...form, open: false })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Cost (TZS) *</label>
                  <input id="accept-cost" type="number" value={form.delivery_cost} onChange={(e) => setForm({ ...form, delivery_cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km) *</label>
                  <input id="accept-distance" type="number" value={form.distance} onChange={(e) => setForm({ ...form, distance: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select id="accept-driver" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">Select driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} {d.phone ? `(${d.phone})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                <select id="accept-vehicle" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">Select vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.registration_number} - {v.vehicle_type} ({v.capacity_tonnes}t)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                <input id="accept-vehicle-type" type="text" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Truck, Van, Lorry" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo Type *</label>
                  <input id="accept-cargo-type" type="text" value={form.cargo_type} onChange={(e) => setForm({ ...form, cargo_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Rice, Maize" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo Weight (tons)</label>
                  <input id="accept-cargo-weight" type="number" value={form.cargo_weight} onChange={(e) => setForm({ ...form, cargo_weight: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location *</label>
                <input id="accept-pickup" type="text" value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Morogoro Warehouse" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Latitude</label>
                  <input id="accept-pickup-lat" type="number" step="any" value={form.pickup_lat} onChange={(e) => setForm({ ...form, pickup_lat: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="-6.8" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Longitude</label>
                  <input id="accept-pickup-lng" type="number" step="any" value={form.pickup_lng} onChange={(e) => setForm({ ...form, pickup_lng: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="39.2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination *</label>
                <input id="accept-destination" type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="e.g. Dar es Salaam Buyer" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Latitude</label>
                  <input id="accept-dest-lat" type="number" step="any" value={form.dest_lat} onChange={(e) => setForm({ ...form, dest_lat: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="-6.8" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination Longitude</label>
                  <input id="accept-dest-lng" type="number" step="any" value={form.dest_lng} onChange={(e) => setForm({ ...form, dest_lng: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="39.2" />
                </div>
              </div>
              <button onClick={submitAccept} disabled={accepting === form.orderId} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                {accepting === form.orderId ? 'Accepting...' : 'Accept Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
