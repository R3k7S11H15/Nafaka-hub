import { useState, useEffect, useMemo } from 'react'
import { MapPin, Filter, Truck, Navigation, Search, Package, Loader2 } from 'lucide-react'
import api from '../services/api'

const districts = ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni']
const wards = ['Kariakoo', 'Mikocheni', 'Masaki', 'Tabata', 'Buguruni']

export default function RegionalMarketplace() {
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [selectedWard, setSelectedWard] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [checkDelivery, setCheckDelivery] = useState(false)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getProducts({ limit: 100 })
        if (!mounted) return
        const list = res?.data?.products || res?.data || res?.products || res || []
        setProducts(Array.isArray(list) ? list : [])
        const regions = [...new Set(list.map(p => p.region || p.location).filter(Boolean))]
        if (regions.length > 0 && !selectedRegion) setSelectedRegion(regions[0])
      } catch {
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const regions = useMemo(() => {
    const grouped = {}
    for (const p of products) {
      const r = p.region || p.location
      if (!r) continue
      if (!grouped[r]) grouped[r] = { name: r, products: 0, topProduct: null, sellers: new Set() }
      grouped[r].products += 1
      if (p.seller_name || p.vendor) grouped[r].sellers.add(p.seller_name || p.vendor)
      if (!grouped[r].topProduct && p.name) grouped[r].topProduct = p.name
    }
    return Object.values(grouped).map(g => ({
      name: g.name,
      products: g.products,
      topProduct: g.topProduct || '—',
      sellers: g.sellers.size,
      x: 50,
      y: 50,
    }))
  }, [products])

  const regionProducts = useMemo(() => {
    let list = products
    if (selectedRegion) list = list.filter(p => (p.region || p.location) === selectedRegion)
    if (searchQuery) list = list.filter(p => (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    return list
  }, [products, selectedRegion, searchQuery])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <MapPin className="w-8 h-8 text-amber-600" />
          <h1 className="text-3xl font-bold text-gray-900">Regional Marketplace</h1>
        </div>
        <p className="text-gray-600 ml-11">Discover grain by region</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Select Region</h2>
        {regions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No regional data available.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {regions.map((region) => (
              <button
                key={region.name}
                onClick={() => setSelectedRegion(region.name)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedRegion === region.name
                    ? 'border-amber-500 bg-amber-50 shadow-md'
                    : 'border-gray-200 hover:border-amber-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className={`w-4 h-4 ${selectedRegion === region.name ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className="font-semibold text-sm text-gray-900">{region.name}</span>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>{region.products} products</p>
                  <p>Top: {region.topProduct}</p>
                  <p>{region.sellers} sellers</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Products</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search grains..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
              <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">All Districts</option>
                {districts.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ward</label>
              <select value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                <option value="">All Wards</option>
                {wards.map((ward) => <option key={ward} value={ward}>{ward}</option>)}
              </select>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Delivery Available</span>
              </div>
              <button
                onClick={() => setCheckDelivery(!checkDelivery)}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  checkDelivery ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200'
                }`}
              >
                {checkDelivery ? 'Delivery: Available' : 'Check Delivery'}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Products {selectedRegion && `in ${selectedRegion}`}
              </h2>
            </div>
            <span className="text-sm text-gray-600">{regionProducts.length} products found</span>
          </div>

          {regionProducts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
              No products found for this region.
            </div>
          ) : (
            <div className="space-y-4">
              {regionProducts.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name || product.title || '—'}</h3>
                      <p className="text-sm text-gray-600">Seller: {product.seller_name || product.vendor || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-amber-600">{product.price ? `TZS ${Number(product.price).toLocaleString()}/kg` : '—'}</p>
                      <p className="text-sm text-gray-500">Stock: {product.stock || product.quantity || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{product.region || product.location || selectedRegion || '—'}</span>
                    </div>
                    <button className="ml-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium">
                      Contact Seller
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
