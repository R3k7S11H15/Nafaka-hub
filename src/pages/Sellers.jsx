import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Star, MapPin, Shield, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function Sellers() {
  const [sellers, setSellers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminCustomers({ role: 'seller', verified: 1, limit: 24 })
        if (!mounted) return
        const list = res?.data?.customers || res?.data || res?.customers || res || []
        setSellers(Array.isArray(list) ? list : [])
      } catch {
        if (mounted) setSellers([])
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
          <h1 className="text-3xl font-bold mb-2">Verified Sellers</h1>
          <p className="text-green-100">Connect with trusted farmers and traders across Tanzania</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : sellers.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No verified sellers yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellers.map((seller) => (
              <div key={seller.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition">
                <div className="h-32 bg-gray-100 relative flex items-center justify-center text-gray-400">
                  <Shield className="w-12 h-12" />
                  <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Verified
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">{seller.full_name || seller.business_name || seller.name || '—'}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3" />{seller.region || seller.location || '—'}
                  </p>
                  {seller.rating && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-gray-700">{Number(seller.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
