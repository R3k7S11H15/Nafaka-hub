import React, { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { Package, Search, Filter, Loader2, Truck, User, MapPin, Building, Users } from 'lucide-react'
import api from '../services/api'
import { useSSE } from '../hooks/useSSE'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Button, Card, Input, StatusIndicator, EmptyState, LazyImage, Price, ErrorAlert } from '../components/UI'
import { LIFECYCLE_STAGES, normalizeStatus } from '../config/orderLifecycle'

const STATUS_FILTERS = ['all', 'pending_payment', 'buyer_marked_paid', 'paid', 'processing', 'in_transit', 'delivered', 'completed', 'cancelled', 'disputed', 'payment_rejected']

export default function MyOrders() {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [deliveryMap, setDeliveryMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const { user } = useAuth()
  const customerId = user?.id

  const fetchOrders = useCallback(async () => {
    if (!customerId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
     try {
      const ordersData = await api.getOrders(customerId)
      if (ordersData.success) {
        const orderList = ordersData.orders || []
        const mapped = orderList.map(o => ({
          id: o.order_number,
          orderId: o.id,
          date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '',
          status: o.status || 'pending',
          total: o.total_amount || 0,
          items: o.items || [],
          product: o.items?.[0]?.name || 'Product',
          image: o.items?.[0]?.image_url || '',
          fulfillment_status: o.fulfillment_status || null,
          requested_quantity: o.requested_quantity || null,
          fulfillments: o.fulfillments || [],
        }))
        setOrders(mapped)
      } else {
        setError(ordersData.message || 'Failed to load orders')
      }
      let tracking = []
      try {
        const trackingData = await api.getMyDeliveryTracking()
        tracking = trackingData?.deliveries || []
      } catch (trackingErr) {
        tracking = []
      }
      const map = {}
      tracking.forEach(t => { map[t.id] = t })
      setDeliveryMap(map)
    } catch (err) {
      setError('Failed to connect to server')
      toast.error('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  const { connected: sseConnected } = useSSE(
    customerId ? `/api/orders_realtime.php?customer_id=${customerId}` : null,
    {
      onMessage: (event) => {
        if (!event || event.type === 'error') return

        switch (event.type) {
          case 'order_update':
            if (event.data) {
              const updatedOrder = {
                id: event.data.order_number,
                orderId: event.data.id,
                date: event.data.created_at ? new Date(event.data.created_at).toISOString().split('T')[0] : '',
                status: event.data.status || 'pending',
                total: event.data.total_amount || 0,
                items: event.data.items || [],
                product: event.data.items?.[0]?.name || 'Product',
                image: event.data.items?.[0]?.image_url || '',
              }
              setOrders(prev => {
                const filtered = prev.filter(o => o.orderId !== updatedOrder.orderId)
    return [updatedOrder, ...filtered]
              })
            }
            break
          default:
            break
        }
      },
    }
  )

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const filtered = filter === 'all' ? orders : orders.filter((o) => normalizeStatus(o.status) === normalizeStatus(filter))

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage your purchases</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage your purchases</p>
        </div>
        <ErrorAlert title="Failed to load orders" message={error} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">
            Track and manage your purchases
            {sseConnected && <span className="ml-2 text-green-600 text-xs font-medium">(real-time)</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="hidden sm:block w-64">
            <Input placeholder="Search orders..." icon={Search} />
          </div>
          <Button variant="ghost" size="sm" icon={Filter}>Filter</Button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              filter === f ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
            }`}
          >
            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="shadow-card">
            <EmptyState
              icon={Package}
              title="No orders yet"
              description="You haven't placed any orders yet."
              action={() => {}}
              actionLabel="Start Shopping"
              actionAs={NavLink}
              actionTo="/products"
            />
          </Card>
        ) : (
          filtered.map((order) => {
            const delivery = deliveryMap[order.orderId]
            return (
            <Card key={`order-${order.id}`} className="shadow-card hover:shadow-elevated transition-shadow p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  {order.image ? (
                    <LazyImage
                      src={order.image.startsWith('http') ? order.image : `images/${order.image}`}
                      alt={order.product}
                      aspect="auto"
                      className="w-20 h-20"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-gray-300 m-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{order.product}</h3>
                      <p className="text-sm text-gray-500">Order #{order.id} · {order.date} · {order.items?.length || 1} item(s)</p>
                      {order.fulfillment_status && order.fulfillment_status !== 'pending' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            order.fulfillment_status === 'fully_fulfilled' ? 'bg-green-100 text-green-700' :
                            order.fulfillment_status === 'partially_fulfilled' ? 'bg-amber-100 text-amber-700' :
                            order.fulfillment_status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {order.fulfillment_status.replace(/_/g, ' ')}
                          </span>
                          {order.fulfillments?.length > 1 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              <Users className="w-3 h-3 mr-1" /> {order.fulfillments.length} sellers
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <StatusIndicator status={order.status} variant="pill" />
                  </div>

                  {/* Multi-seller fulfillment breakdown */}
                  {order.fulfillments && order.fulfillments.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                        <Building className="w-3 h-3" /> Fulfillment by Seller
                      </p>
                      <div className="space-y-2">
                        {order.fulfillments.map((f) => {
                          const delivered = f.status === 'delivered'
                          const cancelled = f.status === 'cancelled'
                          return (
                            <div key={`fulfillment-${f.seller_id}-${f.status}`} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-gray-700 truncate">{f.seller_name || `Seller #${f.seller_id}`}</span>
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  delivered ? 'bg-green-500' : cancelled ? 'bg-red-400' :
                                  f.status === 'shipped' ? 'bg-blue-500' :
                                  f.status === 'confirmed' ? 'bg-amber-500' : 'bg-gray-300'
                                }`} />
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-gray-600">{parseFloat(f.quantity).toFixed(0)}t</span>
                                <span className="text-gray-400">·</span>
                                <Price amount={f.total_price} className="text-xs" />
                                <span className={`text-xs capitalize ${delivered ? 'text-green-600' : cancelled ? 'text-red-500' : 'text-gray-400'}`}>{f.status}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Fulfillment progress bar */}
                      {(() => {
                        const totalQty = order.fulfillments.reduce((s, f) => s + parseFloat(f.quantity), 0)
                        const deliveredQty = order.fulfillments.filter(f => f.status === 'delivered').reduce((s, f) => s + parseFloat(f.quantity), 0)
                        const pct = totalQty > 0 ? Math.min(100, (deliveredQty / totalQty) * 100) : 0
                        if (totalQty === 0) return null
                        return (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>{deliveredQty.toFixed(0)} / {totalQty.toFixed(0)} tonnes delivered</span>
                              <span>{pct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                  {delivery && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery Status</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                        <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-gray-400" /> {delivery.delivery_status || delivery.status || 'Assigned'}</div>
                        {delivery.driver_name && <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /> {delivery.driver_name}</div>}
                        {delivery.vehicle_number && <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-gray-400" /> {delivery.vehicle_number} {delivery.vehicle_type ? `(${delivery.vehicle_type})` : ''}</div>}
                        {delivery.cargo_type && <div className="flex items-center gap-2"><Package className="w-4 h-4 text-gray-400" /> {delivery.cargo_type} {delivery.cargo_weight ? `${delivery.cargo_weight}t` : ''}</div>}
                        {delivery.pickup_location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> From: {delivery.pickup_location}</div>}
                        {delivery.delivery_address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> To: {delivery.delivery_address}</div>}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    <Price amount={order.total} />
                    <div className="flex gap-2">
                      <Button as={NavLink} to={`/tracking/${order.id}`} variant="outline" size="sm">
                        Track
                      </Button>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
