import React, { useState, useEffect } from 'react'
import { NavLink, useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Star, ShoppingCart, SlidersHorizontal, Loader2 } from 'lucide-react'
import api from '../services/api'

const CATEGORIES = ['All', 'Rice', 'Maize', 'Wheat', 'Sorghum', 'Beans', 'Groundnuts']

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState(query || '')
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getProducts({ search: query, limit: 50 })
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
  }, [query])

  const filtered = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || (p.category || p.commodity) === selectedCategory
    return matchesCategory
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-sm text-green-100 mb-4">
            <NavLink to="/" className="hover:text-white transition-colors">Home</NavLink>
            <span>/</span>
            <span className="text-white font-medium">Search Results</span>
          </nav>
          <h1 className="text-3xl font-bold mb-2">Search Results</h1>
          <p className="text-green-100">{query ? `Showing results for "${query}"` : 'Browse all products'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchInput.trim()) {
                    navigate('/search?q=' + encodeURIComponent(searchInput.trim()))
                  }
                }}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>
            <button className="px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-gray-400" /> Filters
            </button>
          </div>
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${selectedCategory === cat ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">{filtered.length} products found</p>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filtered.map(product => (
              <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                <NavLink to={`/products/${product.id}`} className="block">
                  <div className="h-48 bg-gray-100 overflow-hidden relative">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                    )}
                    {product.rating && (
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium text-gray-700">{product.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">{product.category || product.commodity || 'Grain'}</span>
                    <h3 className="font-semibold text-gray-900 mt-2 mb-1 group-hover:text-green-700 transition-colors">{product.name || product.title || '—'}</h3>
                    <p className="text-sm text-gray-500 mb-3">{product.seller_name || product.vendor || '—'}</p>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-lg font-bold text-green-600">{product.price ? `TZS ${Number(product.price).toLocaleString()}` : '—'}{product.unit && <span className="text-sm text-gray-500">/{product.unit}</span>}</p>
                    </div>
                  </div>
                </NavLink>
                <div className="px-5 pb-5">
                  <button className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
