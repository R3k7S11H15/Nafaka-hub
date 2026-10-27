import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Truck, MapPin, Navigation, Check, Clock, Navigation as NavIcon } from '../icons'

export default function DriverDashboardScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [locationForm, setLocationForm] = useState({ open: false, deliveryId: null, location: '' })

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
      Alert.alert('Success', `Status updated to ${status.replace('_', ' ')}`)
      loadDeliveries()
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to update status')
    }
  }

  const updateLocation = async () => {
    const { deliveryId, location } = locationForm
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location')
      return
    }
    try {
      await api.updateDeliveryLocation(deliveryId, location.trim())
      Alert.alert('Success', 'Location updated')
      setLocationForm({ open: false, deliveryId: null, location: '' })
      loadDeliveries()
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to update location')
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

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>Delivery #{item.order_number || item.order_id || item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status || '—'}</Text>
        </View>
      </View>

      <View style={styles.details}>
        {(item.pickup_location || item.destination) && (
          <View style={styles.row}>
            <MapPin width={16} height={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{item.pickup_location || '—'} → {item.destination || item.delivery_address || '—'}</Text>
          </View>
        )}
        {item.cargo_type && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Cargo:</Text>
            <Text style={styles.rowText}>{item.cargo_type} {item.cargo_weight ? `(${item.cargo_weight}t)` : ''}</Text>
          </View>
        )}
        {item.current_location && (
          <View style={styles.row}>
            <NavIcon width={16} height={16} color={Colors.primary} />
            <Text style={[styles.rowText, { color: Colors.primary }]}>Current: {item.current_location}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <Button title="Update Location" onPress={() => setLocationForm({ open: true, deliveryId: item.id, location: item.current_location || '' })} variant="secondary" style={styles.actionButton} icon={MapPin} />
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Update Status:</Text>
        <View style={styles.statusButtons}>
          {['assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'].map((status) => (
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
      </View>
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading deliveries...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <Text style={styles.headerSubtitle}>Manage your deliveries</Text>
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
            <Text style={styles.emptyText}>No assigned deliveries</Text>
          </View>
        }
      />

      {locationForm.open && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Location</Text>
            <TextInput
              style={styles.input}
              value={locationForm.location}
              onChangeText={(text) => setLocationForm({ ...locationForm, location: text })}
              placeholder="Enter current location"
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={() => setLocationForm({ open: false, deliveryId: null, location: '' })} variant="secondary" style={styles.modalButton} />
              <Button title="Update" onPress={updateLocation} variant="primary" style={styles.modalButton} />
            </View>
          </View>
        </View>
      )}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  details: { gap: 8, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 14, color: Colors.textMuted, minWidth: 60 },
  rowText: { fontSize: 14, color: Colors.text, flex: 1 },
  actionRow: { marginBottom: 12 },
  actionButton: { marginTop: 0 },
  statusRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  statusLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  statusButtonText: { fontSize: 12, color: Colors.text, textTransform: 'capitalize' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: Colors.text, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1 },
})
