import React, { useState, useEffect, useContext } from 'react'
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import { ShoppingCart, Search, ChevronRight, Loader2, Ban } from '../icons'
import { ROLES } from '../../../src/config/roles'
import { ACTIONS, STATUS_LABELS, ORDER_STATUSES } from '../../../src/config/orderLifecycle'
import { useAdminGuard } from '../hooks/useAdminGuard'

export default function AdminOrdersScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const hasAccess = useAdminGuard([ROLES.SUPERADMIN, ROLES.MARKETPLACE_ADMIN])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const loadOrders = async () => {
    try {
      const data = await api.getSuperAdminOrders({ status: statusFilter, limit: 50, offset: 0 })
      setOrders(data?.orders || data?.data?.orders || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadOrders() }, [statusFilter])

  const updateStatus = async (order) => {
    const statuses = ['pending_payment', 'paid', 'seller_accepted', 'in_transit', 'delivered', 'buyer_confirmation', 'completed', 'disputed', 'refunded', 'cancelled']
    Alert.alert(
      'Update Order Status',
      'Select new status:',
      statuses.map((s) => ({
        text: STATUS_LABELS[s] || s,
        onPress: async () => {
          try {
            await api.performOrderAction({ action: 'admin_intervene', order_id: order.order_number || order.id, target_status: s })
            loadOrders()
          } catch (err) {
            Alert.alert('Error', 'Failed to update status')
          }
        },
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'processing': return '#3b82f6'
      case 'shipped': return '#8b5cf6'
      case 'delivered': return '#10b981'
      case 'cancelled': return '#ef4444'
      default: return Colors.textMuted
    }
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>#{item.order_number || item.id}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.customer}>Customer: {item.customer_name || `#${item.customer_id}`}</Text>
      <Text style={styles.amount}>TZS {Number(item.total_amount || 0).toLocaleString()}</Text>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      <TouchableOpacity onPress={() => updateStatus(item)} style={styles.actionBtn}>
        <Text style={styles.actionText}>Update Status</Text>
      </TouchableOpacity>
    </Card>
  )

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.denied}>
          <Ban width={48} height={48} color={Colors.textMuted} />
          <Text style={styles.deniedTitle}>Access Denied</Text>
          <Text style={styles.deniedText}>You do not have permission to view this page.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
      </View>
      <View style={styles.filterContainer}>
        {['pending_payment', 'seller_accepted', 'in_transit', 'delivered', 'cancelled', 'disputed', 'refunded'].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatusFilter(statusFilter === s ? '' : s)}
            style={[styles.filterBtn, statusFilter === s && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {STATUS_LABELS[s] || s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 16, paddingTop: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.white },
  filterContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  filterTextActive: { color: Colors.white },
  card: { marginHorizontal: 16, marginVertical: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNumber: { fontSize: 16, fontWeight: '700', color: Colors.text },
  customer: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  amount: { fontSize: 16, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  date: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  actionBtn: { backgroundColor: Colors.primary, padding: 10, borderRadius: 8, alignItems: 'center' },
  actionText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  deniedTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  deniedText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
})
