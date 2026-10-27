import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Card, StatusIndicator, ErrorAlert } from '../components/UI'
import { OrderStatusBadge, OrderLifecycleStepper, OrderTimeline } from '../components/OrderTimeline'
import OrderActions from '../components/OrderActions'
import api from '../services/api'
import { useSSE } from '../hooks/useSSE'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function OrderTracking() {
  const { orderId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [allowedActions, setAllowedActions] = useState([])
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchOrder = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.getOrderLifecycle(orderId)
      if (res?.success) {
        const o = res.order
        setOrder(o)
        setTimeline(res.timeline || [])
        setAllowedActions(res.allowed_actions || [])
      } else {
        setError(res?.message || 'Order not found')
      }
    } catch {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  const { connected: sseConnected } = useSSE(
    user?.id ? `/api/orders_realtime.php?customer_id=${user.id}` : null,
    {
      onMessage: (event) => {
        if (!event || event.type === 'order_update' || event.type === 'order_update') {
          // Refresh the full lifecycle view on any live update.
          fetchOrder()
        }
      },
    }
  )

  const handleAction = async (payload) => {
    setActionLoading(true)
    try {
      const res = await api.performOrderAction(payload)
      if (res?.success) {
        await fetchOrder()
      }
      return res
    } catch (err) {
      return { success: false, message: err.message || 'Failed to perform action' }
    } finally {
      setActionLoading(false)
    }
  }

  const productName = order?.items?.[0]?.name || 'Product'
  const orderNumber = order?.order_number || orderId
  const orderStatus = order?.status || 'pending_payment'

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
          <p className="text-gray-500 mt-1">Order {orderNumber}</p>
        </div>
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading order details...
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
        <ErrorAlert title="Failed to load order" message={error} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Tracking</h1>
          <p className="text-gray-500 mt-1">
            Order {orderNumber}
            {sseConnected && <span className="ml-2 text-green-600 text-xs font-medium">(real-time)</span>}
          </p>
        </div>
        <OrderStatusBadge status={orderStatus} />
      </div>

      <Card className="shadow-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{productName}</h2>
            <p className="text-gray-500">
              {order.items?.length || 1} item(s) · TZS {Number(order.total_amount || 0).toLocaleString()}
            </p>
          </div>
          <OrderActions order={order} allowedActions={allowedActions} onAction={handleAction} loading={actionLoading} />
        </div>

        <OrderLifecycleStepper status={orderStatus} />
      </Card>

      <Card className="shadow-card p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline</h2>
        <OrderTimeline events={timeline} />
      </Card>

      <Card className="shadow-card p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Delivery Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Detail icon={StatusIndicator} label="Status" value={<OrderStatusBadge status={orderStatus} />} />
          <Detail label="Payment" value={order.payment_status || order.payment_method || '—'} />
          <Detail label="Destination" value={order.shipping_address || '—'} />
          {order.assigned_logistics_provider_id && <Detail label="Logistics" value={`Provider #${order.assigned_logistics_provider_id}`} />}
          {order.tracking_number && <Detail label="Tracking" value={order.tracking_number} />}
        </div>
      </Card>
    </div>
  )
}

function Detail({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  )
}
