import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useSSE } from '../hooks/useSSE'
import { useAuth } from './AuthContext'

const CartContext = createContext()
export { CartContext }

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const { isAuthenticated, user } = useAuth()

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCartItems([])
      setTotalItems(0)
      setTotalAmount(0)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await api.getCart()
      if (data.success) {
        const items = data.cart || []
        setCartItems(items)
        const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0)
        const amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        setTotalItems(itemsCount)
        setTotalAmount(amount)
      }
    } catch {
      setCartItems([])
      setTotalItems(0)
      setTotalAmount(0)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  const sseUrl = isAuthenticated && user?.id ? `/api/cart_realtime.php?customer_id=${user.id}` : null
  const { connected: sseConnected } = useSSE(sseUrl, {
    onMessage: (event) => {
      if (event && event.items !== undefined && event.type !== 'error') {
        setCartItems(event.items)
        setTotalItems(event.totalItems || 0)
        setTotalAmount(event.totalAmount || 0)
      }
    },
  })

  const addToCart = async (productId, quantity = 1) => {
    const data = await api.addToCart(productId, quantity)
    if (data.success) {
      await fetchCart()
    }
    return data
  }

  const updateQuantity = async (productId, quantity) => {
    const data = await api.updateCartItem(productId, quantity)
    if (data.success) {
      await fetchCart()
    }
    return data
  }

  const removeFromCart = async (productId) => {
    const data = await api.removeFromCart(productId)
    if (data.success) {
      await fetchCart()
    }
    return data
  }

  const clearCart = async () => {
    const data = await api.clearCart()
    if (data.success) {
      await fetchCart()
    }
    return data
  }

  const value = {
    cartItems,
    loading,
    totalItems,
    totalAmount,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    realtimeConnected: sseConnected,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
