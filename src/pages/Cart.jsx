import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag, Loader2, ShoppingCart } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { Button, Card, Price, EmptyState } from '../components/UI'

export default function Cart() {
  const { cartItems, loading, updateQuantity, removeFromCart, totalItems, totalAmount } = useCart()
  const [updatingItem, setUpdatingItem] = useState(null)
  const [removingItem, setRemovingItem] = useState(null)
  const navigate = useNavigate()

  const handleQuantity = async (item, delta) => {
    const newQty = item.quantity + delta
    if (newQty < 1) return
    setUpdatingItem(item.product_id)
    await updateQuantity(item.product_id, newQty)
    setUpdatingItem(null)
  }

  const handleRemove = async (productId) => {
    setRemovingItem(productId)
    await removeFromCart(productId)
    setRemovingItem(null)
  }

  const handleCheckout = () => {
    navigate('/checkout')
  }

  const subtotal = totalAmount
  const shipping = 5000
  const total = subtotal + shipping

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-green-700 to-emerald-800 py-8 px-4 text-white">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-4 flex items-center gap-2 text-sm text-green-100">
            <NavLink to="/" className="transition-colors hover:text-white">Home</NavLink>
            <span>/</span>
            <span className="text-white font-medium">Shopping Cart</span>
          </nav>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-green-100">Review your selected products and proceed to checkout</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : cartItems.length === 0 ? (
          <Card className="p-12">
            <EmptyState
              icon={ShoppingBag}
              title="Your cart is empty"
              description="Looks like you haven't added any products yet."
              action={() => navigate('/products')}
              actionLabel="Browse Products"
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} hover border className="p-4 flex items-center gap-4">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {item.image_url ? (
                      <img
                        src={item.image_url.startsWith('http') ? item.image_url : `images/${item.image_url}`}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">No Image</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                    <Price amount={item.price} weight={item.weight} className="text-sm" />
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => handleQuantity(item, -1)}
                        disabled={updatingItem === item.product_id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-green-500/30"
                      >
                        {updatingItem === item.product_id ? <Loader2 className="h-4 w-4 animate-spin" /> : '−'}
                      </button>
                      <span className="font-medium text-gray-900 w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantity(item, 1)}
                        disabled={updatingItem === item.product_id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-green-500/30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <Price amount={item.price * item.quantity} weight={null} className="text-lg mb-2" />
                    <button
                      onClick={() => handleRemove(item.product_id)}
                      disabled={removingItem === item.product_id}
                      className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-red-500/30"
                      title="Remove from cart"
                    >
                      {removingItem === item.product_id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 h-5" />}
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24" border>
                <h2 className="text-xl font-semibold mb-6 text-gray-900">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({totalItems} items)</span>
                    <Price amount={subtotal} weight={null} className="font-medium" />
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span className="font-medium text-gray-900">TZS {shipping.toLocaleString()}</span>
                  </div>
                  {subtotal > 0 && subtotal < 100000 && (
                    <div className="flex justify-between text-sm text-yellow-700">
                      <span>Add TZS 100,000 for free shipping</span>
                      <span>{((100000 - subtotal)).toLocaleString()} remaining</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <Price amount={total} weight={null} className="text-green-600 text-xl" />
                  </div>
                </div>
                <Button variant="primary" size="lg" fullWidth icon={ShoppingCart} onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
                <NavLink
                  to="/products"
                  className="mt-3 block w-full text-center text-sm font-medium text-green-600 hover:text-green-700 rounded-lg py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-green-500/30"
                >
                  Continue Shopping
                </NavLink>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
