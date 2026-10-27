import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Globe, ArrowRight, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function ExportServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getValueAddedServices('export')
        if (!mounted) return
        const list = res?.data || res?.services || res || []
        setServices(Array.isArray(list) ? list : [])
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
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Globe className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Export Services</h1>
              <p className="text-green-100">Take your agricultural products to global markets</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />Loading services...
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            No export services available at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {services.map((service) => (
              <div key={service.id || service.name} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{service.type || service.category || 'Service'}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-2">{service.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{service.description || '—'}</p>
                <p className="text-sm font-medium text-green-600 mb-4">{service.price || (service.price_from ? `From TZS ${service.price_from.toLocaleString()}` : 'Contact for pricing')}</p>
                <NavLink to="/export" className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2">
                  Learn More <ArrowRight className="w-4 h-4" />
                </NavLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
