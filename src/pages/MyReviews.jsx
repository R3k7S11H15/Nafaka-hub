import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Star, ThumbsUp, MessageSquare, Package, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function MyReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getOrders()
        if (!mounted) return
        const list = res?.data || res?.orders || res || []
        const flattened = []
        list.forEach(order => {
          const items = order.items || order.order_items || []
          items.forEach((item, i) => {
            if (item.review || item.rating) {
              flattened.push({
                id: item.id || `${order.id || order.order_id}-${i}`,
                product: item.product_name || item.name || 'Product',
                rating: item.rating || 0,
                comment: item.review || item.comment || '',
                date: order.created_at || order.date || '',
                helpful: item.helpful_count || 0,
              })
            }
          })
        })
        setReviews(flattened)
      } catch {
        if (mounted) setReviews([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
        <p className="text-gray-500 mt-1">Manage your product and seller reviews</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">You haven't written any reviews yet.</p>
          <NavLink to="/orders" className="inline-block px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
            View your orders to write a review
          </NavLink>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.product}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{review.date}</span>
              </div>
              {review.comment && <p className="text-gray-600 mt-4 ml-16">{review.comment}</p>}
              <div className="flex items-center gap-4 mt-4 ml-16">
                <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-green-600 transition-colors">
                  <ThumbsUp className="w-4 h-4" /> Helpful ({review.helpful})
                </button>
                <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                  <MessageSquare className="w-4 h-4" /> Reply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
