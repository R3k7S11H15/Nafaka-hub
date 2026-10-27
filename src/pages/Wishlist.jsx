import React, { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { Heart, Trash2, Loader2, ShoppingCart, ChevronRight } from 'lucide-react'
import api from '../services/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Button, Card, RatingStars, Price, LazyImage, EmptyState, ErrorAlert } from '../components/UI'

export default function Wishlist() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [addingToCart, setAddingToCart] = useState(null)
  const { addToCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const customerId = user?.id

  const fetchWishlist = useCallback(async () => {
    if (!customerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.getWishlist(customerId)
      if (data.success) {
        setItems(data.wishlist || [])
      } else {
        setError(data.message || 'Failed to load wishlist')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const handleRemove = async (productId) => {
    if (!customerId) return
    setRemovingId(productId)
    try {
      const data = await api.removeFromWishlist(customerId, productId)
      if (data.success) {
        setItems((prev) => prev.filter((p) => p.product_id !== productId))
      }
    } catch (err) {
      console.error('Remove error:', err)
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddToCart = async (productId) => {
    setAddingToCart(productId)
    try {
      const data = await addToCart(productId, 1)
      if (data.success) {
        handleRemove(productId)
      }
    } catch (err) {
      console.error('Add to cart error:', err)
    } finally {
      setAddingToCart(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-700 to-emerald-800 py-12 px-4 text-white">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-4 flex items-center gap-2 text-sm text-green-100">
            <NavLink to="/" className="transition-colors hover:text-white">Home</NavLink>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">My Wishlist</span>
          </nav>
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <p className="text-green-100 mt-1">Products you've saved for later</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : error ? (
          <Card className="p-8">
            <ErrorAlert title="Failed to load wishlist" message={error} />
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-12">
            <EmptyState
              icon={Heart}
              title="Your wishlist is empty"
              description="Save items you love to easily find them later."
              action={() => {}}
              actionLabel="Browse Products"
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => {
              const rating = product.average_rating ? parseFloat(product.average_rating) : 0
              const imageUrl = product.image_url
                ? product.image_url.startsWith('http')
                  ? product.image_url
                  : `images/${product.image_url}`
                : undefined
              return (
                <Card key={product.product_id} hover border className="group flex flex-col overflow-hidden p-0">
                  <div className="relative">
                    <LazyImage
                      src={imageUrl}
                      alt={product.name}
                      aspect="16:9"
                      className="h-36"
                      placeholderText="No Image"
                    />
                    <button
                      onClick={() => handleRemove(product.product_id)}
                      disabled={removingId === product.product_id}
                      className="absolute top-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-500 backdrop-blur-sm hover:bg-red-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-red-500/30"
                      title="Remove from wishlist"
                    >
                      {removingId === product.product_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 p-5">
                    <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-green-700 transition-colors">{product.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{product.type}</p>
                    <RatingStars rating={rating} size="sm" />
                    <div className="mt-3 flex items-center justify-between">
                      <Price amount={product.price} weight={product.weight} className="text-lg" />
                    </div>
                  </div>
                  <div className="p-5 pt-0">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      icon={ShoppingCart}
                      loading={addingToCart === product.product_id}
                      disabled={addingToCart === product.product_id}
                      onClick={() => handleAddToCart(product.product_id)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
