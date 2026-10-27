import { useState, useEffect, useMemo, useCallback } from 'react'
import { Warehouse, ChevronLeft, ChevronRight, MapPin, Package, Plus, X, Thermometer, Shield, Truck, CheckCircle2, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function WarehouseBooking() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear())
  const [warehouses, setWarehouses] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showBook, setShowBook] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState(null)
  const [bookingForm, setBookingForm] = useState({ customer: '', commodity: 'Rice', tons: '', start: '', end: '' })
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.getWarehouses()
        if (!mounted) return
        const list = res?.warehouses || res?.data || []
        setWarehouses(Array.isArray(list) ? list : [])
        if (Array.isArray(list) && list.length > 0 && !selectedWarehouse) {
          setSelectedWarehouse(list[0])
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load warehouses')
          toast.error('Failed to load warehouses')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!user) return
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getWarehouseBookings(user.id)
        if (!mounted) return
        const list = res?.bookings || res?.data || []
        const mapped = Array.isArray(list) ? list.map(b => ({
          id: b.id || b.booking_id,
          warehouseId: b.warehouse_id || b.warehouseId,
          customer: b.customer_name || b.customer,
          commodity: b.commodity || b.product_type || b.product,
          tons: b.quantity || b.tons,
          start: b.start_date || b.start,
          end: b.end_date || b.end,
          status: b.status || 'pending',
          total: b.total_cost || b.total,
        })) : []
        setBookings(mapped)
      } catch {
        if (mounted) setBookings([])
      }
    })()
    return () => { mounted = false }
  }, [user, toast])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const today = new Date()

  const warehouseBookings = useMemo(() =>
    bookings.filter(b => b.warehouseId === selectedWarehouse?.id),
    [bookings, selectedWarehouse]
  )

  const calendarDays = useMemo(() => {
    const days = []
    for (let i = 0; i < firstDay; i++) days.push({ empty: true })
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d)
      const dateStr = formatDate(date)
      const dayBookings = warehouseBookings.filter(b => dateStr >= b.start && dateStr <= b.end)
      days.push({ day: d, date: dateStr, bookings: dayBookings, isToday: dateStr === formatDate(today) })
    }
    return days
  }, [currentMonth, currentYear, warehouseBookings])

  const monthUtilization = useMemo(() => {
    if (!selectedWarehouse) return 0
    const monthStart = formatDate(new Date(currentYear, currentMonth, 1))
    const monthEnd = formatDate(new Date(currentYear, currentMonth, daysInMonth))
    const total = warehouseBookings
      .filter(b => b.start <= monthEnd && b.end >= monthStart && b.status !== 'completed')
      .reduce((s, b) => s + (b.tons || 0), 0)
    return Math.round((total / (selectedWarehouse.capacity || 1)) * 100)
  }, [warehouseBookings, selectedWarehouse, currentMonth, currentYear, daysInMonth])

  const featuresList = (f) => {
    if (Array.isArray(f)) return f
    if (typeof f === 'string') return f.split(',').map(s => s.trim()).filter(Boolean)
    return []
  }

  const submitBooking = useCallback(async () => {
    if (!bookingForm.customer || !bookingForm.commodity || !bookingForm.tons || !bookingForm.start || !bookingForm.end) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (!user) {
      toast.error('Please log in to book warehouse space.')
      return
    }
    if (!selectedWarehouse) return

    setSubmitting(true)
    try {
      const res = await api.bookWarehouse(
        selectedWarehouse.id,
        user.id,
        bookingForm.commodity,
        Number(bookingForm.tons),
        bookingForm.start,
        bookingForm.end
      )
      if (res?.success) {
        toast.success('Warehouse booking created successfully.')
        const newBooking = {
          id: res.booking_id || `BK-${bookings.length + 1}`,
          warehouseId: selectedWarehouse.id,
          customer: bookingForm.customer,
          commodity: bookingForm.commodity,
          tons: Number(bookingForm.tons),
          start: bookingForm.start,
          end: bookingForm.end,
          status: 'pending',
        }
        setBookings([...bookings, newBooking])
        setShowBook(false)
        setBookingForm({ customer: '', commodity: 'Rice', tons: '', start: '', end: '' })
      } else {
        toast.error(res?.message || 'Failed to create booking.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [bookingForm, selectedWarehouse, user, bookings, toast])

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    )
  }

  if (error && warehouses.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-6 text-center">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Warehouse className="w-7 h-7 text-indigo-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Warehouse Booking Calendar</h1>
            <p className="text-gray-600">Reserve storage space, track capacity, and manage bookings</p>
          </div>
        </div>
        <button onClick={() => setShowBook(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 shadow-sm">
          <Plus className="w-5 h-5" /> New Booking
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900">Warehouses ({warehouses.length})</h3>
            {warehouses.map((w) => {
              const features = featuresList(w.features)
              const capacity = w.capacity || w.total_capacity || 0
              const used = w.used || w.current_utilization || 0
              return (
                <button key={w.id || w.warehouse_id} onClick={() => setSelectedWarehouse(w)} className={`w-full text-left bg-white rounded-xl border-2 p-4 transition-all ${selectedWarehouse?.id === (w.id || w.warehouse_id) ? 'border-indigo-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{w.name || w.warehouse_name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {w.region || w.location}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[100px]">
                      {(w.certified || ['TBS']).map(c => (
                        <span key={c} className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">{c}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{used}/{capacity} tonnes</span>
                      <span className="font-medium text-gray-900">{capacity > 0 ? Math.round(used / capacity * 100) : 0}%</span>
                    </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${capacity > 0 ? used / capacity * 100 : 0}%` }} />
                </div>
                {features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {features.slice(0, 2).map((f, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{f}</span>
                    ))}
                  </div>
                )}
              </div>

                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1 text-gray-600"><Thermometer className="w-3 h-3" /> {w.temp || w.temperature}°C</span>
                  <span className="font-medium text-indigo-700">{w.price ? `TZS ${Number(w.price).toLocaleString()}/ton` : (w.price_per_ton ? `TZS ${Number(w.price_per_ton).toLocaleString()}/ton` : '—')}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              {selectedWarehouse ? (
                <>
                  <h3 className="font-bold text-gray-900">{selectedWarehouse.name || selectedWarehouse.warehouse_name}</h3>
                  <p className="text-xs text-gray-500">{selectedWarehouse.region || selectedWarehouse.location}</p>
                </>
              ) : (
                <h3 className="font-bold text-gray-900">Select a warehouse</h3>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(currentYear, currentMonth - 1, 1)
                  setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear())
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-4 py-2 bg-gray-50 rounded-lg font-semibold text-gray-900 min-w-[160px] text-center">
                {MONTHS[currentMonth]} {currentYear}
              </div>
              <button
                onClick={() => {
                  const d = new Date(currentYear, currentMonth + 1, 1)
                  setCurrentMonth(d.getMonth()); setCurrentYear(d.getFullYear())
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Utilization */}
          {selectedWarehouse && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-700" />
                <span className="text-sm font-medium text-gray-900">Month Utilization ({monthUtilization}%)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-indigo-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${monthUtilization > 80 ? 'bg-red-500' : monthUtilization > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${monthUtilization}%` }} />
                </div>
                <span className="text-sm font-bold text-gray-900">{monthUtilization}%</span>
              </div>
            </div>
          )}

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, i) => {
              if (d.empty) return <div key={i} className="h-20 bg-gray-50 rounded" />
              const dayBookings = d.bookings
              return (
                <div key={i} className={`h-20 border ${d.isToday ? 'border-indigo-500 border-2' : 'border-gray-200'} rounded p-1 text-xs relative overflow-hidden`}>
                  <div className={`flex justify-between items-start ${d.isToday ? 'text-indigo-700 font-bold' : 'text-gray-700'}`}>
                    <span>{d.day}</span>
                  </div>
                  {dayBookings.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dayBookings.slice(0, 2).map(b => (
                        <div key={b.id} className={`truncate px-1 py-0.5 rounded text-[10px] ${
                          b.status === 'active' ? 'bg-green-100 text-green-800' :
                          b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {b.commodity} {b.tons}t
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-[10px] text-gray-500">+{dayBookings.length - 2} more</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Warehouse details */}
          {selectedWarehouse && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Thermometer className="w-3 h-3" /> Temperature</p>
                <p className="text-lg font-bold text-gray-900">{selectedWarehouse.temp || selectedWarehouse.temperature}°C</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Shield className="w-3 h-3" /> Humidity</p>
                <p className="text-lg font-bold text-gray-900">{selectedWarehouse.humidity || selectedWarehouse.humidity_level}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><Truck className="w-3 h-3" /> Loading docks</p>
                <p className="text-lg font-bold text-gray-900">2</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 24/7 Security</p>
                <p className="text-lg font-bold text-gray-900">Yes</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All Bookings */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">All Bookings</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commodity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tons</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map(b => {
                const wh = warehouses.find(w => w.id === b.warehouseId)
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{b.id}</td>
                    <td className="px-4 py-3 text-gray-900">{wh?.name || wh?.warehouse_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{b.customer}</td>
                    <td className="px-4 py-3 text-gray-700">{b.commodity}</td>
                    <td className="px-4 py-3 font-medium">{b.tons}t</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{b.start} → {b.end}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        b.status === 'active' ? 'bg-green-100 text-green-700' :
                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        b.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{b.total ? `TZS ${(Number(b.total) / 1000000).toFixed(1)}M` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Booking Modal */}
      {showBook && selectedWarehouse && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowBook(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">New Booking — {selectedWarehouse.name || selectedWarehouse.warehouse_name}</h3>
              <button onClick={() => setShowBook(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={bookingForm.customer} onChange={(e) => setBookingForm({ ...bookingForm, customer: e.target.value })} placeholder="Customer / Company name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              <select value={bookingForm.commodity} onChange={(e) => setBookingForm({ ...bookingForm, commodity: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                {['Rice', 'Maize', 'Beans', 'Sesame', 'Groundnuts', 'Sorghum', 'Wheat'].map(c => <option key={c}>{c}</option>)}
              </select>
              <input value={bookingForm.tons} onChange={(e) => setBookingForm({ ...bookingForm, tons: e.target.value })} placeholder="Tons to store" type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              <label className="text-xs text-gray-500">Start date</label>
              <input value={bookingForm.start} onChange={(e) => setBookingForm({ ...bookingForm, start: e.target.value })} type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              <label className="text-xs text-gray-500">End date</label>
              <input value={bookingForm.end} onChange={(e) => setBookingForm({ ...bookingForm, end: e.target.value })} type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              <div className="p-3 bg-indigo-50 rounded-lg text-sm">
                <p className="font-medium text-gray-900">Estimated cost</p>
                <p className="text-xs text-gray-600">{bookingForm.tons && selectedWarehouse.price_per_ton ? `TZS ${Number(selectedWarehouse.price_per_ton).toLocaleString()}/ton/month` : 'Enter details to calculate'}</p>
              </div>
              <button onClick={submitBooking} disabled={submitting} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
