import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Search, ChevronRight, Loader2, AlertCircle, SlidersHorizontal, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react'
import api from '../services/api'
import { useCart } from '../context/CartContext'
import { Button, Card, Badge, RatingStars, Price, EmptyState } from '../components/UI'

const categories = ['All', 'rice', 'maize', 'wheat', 'sorghum', 'beans', 'groundnuts', 'seeds', 'fertilizers', 'equipment']

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [cartProductId, setCartProductId] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const { addToCart } = useCart()

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await api.getProducts()
      if (data.success) {
        setProducts(data.products || [])
        setError(null)
      } else {
        setError(data.message || 'Failed to load products')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async (productId) => {
    setCartProductId(productId)
    try {
      const data = await addToCart(productId, 1)
      if (!data.success) {
        console.error('Add to cart failed:', data.message)
      }
    } catch (err) {
      console.error('Add to cart error:', err)
    } finally {
      setCartProductId(null)
    }
  }

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory =
      selectedCategory === 'All' ||
      p.type === selectedCategory ||
      p.category_id?.toString() === selectedCategory
    return matchesSearch && matchesCategory
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0)
    if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0)
    return (a.name || '').localeCompare(b.name || '')
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-700 to-emerald-800 py-8 px-4 text-white">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-4 flex items-center gap-2 text-sm text-green-100">
            <NavLink to="/" className="transition-colors hover:text-white">Home</NavLink>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">Products</span>
          </nav>
          <h1 className="text-3xl font-bold mb-2">Our Products</h1>
          <p className="text-green-100">Discover our wide range of high-quality grains and agricultural products</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Card className="p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search products, brands, categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search products"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-all outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500/20"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500" aria-live="polite">
                {loading ? 'Loading products...' : `${sorted.length} product${sorted.length === 1 ? '' : 's'} found`}
              </p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-stretch">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Sort products"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  aria-expanded={showFilters}
                  className="sm:hidden inline-flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-green-500/30"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Filters</span>
                  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div
            className={`mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2 transition-all duration-300 ${
              showFilters ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 sm:max-h-none sm:opacity-100 overflow-hidden sm:overflow-visible'
            }`}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300 hover:text-green-700'
                }`}
              >
                {cat === 'All' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </Card>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i} className="h-96 p-0 animate-pulse overflow-hidden">
                <div className="h-40 w-full bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8">
            <div className="flex items-start gap-3 text-red-600">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div>
                <h3 className="font-medium">Failed to load products</h3>
                <p className="mt-1 text-sm opacity-90">{error}</p>
              </div>
            </div>
          </Card>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No products found"
            description="Try adjusting your search or filter criteria"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sorted.map((product) => (
              <div
                key={product.id}
                className="group relative rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <NavLink to={`/products/${product.id}`} className="block">
                  <div className="relative h-40 overflow-hidden bg-gray-100">
                    {product.image_url ? (
                      <img
                        src={
                          product.image_url.startsWith('http')
                            ? product.image_url
                            : `images/${product.image_url}`
                        }
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">No Image</div>
                    )}
                    {product.discount_price && product.discount_price > 0 && product.price > product.discount_price && (
                      <span className="absolute top-3 right-3 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white">
                        -{Math.round(((product.price - product.discount_price) / product.price) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="p-4 pb-2">
                    <Badge variant="green" size="sm" className="mb-2">
                      {product.type || 'General'}
                    </Badge>
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate-2">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {product.description || 'High-quality agricultural product'}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5">
                      <RatingStars rating={product.average_rating ? parseFloat(product.average_rating) : 0} size="sm" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <Price
                        amount={product.discount_price && product.discount_price > 0 ? product.discount_price : product.price}
                        weight={product.weight}
                        className="text-lg"
                      />
                      {product.discount_price && product.discount_price > 0 && product.price > product.discount_price && (
                        <span className="text-sm text-gray-400 line-through">TZS {product.price.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </NavLink>
                <div className="p-4 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    icon={ShoppingCart}
                    loading={cartProductId === product.id}
                    disabled={cartProductId === product.id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleAddToCart(product.id)
                    }}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
