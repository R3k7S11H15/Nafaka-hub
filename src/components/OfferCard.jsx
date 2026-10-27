import React from 'react'
import { CheckCircle, XCircle, ArrowLeftRight, Clock } from 'lucide-react'
import { Price } from '../components/UI'

const STATUS_CONFIG = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    label: 'Pending',
  },
  accepted: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    label: 'Accepted',
  },
  rejected: {
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    label: 'Rejected',
  },
  countered: {
    color: 'bg-blue-100 text-blue-800',
    icon: ArrowLeftRight,
    label: 'Countered',
  },
  expired: {
    color: 'bg-gray-100 text-gray-500',
    icon: Clock,
    label: 'Expired',
  },
  cancelled: {
    color: 'bg-gray-300 text-gray-600',
    icon: XCircle,
    label: 'Cancelled',
  },
}

export default function OfferCard({ offer, currentUser, onAction }) {
  if (!offer) return null

  const status = offer.status || 'pending'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = cfg.icon

  const isBuyer = String(offer.buyer_id) === String(currentUser?.id)
  const isSeller = String(offer.seller_id) === String(currentUser?.id)
  const canAct = isSeller && status === 'pending' || isBuyer && status === 'countered' || status === 'pending'

  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            <Icon className="w-3 h-3" /> {cfg.label}
          </span>
          <span className="text-xs text-gray-500">
            Offer #{offer.id}
          </span>
        </div>
        <Price amount={offer.total_price} className="text-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className="text-gray-500">Quantity:</span>
          <span className="font-medium text-gray-900 ml-1">{offer.quantity}</span>
        </div>
        <div>
          <span className="text-gray-500">Unit Price:</span>
          <span className="font-medium text-gray-900 ml-1">TZS {Number(offer.unit_price).toLocaleString()}</span>
        </div>
        {offer.delivery_location && (
          <div className="col-span-2">
            <span className="text-gray-500">Delivery to:</span>
            <span className="font-medium text-gray-900 ml-1">{offer.delivery_location}</span>
          </div>
        )}
        {offer.delivery_date && (
          <div>
            <span className="text-gray-500">Delivery Date:</span>
            <span className="font-medium text-gray-900 ml-1">{new Date(offer.delivery_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {offer.note && (
        <p className="text-sm text-gray-600 mb-3 break-words">{offer.note}</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>From: {isBuyer ? offer.buyer_name : offer.seller_name}</span>
        <span>To: {isBuyer ? offer.seller_name : offer.buyer_name}</span>
      </div>

      {canAct && (
        <div className="flex gap-2 mt-3">
          {status === 'pending' && isSeller && (
            <>
              <button
                onClick={() => onAction(offer.id, 'accepted')}
                className="flex-1 text-center py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={() => onAction(offer.id, 'rejected')}
                className="flex-1 text-center py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          {status === 'countered' && isBuyer && (
            <button
              onClick={() => onAction(offer.id, 'accepted')}
              className="flex-1 text-center py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              Accept Counter Offer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
