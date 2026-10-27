import React, { useState, useEffect } from 'react'
import { useParams, NavLink, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Truck, Shield, ArrowLeft, CheckCircle, Leaf, MessageSquare, Loader2,
  BarChart2
} from 'lucide-react'
import api from '../services/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, RatingStars, Price, Badge, ErrorAlert, LazyImage } from '../components/UI'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')
  const [addingToCart, setAddingToCart] = useState(false)
  const [cartSuccess, setCartSuccess] = useState(false)
  const [messagingSeller, setMessagingSeller] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const data = await api.getProduct(id)
      if (data.success && data.product) {
        setProduct(data.product)
        setError(null)
      } else {
        setError(data.message || 'Product not found')
      }
    } catch {
      setError('Failed to load product')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    if (!product) return
    setAddingToCart(true)
    try {
      const data = await addToCart(product.id, quantity)
      if (data.success) {
        setCartSuccess(true)
        setTimeout(() => setCartSuccess(false), 2000)
      }
    } catch (err) {
      console.error('Add to cart error:', err)
    } finally {
      setAddingToCart(false)
    }
  }

  const handleBuyNow = async () => {
    if (!product) return
    setAddingToCart(true)
    try {
      const data = await addToCart(product.id, quantity)
      if (data.success) {
        navigate('/checkout')
      }
    } catch (err) {
      console.error('Buy now error:', err)
    } finally {
      setAddingToCart(false)
    }
  }

  const handleMessageSeller = async () => {
    if (!product) return
    if (product.seller_id === user?.id) {
      navigate('/messages')
      return
    }
    setMessagingSeller(true)
    try {
      const res = await api.openConversation(product.seller_id, product.id, null, quantity)
      if (res?.conversation_id) {
        navigate(`/messages/${res.conversation_id}`)
      } else if (res?.message) {
        setError(res.message)
      }
    } catch (err) {
      setError(err?.message || 'Failed to start conversation')
    } finally {
      setMessagingSeller(false)
    }
  }


  const decrement = () => setQuantity(Math.max(1, quantity - 1))
  const increment = () => setQuantity(quantity + 1)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-gradient-to-r from-green-700 to-emerald-800 py-12 px-4 text-white">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-3xl font-bold">Product Not Found</h1>
            <p className="text-green-100">{error}</p>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">
          <ErrorAlert title="Error loading product" message={error} />
          <div className="mt-6">
            <NavLink to="/products" className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 transition">
              <ArrowLeft className="h-4 w-4" /> Back to Products
            </NavLink>
          </div>
        </main>
      </div>
    )
  }

  const displayImage = product.image_url
    ? product.image_url.startsWith('http')
      ? product.image_url
      : product.image_url.startsWith('/')
        ? product.image_url
        : `/images/${product.image_url}`
    : undefined

  const displayPrice =
    product.discount_price && product.discount_price > 0 ? product.discount_price : product.price
  const originalPrice = product.discount_price && product.discount_price > 0 ? product.price : null
  const discountPercent = originalPrice ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100) : 0
  const inStock = (product.stock_quantity || 0) > 0
  const rating = product.average_rating ? parseFloat(product.average_rating) : 0
  const thumbnails = displayImage ? [displayImage, displayImage, displayImage] : []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-700 to-emerald-800 py-12 px-4 text-white">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-4 flex items-center gap-2 text-sm text-green-100">
            <NavLink to="/" className="transition-colors hover:text-white">Home</NavLink>
            <span>/</span>
            <NavLink to="/products" className="transition-colors hover:text-white">Products</NavLink>
            <span>/</span>
            <span className="text-white font-medium">{product.name}</span>
          </nav>
          <h1 className="text-3xl font-bold">{product.name}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <NavLink to="/products" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Products</span>
        </NavLink>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex gap-4">
            <div className="hidden sm:flex sm:flex-col sm:gap-3 sm:w-20">
              {thumbnails.map((_, idx) => (
                <div
                  key={idx}
                  className="h-20 w-20 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 cursor-pointer hover:border-green-500 transition-colors"
                >
                  {displayImage ? (
                    <img src={displayImage} alt={`${product.name} thumbnail ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex-1">
              <LazyImage
                src={displayImage}
                alt={product.name}
                aspect="1:1"
                className="h-80 sm:h-96 w-full"
                placeholderText="No Image"
              />
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <Badge variant="green" size="sm">
                {product.type || product.category_id}
              </Badge>
              <RatingStars rating={rating} reviewCount={product.review_count || 0} size="md" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Leaf className="h-4 w-4 text-green-600" />
              <span>Sold by Vendor #{product.seller_id}</span>
              {inStock ? (
                <Badge variant="success" size="sm" className="ml-2">
                  <CheckCircle className="h-3 w-3" /> In Stock
                </Badge>
              ) : (
                <Badge variant="danger" size="sm" className="ml-2">Out of Stock</Badge>
              )}
            </div>

            <div className="mb-6">
              {originalPrice ? (
                <div className="flex items-center gap-3">
                  <Price
                    amount={displayPrice}
                    weight={product.weight}
                    sale
                    saleAmount={displayPrice}
                    className="text-3xl"
                  />
                  <Badge variant="danger" size="md">Save {discountPercent}%</Badge>
                </div>
              ) : (
                <Price amount={product.price} weight={product.weight} className="text-3xl" />
              )}
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">{product.description || 'Premium quality agricultural product sourced directly from farmers.'}</p>

            <Card className="grid grid-cols-2 gap-3 p-3 mb-6" border>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Warehouse</p>
                <p className="text-sm font-medium text-gray-900">{product.warehouse_location || 'Central Warehouse'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Region</p>
                <p className="text-sm font-medium text-gray-900">{product.origin_region || 'Morogoro'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Quality Grade</p>
                <p className="text-sm font-medium text-gray-900">{product.quality_grade || 'Grade 1'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Moisture</p>
                <p className="text-sm font-medium text-gray-900">{product.moisture_level || '12%'}</p>
              </div>
            </Card>

            <div className="mb-6 flex items-center gap-4">
              <span className="font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button
                  onClick={decrement}
                  disabled={!inStock}
                  className="p-2.5 hover:bg-gray-50 transition-colors rounded-l-lg disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-green-500/30"
                >
                  <span className="text-gray-600 font-bold text-lg">−</span>
                </button>
                <span className="px-4 py-2.5 font-medium text-gray-900 w-12 text-center">{quantity}</span>
                <button
                  onClick={increment}
                  disabled={!inStock || quantity >= (product.stock_quantity || 0)}
                  className="p-2.5 hover:bg-gray-50 transition-colors rounded-r-lg disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-green-500/30"
                >
                  <span className="text-gray-600 font-bold text-lg">+</span>
                </button>
              </div>
            </div>

            <Card className="p-4 mb-6 border border-gray-100">
              <p className="text-lg font-semibold text-gray-900">
                Total: <span className="text-green-600">TZS {(displayPrice * quantity).toLocaleString()}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">Delivery: {product.delivery_time || '2-3 business days'}</p>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={ShoppingCart}
                loading={addingToCart}
                disabled={!inStock || addingToCart}
                onClick={handleAddToCart}
              >
                {cartSuccess ? 'Added!' : addingToCart ? 'Adding...' : 'Add to Cart'}
              </Button>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              disabled={!inStock || addingToCart}
              onClick={handleBuyNow}
            >
              Buy Now
            </Button>
            <Button
              variant="ghost"
              size="lg"
              icon={MessageSquare}
              loading={messagingSeller}
              onClick={handleMessageSeller}
            >
              {messagingSeller ? 'Messaging...' : 'Message Seller'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={BarChart2}
              onClick={() => {
                if (!product) return
                if (product.seller_id === user?.id) return
                api.openConversation(product.seller_id, product.id, null, quantity).then((res) => {
                  if (res?.conversation_id) {
                    navigate(`/messages/${res.conversation_id}?offer=true`)
                  }
                })
              }}
            >
              Make Offer
            </Button>
            </div>

            <Card className="p-6" border>
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Truck className="h-5 w-5 text-green-600" />
                  <span>Free delivery on orders over TZS 100,000</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span>Secure payment and buyer protection</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Quality guaranteed or your money back</span>
                </div>
              </div>
            </Card>

            <Card className="mt-6 p-0 overflow-hidden" border>
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`flex-1 py-4 text-center text-sm font-medium transition-all ${
                    activeTab === 'description'
                      ? 'text-green-700 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`flex-1 py-4 text-center text-sm font-medium transition-all ${
                    activeTab === 'reviews'
                      ? 'text-green-700 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Reviews ({product.review_count || 0})
                </button>
              </div>
              <div className="p-6">
                {activeTab === 'description' ? (
                  <p className="text-gray-600 leading-relaxed">{product.description || 'Premium quality agricultural product sourced directly from farmers.'}</p>
                ) : (
                  <div className="space-y-4">
                    <RatingStars rating={rating} reviewCount={product.review_count || 0} size="lg" />
                    <p className="text-gray-500">No detailed reviews yet. Be the first to share your experience!</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
