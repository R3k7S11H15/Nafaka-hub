import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Wheat, Package, Truck, Sprout, FlaskConical, Wrench, Warehouse, Globe, Shield, DollarSign, Leaf, Loader2 } from 'lucide-react'
import api from '../services/api'

const ICON_MAP = {
  rice: Wheat, maize: Wheat, wheat: Wheat, sorghum: Package, beans: Leaf,
  groundnuts: Package, millet: Wheat, seeds: Sprout, fertilizers: FlaskConical,
  equipment: Wrench, storage: Warehouse, logistics: Truck, financing: DollarSign,
  insurance: Shield, export: Globe,
}

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getSiteCategories()
        if (data.success) setCategories(data.categories || [])
        else setError(data.message || 'Failed to load')
      } catch (err) { setError('Failed to connect') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const getIcon = (slug) => ICON_MAP[slug] || Package

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Product Categories</h1>
          <p className="text-green-100">Browse our wide range of agricultural products by category</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
        ) : error ? (
          <div className="text-center text-red-600 py-12">{error}</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-gray-500 py-12">No categories available yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => {
              const Icon = getIcon(cat.slug)
              return (
                <NavLink key={cat.id} to={`/products?type=${cat.slug}`} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition">
                  <div className="h-48 bg-gray-200 overflow-hidden">
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Icon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{cat.name}</h3>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{cat.description}</p>
                    <div className="mt-4 text-green-600 font-medium text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      Browse {cat.name} <span className="text-lg">→</span>
                    </div>
                  </div>
                </NavLink>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
