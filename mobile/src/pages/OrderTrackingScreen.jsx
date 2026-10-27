import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import { OrderLifecycleStepper, OrderTimeline } from '../components/OrderTimeline'
import OrderActions from '../components/OrderActions'
import LoadingSpinner from '../components/LoadingSpinner'
import { STATUS_LABELS, STATUS_NORMALIZE } from '../../../src/config/orderLifecycle'
import { MapPin, Package } from '../icons'

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route.params
  const { user } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [allowedActions, setAllowedActions] = useState([])

  useEffect(() => {
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    setLoading(true)
    try {
      const data = await api.getOrderLifecycle(orderId)
      if (data.success) {
        setOrder(data.order)
        setAllowedActions(data.allowed_actions || [])
        setError(null)
      } else {
        setError(data.message || 'Order not found')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (payload) => {
    setActionLoading(true)
    try {
      const res = await api.performOrderAction(payload)
      if (res.success) {
        await loadOrder()
      }
      return res
    } catch (err) {
      return { success: false, message: 'Failed to perform action' }
    } finally {
      setActionLoading(false)
    }
  }

  const statusBadgeColor = (status) => {
    const normalized = STATUS_NORMALIZE[status] || status
    if (['completed', 'delivered'].includes(normalized)) return Colors.success
    if (['in_transit', 'assigned_to_logistics'].includes(normalized)) return Colors.primary
    if (['disputed', 'refunded', 'cancelled'].includes(normalized)) return Colors.danger
    if (['paid', 'seller_accepted'].includes(normalized)) return '#3b82f6'
    if (['quality_inspection', 'awaiting_seller_confirmation'].includes(normalized)) return Colors.warning
    return Colors.textMuted
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner text="Loading order details..." />
      </SafeAreaView>
    )
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Order not found'}</Text>
          <TouchableOpacity onPress={loadOrder} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const status = order.status || 'pending_payment'
  const label = STATUS_LABELS[STATUS_NORMALIZE[status] || status] || status

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.orderNumber}>Order #{order.order_number?.slice(-8) || order.id}</Text>
          <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor(status) + '20' }]}>
          <Text style={[styles.statusText, { color: statusBadgeColor(status) }]}>{label}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lifecycle</Text>
        <OrderLifecycleStepper status={status} />
      </View>

      <OrderActions order={order} allowedActions={allowedActions} onAction={handleAction} loading={actionLoading} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <OrderTimeline events={order.timeline || []} />
      </View>

      {order.shipping_address && (
        <Card style={styles.card}>
          <View style={styles.infoHeader}>
            <MapPin width={18} height={18} color={Colors.primary} />
            <Text style={styles.infoTitle}>Delivery Address</Text>
          </View>
          <Text style={styles.infoText}>{order.shipping_address}</Text>
        </Card>
      )}

      {order.items && (
        <Card style={styles.card}>
          <View style={styles.infoHeader}>
            <Package width={18} height={18} color={Colors.primary} />
            <Text style={styles.infoTitle}>Items</Text>
          </View>
          {order.items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetails}>{item.quantity}x TZS {(item.price || 0).toLocaleString()}</Text>
            </View>
          ))}
        </Card>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, padding: 16, paddingTop: 12,
  },
  orderNumber: { fontSize: 16, fontWeight: '700', color: Colors.white },
  date: { fontSize: 12, color: Colors.white, opacity: 0.85, marginTop: 2 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginLeft: 8 },
  infoText: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  card: { margin: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemName: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  itemDetails: { fontSize: 13, color: Colors.textMuted },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { fontSize: 15, color: Colors.danger, marginBottom: 12 },
  retryButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: Colors.white, fontWeight: '600' },
})
