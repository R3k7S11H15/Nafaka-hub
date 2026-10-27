import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Warehouse, ArrowRight, Search, Loader2 } from 'lucide-react'
import api from '../services/api'

const featuresList = (f) => {
  if (Array.isArray(f)) return f;
  if (typeof f === 'string') return f.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

export default function StorageServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getWarehouses()
        if (!mounted) return
        setServices(res?.data || res?.warehouses || res || [])
      } catch {
        if (mounted) setServices([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Warehouse className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Storage Services</h1>
              <p className="text-green-100">Secure warehousing for your agricultural produce</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="Search storage facilities..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading facilities...
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No storage facilities available.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, idx) => {
              const features = featuresList(service.features);
              return (
                <div key={service.id || service.warehouse_id || idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">{service.location || service.region || service.provider || '—'}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm font-medium text-gray-700">{service.rating ?? '—'}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{service.name || service.warehouse_name || 'Facility'}</h3>
                    <p className="text-sm text-gray-500 mb-3">Capacity: {service.capacity || '—'}</p>
                    {features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {features.map((feature, i) => (
                          <span key={i} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{feature}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-lg font-bold text-green-600">{service.price ? `TZS ${Number(service.price).toLocaleString()}/${service.unit || 'MT/month'}` : (service.rate || '—')}</p>
                    </div>
                    <NavLink to="/warehouse" className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                      View Details <ArrowRight className="w-4 h-4" />
                    </NavLink>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
