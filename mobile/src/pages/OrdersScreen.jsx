import React, { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Colors } from '../components/UI'
import { LIFECYCLE_STAGES, STATUS_LABELS, STATUS_NORMALIZE } from '../../../src/config/orderLifecycle'
import LoadingSpinner from '../components/LoadingSpinner'
import { Package, Clock, Check, Truck, MapPin, ShoppingBag, ChevronRight } from '../icons'

const ALL_STATUSES = ['all', 'pending_payment', 'paid', 'seller_accepted', 'in_transit', 'delivered', 'cancelled', 'disputed']
const STATUS_LABELS_MAP = {
  all: 'All',
  pending_payment: 'Pending',
  paid: 'Paid',
  seller_accepted: 'Accepted',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
}

const STATUS_COLORS = {
  pending_payment: '#f59e0b',
  paid: '#3b82f6',
  awaiting_seller_confirmation: '#8b5cf6',
  seller_accepted: '#8b5cf6',
  in_transit: '#10b981',
  delivered: '#16a34a',
  cancelled: '#ef4444',
  disputed: '#ef4444',
  refunded: '#6366f1',
  ready_for_dispatch: '#6366f1',
  assigned_to_logistics: '#3b82f6',
  quality_inspection: '#f59e0b',
}

export default function OrdersScreen({ navigation }) {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await api.getOrders(user.id)
      if (data.success) {
        setOrders(data.orders || [])
        setError(null)
      } else {
        setError(data.message || 'Failed to load orders')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = activeTab === 'all'
    ? orders
    : orders.filter((o) => STATUS_NORMALIZE[o.status] === STATUS_NORMALIZE[activeTab])

  const tabs = ALL_STATUSES.map((s) => ({ id: s, label: STATUS_LABELS_MAP[s] }))

  const renderOrder = ({ item }) => {
    const status = STATUS_NORMALIZE[item.status] || item.status
    const statusColor = STATUS_COLORS[status] || Colors.textMuted
    const statusLabel = STATUS_LABELS[status] || status

    return (
        <TouchableOpacity
          style={styles.orderCard}
          onPress={() => navigation.navigate('OrderTracking', { orderId: item.order_number || String(item.id) })}
          activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>#{item.order_number?.slice(-8) || item.id}</Text>
            <Text style={styles.orderDate}>Placed on {new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.orderItems}>
          {item.items?.slice(0, 3).map((product, idx) => (
            <View key={idx} style={styles.orderItem}>
              <View style={styles.orderItemImage}>
                <Package width={24} height={24} color={Colors.textMuted} />
              </View>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.orderItemDetails}>{product.quantity}x TZS {(product.price || 0).toLocaleString()}</Text>
              </View>
            </View>
          ))}
          {item.items?.length > 3 && (
            <Text style={styles.moreItemsText}>+{item.items.length - 3} more items</Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>TZS {(item.total_amount || 0).toLocaleString()}</Text>
          </View>
          <ChevronRight width={18} height={18} color={Colors.textMuted} />
        </View>

        {item.tracking_number && (
          <View style={styles.trackingInfo}>
            <Truck width={14} height={14} color={Colors.primary} />
            <Text style={styles.trackingText}>Track: {item.tracking_number}</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <FlatList
          data={tabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === item.id && styles.tabActive]}
              onPress={() => setActiveTab(item.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === item.id && styles.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {loading ? (
        <LoadingSpinner text="Loading orders..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag width={48} height={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptyText}>
            {activeTab === 'all'
              ? 'You haven\'t placed any orders yet'
              : `No ${STATUS_LABELS[activeTab]?.toLowerCase() || activeTab} orders`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id || item.order_number)}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={loadOrders}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 4,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginRight: 4,
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderItems: {
    marginBottom: 14,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  orderItemImage: {
    width: 48,
    height: 48,
    backgroundColor: Colors.background,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  orderItemDetails: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  moreItemsText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  trackingText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 15,
    color: Colors.danger,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
