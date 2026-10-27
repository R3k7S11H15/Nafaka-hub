import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import api from '../services/api'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'

const quantities = [100, 500, 1000, 5000, 10000, 20000, 50000, 100000]

const formatKg = (kg) => kg >= 1000 ? `${(kg / 1000)} ton` : `${kg} kg`

export default function BulkPurchase() {
  const [selectedQty, setSelectedQty] = useState(1000)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingId, setAddingId] = useState(null)
  const { addToCart } = useCart()
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getProducts({ limit: 12, sort: 'price_desc' })
        if (!mounted) return
        const list = res?.products || res?.data?.products || res?.data || []
        const arr = Array.isArray(list) ? list : []
        const mapped = arr.map(p => {
          const pricePerKg = Number(p.price || 0) / 100
          const discount = Number(p.discount || p.bulk_discount || 10)
          const bulkPrice = pricePerKg * (1 - discount / 100)
          return {
            id: p.id,
            name: p.name || p.title || '—',
            pricePerKg,
            discount,
            bulkPrice,
            savings: pricePerKg - bulkPrice,
            seller: p.seller_name || p.vendor || '—',
            grade: p.grade || 'Standard',
          }
        }).filter(p => p.pricePerKg > 0)
        setProducts(mapped)
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load products')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          Bulk Purchase
        </h1>
        <p className="text-gray-600 mt-2">Buy grain in bulk quantities</p>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Select Quantity</h2>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}
        <div className="flex flex-wrap gap-3">
          {quantities.map((qty) => (
            <button key={qty} onClick={() => setSelectedQty(qty)} className={`px-4 py-2 rounded-lg border-2 transition-colors ${selectedQty === qty ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-700 hover:border-gray-400'}`}>
              {formatKg(qty)}
            </button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">No products available for bulk purchase.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {products.map((product) => {
            const bulkTotal = product.bulkPrice * selectedQty
            const regularTotal = product.pricePerKg * selectedQty
            const totalSavings = regularTotal - bulkTotal
            return (
              <div key={product.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
                    <p className="text-sm text-gray-600">TZS {Math.round(product.pricePerKg)}/kg</p>
                  </div>
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Up to {product.discount}% off</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Bulk price for {formatKg(selectedQty)}</p>
                    <p className="text-2xl font-bold text-green-600">TZS {Math.round(bulkTotal).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                    Save TZS {Math.round(totalSavings).toLocaleString()}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {product.seller}
                  </div>
                  <div className="text-sm text-gray-600">Grade: <span className="font-medium">{product.grade}</span></div>
                </div>
               <div className="mt-4 flex gap-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      setAddingId(product.id)
                      try {
                        await addToCart(product.id, selectedQty)
                        toast.success(`${product.name} added to cart (${formatKg(selectedQty)})`)
                      } catch {
                        toast.error('Failed to add to cart')
                      } finally {
                        setAddingId(null)
                      }
                    }}
                    disabled={addingId === product.id}
                    className="flex-1 bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700 text-sm flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {addingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Add to Cart
                  </button>
                  <button
                    onClick={() => toast.info(`Quote request for ${product.name} (${formatKg(selectedQty)}) submitted`)}
                    className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Request Quote
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">Cart Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Quantity</p>
            <p className="text-xl font-bold text-gray-900">{formatKg(selectedQty)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Price</p>
            <p className="text-xl font-bold text-gray-900">{products.length > 0 ? `TZS ${Math.round(products.reduce((sum, p) => sum + p.bulkPrice * selectedQty, 0)).toLocaleString()}` : '—'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Discount Applied</p>
            <p className="text-xl font-bold text-green-600">{products.length > 0 ? `-${(products.reduce((sum, p) => sum + p.discount, 0) / products.length).toFixed(1)}%` : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
