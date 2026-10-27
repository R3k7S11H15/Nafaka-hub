import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Truck, MapPin, Navigation, Check, Clock } from '../icons'

const STATUS_STEPS = ['assigned', 'picked_up', 'in_transit', 'delivered']

export default function LogisticsActiveDeliveriesScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadDeliveries = async () => {
    try {
      const data = await api.getMyDeliveries()
      setDeliveries(data?.deliveries || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load deliveries')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadDeliveries() }, [])

  const updateStatus = async (id, status) => {
    try {
      await api.updateDeliveryStatus(id, status)
      Alert.alert('Success', `Status updated to ${status}`)
      loadDeliveries()
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to update status')
    }
  }

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('deliver')) return '#16a34a'
    if (s.includes('transit')) return '#3b82f6'
    if (s.includes('pending')) return '#f59e0b'
    if (s.includes('cancel')) return '#ef4444'
    return Colors.textMuted
  }

  const getStatusIndex = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('deliver')) return 3
    if (s.includes('transit')) return 2
    if (s.includes('pick')) return 1
    if (s.includes('assign')) return 0
    return -1
  }

  const renderItem = ({ item }) => {
    const statusIndex = getStatusIndex(item.status)
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderNumber}>Delivery #{item.order_number || item.order_id || item.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status || '—'}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          {STATUS_STEPS.map((step, idx) => (
            <View key={step} style={styles.progressStep}>
              <View style={[styles.progressDot, { backgroundColor: statusIndex >= idx ? Colors.primary : Colors.border }]}>
                {statusIndex >= idx && <Check width={12} height={12} color={Colors.white} />}
              </View>
              <Text style={[styles.progressLabel, { color: statusIndex >= idx ? Colors.text : Colors.textMuted }]}>{step.replace('_', ' ')}</Text>
              {idx < STATUS_STEPS.length - 1 && <View style={[styles.progressLine, { backgroundColor: statusIndex > idx ? Colors.primary : Colors.border }]} />}
            </View>
          ))}
        </View>

        <View style={styles.details}>
          {item.pickup_location && (
            <View style={styles.row}>
              <MapPin width={16} height={16} color={Colors.textMuted} />
              <Text style={styles.rowText}>From: {item.pickup_location}</Text>
            </View>
          )}
          {(item.delivery_address || item.destination) && (
            <View style={styles.row}>
              <Navigation width={16} height={16} color={Colors.textMuted} />
              <Text style={styles.rowText}>To: {item.delivery_address || item.destination}</Text>
            </View>
          )}
          {item.driver_name && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Driver:</Text>
              <Text style={styles.rowText}>{item.driver_name}</Text>
            </View>
          )}
          {item.cargo_type && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Cargo:</Text>
              <Text style={styles.rowText}>{item.cargo_type} {item.cargo_weight ? `(${item.cargo_weight}t)` : ''}</Text>
            </View>
          )}
        </View>

        <View style={styles.statusButtons}>
          {STATUS_STEPS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusButton, (item.status || '').toLowerCase() === status && { backgroundColor: Colors.primary }]}
              onPress={() => updateStatus(item.id, status)}
            >
              <Text style={[styles.statusButtonText, (item.status || '').toLowerCase() === status && { color: Colors.white }]}>
                {status.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading active deliveries...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Active Deliveries</Text>
        <Text style={styles.headerSubtitle}>{deliveries.length} active</Text>
      </View>
      <FlatList
        data={deliveries}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDeliveries() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Truck width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No active deliveries</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, backgroundColor: Colors.primary },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  headerSubtitle: { fontSize: 14, color: Colors.white + 'cc', marginTop: 4 },
  listContent: { padding: 16 },
  card: { marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingVertical: 8 },
  progressStep: { flex: 1, alignItems: 'center', position: 'relative' },
  progressDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  progressLabel: { fontSize: 10, marginTop: 4, textTransform: 'capitalize' },
  progressLine: { position: 'absolute', top: 12, left: '50%', width: '100%', height: 2, zIndex: -1 },
  details: { gap: 8, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 14, color: Colors.textMuted, minWidth: 60 },
  rowText: { fontSize: 14, color: Colors.text, flex: 1 },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  statusButtonText: { fontSize: 12, color: Colors.text, textTransform: 'capitalize' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
})
