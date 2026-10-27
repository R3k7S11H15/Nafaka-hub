import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Sprout, ArrowRight, Search, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function Seeds() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getProducts({ category: 'seeds', limit: 24 })
        if (!mounted) return
        const list = res?.data?.products || res?.data || res?.products || res || []
        setProducts(Array.isArray(list) ? list : [])
      } catch {
        if (mounted) setProducts([])
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
              <Sprout className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Certified Seeds</h1>
              <p className="text-green-100">High-quality seeds for high-yield farming</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No seed products available yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                <h3 className="font-semibold text-gray-900 text-lg">{p.name || p.title || '—'}</h3>
                <p className="text-sm text-gray-500 mt-1">{p.description || p.variety || '—'}</p>
                <p className="text-xs text-gray-500 mt-2">Seller: {p.seller_name || p.vendor || '—'}</p>
                <p className="text-2xl font-bold text-green-600 mt-3">{p.price ? `TZS ${Number(p.price).toLocaleString()}` : '—'}{p.unit && <span className="text-sm text-gray-500">/{p.unit}</span>}</p>
                <NavLink to={`/products/${p.id}`} className="mt-4 w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium">
                  View Details <ArrowRight className="w-4 h-4" />
                </NavLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
