import React, { useState, useEffect } from 'react'
import { Star, Eye, MousePointer, TrendingUp, Package, Loader2, Check } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function FeaturedListings() {
  const [packages, setPackages] = useState([])
  const [products, setProducts] = useState([])
  const [myListings, setMyListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [selectedPackage, setSelectedPackage] = useState('')
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [user])

  const fetchData = async () => {
    try {
      const [pkgRes, listingsRes] = await Promise.all([
        api.getAdPackages(),
        user ? api.getMyListings(user.id) : Promise.resolve({ data: { listings: [] } })
      ])
      if (pkgRes.data.success) setPackages(pkgRes.data.packages)
      if (listingsRes.data.success) setMyListings(listingsRes.data.listings)

      const prodRes = await api.getProducts({ limit: 20 })
      if (prodRes.data.success) setProducts(prodRes.data.products || [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    if (!selectedProduct || !selectedPackage) {
      toast.error('Please select a product and package')
      return
    }
    setPurchasing(selectedPackage)
    try {
      const { data } = await api.purchaseFeaturedListing(
        parseInt(selectedProduct),
        user.id,
        selectedPackage
      )
      if (data.success) {
        toast.success('Featured listing activated', `Listing active until ${data.end_date}`)
        fetchData()
        setSelectedProduct('')
        setSelectedPackage('')
      } else {
        toast.error(data.message || 'Purchase failed')
      }
    } catch (err) {
      toast.error('Failed to process purchase')
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-grain-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Featured Advertisements</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Boost your visibility and get more buyers with featured listings and premium ad placements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">10x</p>
              <p className="text-sm text-gray-500">More visibility</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <MousePointer className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">5x</p>
              <p className="text-sm text-gray-500">More clicks</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">3x</p>
              <p className="text-sm text-gray-500">More sales</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Ad Package</h2>
          
          {user && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Product to Feature</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Choose a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} - TZS {p.price.toLocaleString()}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.slug)}
                className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                  selectedPackage === pkg.slug
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                  {selectedPackage === pkg.slug && (
                    <Check className="w-5 h-5 text-primary-600" />
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-3">{pkg.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">TZS {pkg.price.toLocaleString()}</span>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded">{pkg.duration_days} days</span>
                  {pkg.includes_analytics && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">Analytics</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {user && (
            <div className="mt-6">
              <button
                onClick={handlePurchase}
                disabled={!selectedProduct || !selectedPackage || purchasing}
                className="bg-primary-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                Purchase Featured Listing
              </button>
            </div>
          )}
        </div>

        {user && myListings.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">My Featured Listings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {myListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{listing.product_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">{listing.listing_type}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {listing.start_date} to {listing.end_date}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        TZS {listing.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          listing.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {listing.is_active ? 'Active' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
