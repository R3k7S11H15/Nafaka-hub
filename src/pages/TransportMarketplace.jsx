import { useState, useEffect } from 'react'
import { Loader2, MapPin, Calendar, Package } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function TransportMarketplace() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBooking, setShowBooking] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [bookingForm, setBookingForm] = useState({
    pickup: '',
    dropoff: '',
    grainType: 'Rice',
    weight: '',
    date: '',
  })
  const toast = useToast()
  const { user } = useAuth()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getTransportProviders()
        if (!mounted) return
        setProviders(Array.isArray(res) ? res : (res?.providers || res?.data || []))
      } catch (err) {
        if (mounted) {
          setProviders([])
          setError(err.message || 'Failed to load transport providers')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const ratedProviders = providers.filter(p => p.rating != null)
  const avgRating = ratedProviders.length > 0
    ? (providers.reduce((s, p) => s + Number(p.rating || 0), 0) / ratedProviders.length).toFixed(1)
    : '—'

  const handleBookTransport = (provider) => {
    setSelectedProvider(provider)
    setShowBooking(true)
  }

  const submitBooking = async () => {
    if (!bookingForm.pickup || !bookingForm.dropoff || !bookingForm.weight) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (!user) {
      toast.error('Please log in to book transport.')
      return
    }
    try {
      const res = await api.bookTransport(
        user.id,
        selectedProvider.id,
        Number(bookingForm.weight) * 10,
        0
      )
      if (res?.success || res?.data?.success) {
        toast.success('Transport booking submitted successfully.')
      } else {
        toast.error(res?.message || 'Could not submit booking.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setShowBooking(false)
      setBookingForm({ pickup: '', dropoff: '', grainType: 'Rice', weight: '', date: '' })
    }
  }

  const activeDeliveries = providers.filter(p => (p.status || '').toLowerCase() === 'active' || p.available)

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          Transport Marketplace
        </h1>
        <p className="text-gray-600 mt-2">Find and book transport for your grain</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available Trucks</p>
              <p className="text-2xl font-bold text-gray-900">{providers.length}</p>
            </div>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Deliveries</p>
              <p className="text-2xl font-bold text-gray-900">{activeDeliveries.length}</p>
            </div>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">—</p>
            </div>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{avgRating}</p>
            </div>
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <button onClick={() => setShowBooking(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Book Transport
        </button>
        <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
          Filter
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Trucks</h2>
        {providers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">No transport providers available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {providers.map((truck, idx) => (
              <div key={truck.id || idx} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{truck.truck_type || truck.type || truck.name || '—'}</h3>
                    <div className="flex items-center text-gray-600 mt-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {truck.route || truck.region || '—'}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${(truck.status === 'Available' || truck.available) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {truck.status || (truck.available ? 'Available' : 'Busy')}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Price per ton:</span>
                    <span className="font-medium text-green-600">{truck.price ? `TZS ${Number(truck.price).toLocaleString()}` : '—'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    {truck.rating || '—'} {truck.driver_name && `(${truck.driver_name})`}
                  </div>
                  <button onClick={() => handleBookTransport(truck)} className="w-full mt-2 bg-amber-600 text-white py-1.5 rounded-lg hover:bg-amber-700 text-sm font-medium">
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Form</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pickup Location</label>
              <input type="text" value={bookingForm.pickup} onChange={(e) => setBookingForm({ ...bookingForm, pickup: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. Dar es Salaam" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dropoff Location</label>
              <input type="text" value={bookingForm.dropoff} onChange={(e) => setBookingForm({ ...bookingForm, dropoff: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. Mbeya" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grain Type</label>
              <select value={bookingForm.grainType} onChange={(e) => setBookingForm({ ...bookingForm, grainType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option>Rice</option>
                <option>Maize</option>
                <option>Wheat</option>
                <option>Sorghum</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weight (tons)</label>
              <input type="number" value={bookingForm.weight} onChange={(e) => setBookingForm({ ...bookingForm, weight: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" placeholder="e.g. 20" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={bookingForm.date} onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="mt-6">
            <button onClick={submitBooking} className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 flex items-center gap-2">Book Transport</button>
          </div>
        </div>
      </div>

      {showBooking && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowBooking(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Book Transport{selectedProvider ? ` with ${selectedProvider.name || selectedProvider.truck_type || ''}` : ''}</h3>
            <div className="space-y-3 text-sm">
              <p><span className="text-gray-500">Pickup:</span> {bookingForm.pickup || '—'}</p>
              <p><span className="text-gray-500">Dropoff:</span> {bookingForm.dropoff || '—'}</p>
              <p><span className="text-gray-500">Grain:</span> {bookingForm.grainType}</p>
              <p><span className="text-gray-500">Weight:</span> {bookingForm.weight ? `${bookingForm.weight} tons` : '—'}</p>
              <p><span className="text-gray-500">Date:</span> {bookingForm.date || '—'}</p>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={submitBooking} className="flex-1 bg-amber-600 text-white py-2.5 rounded-lg hover:bg-amber-700 font-medium">Confirm Booking</button>
              <button onClick={() => setShowBooking(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
