import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Card, StatusIndicator, EmptyState, Price, ErrorAlert } from '../components/UI'
import { Building2, Package, Truck, CheckCircle, XCircle, Clock, Users, Loader2 } from 'lucide-react'
import api from '../services/api'

const FULFILLMENT_STATUS_CONFIG = {
  allocated: { color: 'bg-gray-100 text-gray-700', icon: Clock },
  confirmed: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  shipped: { color: 'bg-amber-100 text-amber-700', icon: Truck },
  delivered: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function FulfillmentDashboard() {
  const { user } = useAuth()
  const toast = useToast()
  const [fulfillments, setFulfillments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchFulfillments = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.getFulfillmentsBySeller(user.id, statusFilter === 'all' ? null : statusFilter, 100)
      if (data.success) {
        setFulfillments(data.fulfillments || [])
      } else {
        setError(data.message || 'Failed to load fulfillments')
      }
    } catch (err) {
      setError('Failed to connect to server')
      toast.error('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [user?.id, statusFilter, toast])

  useEffect(() => {
    fetchFulfillments()
  }, [fetchFulfillments])

  const handleUpdateStatus = async (fulfillmentId, newStatus) => {
    try {
      const data = await api.updateFulfillmentStatus(fulfillmentId, newStatus)
      if (data.success) {
        toast.success(`Fulfillment status updated to ${newStatus}`)
        fetchFulfillments()
      } else {
        toast.error(data.message || 'Failed to update status')
      }
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">My Fulfillments</h1>
        <ErrorAlert message={error} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Building2 className="w-8 h-8 text-green-600" />
          My Fulfillments
        </h1>
        <p className="text-gray-500 mt-1">Manage your order fulfillment allocations</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'allocated', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === f ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {fulfillments.length === 0 ? (
        <Card className="shadow-card">
          <EmptyState
            icon={Package}
            title="No fulfillments yet"
            description="You have no order fulfillment allocations."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {fulfillments.map((f) => {
            const cfg = FULFILLMENT_STATUS_CONFIG[f.status] || FULFILLMENT_STATUS_CONFIG.allocated
            const StatusIcon = cfg.icon
            return (
              <Card key={f.id} className="shadow-card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">Order #{f.order_number}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" /> {f.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {parseFloat(f.quantity).toFixed(0)} tonnes · TZS {parseFloat(f.total_price).toLocaleString()}
                        {f.unit_price && <span> · @ TZS {parseFloat(f.unit_price).toLocaleString()}/t</span>}
                      </p>
                      {f.tracking_number && (
                        <p className="text-xs text-gray-400 mt-1">Tracking: {f.tracking_number}</p>
                      )}
                      {f.notes && <p className="text-xs text-gray-500 mt-1">{f.notes}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Price amount={f.total_price} className="font-bold text-lg" />
                    {f.status === 'allocated' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(f.id, 'confirmed')}>
                          Confirm
                        </Button>
                      </div>
                    )}
                    {f.status === 'confirmed' && (
                      <Button size="sm" variant="primary" onClick={() => handleUpdateStatus(f.id, 'shipped')}>
                        <Truck className="w-3 h-3 mr-1" /> Mark Shipped
                      </Button>
                    )}
                    {f.status === 'shipped' && (
                      <Button size="sm" variant="primary" onClick={() => handleUpdateStatus(f.id, 'delivered')}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Mark Delivered
                      </Button>
                    )}
                    {(f.status === 'allocated' || f.status === 'confirmed') && (
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleUpdateStatus(f.id, 'cancelled')}>
                        <XCircle className="w-3 h-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}