import React, { useState } from 'react'
import { X, ShoppingCart } from 'lucide-react'
import api from '../services/api'

export default function MakeOfferModal({ conversationId, product = null, requestedQuantity = null, onClose, onCreated }) {
  const [quantity, setQuantity] = useState(product?.min_order_quantity || 1)
  const [unitPrice, setUnitPrice] = useState(product?.price || '')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const totalPrice = quantity * (parseFloat(unitPrice) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.createOffer(conversationId, {
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        delivery_location: deliveryLocation,
        delivery_date: deliveryDate || null,
        note,
      })
      if (res?.success) {
        onCreated?.({
          id: res.offer_id,
          quantity: parseFloat(quantity),
          unit_price: parseFloat(unitPrice),
          total_price: totalPrice,
          delivery_location: deliveryLocation,
          delivery_date: deliveryDate,
          note,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
      } else {
        setError(res?.message || 'Failed to create offer')
      }
    } catch (err) {
      setError(err?.message || 'Failed to create offer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Make an Offer</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {product && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{product.name}</p>
                {product.price && (
                  <p className="text-sm text-gray-600">TZS {Math.round(product.price).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="px-3 py-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>
          )}

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
               Quantity {requestedQuantity && <span className="text-gray-500 text-xs">(Buyer requested: {requestedQuantity} tonnes)</span>}
             </label>
             {requestedQuantity && (
               <p className="text-xs text-gray-500 mb-2">You can offer up to {requestedQuantity} tonnes. Partial offers are accepted.</p>
             )}
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (TZS)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
              placeholder="e.g. 85000"
              required
            />
          </div>

          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Total Price</p>
            <p className="text-xl font-bold text-green-700">TZS {Math.round(totalPrice).toLocaleString()}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Location</label>
            <input
              type="text"
              value={deliveryLocation}
              onChange={(e) => setDeliveryLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
              placeholder="Where should delivery be made?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
              placeholder="Any special requests or questions..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !quantity || !unitPrice}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {submitting ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
