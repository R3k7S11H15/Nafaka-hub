import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Calendar, RefreshCw, Check, X } from '../icons'

export default function WarehouseBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadBookings = async () => {
    try {
      const data = await api.getMyWarehouseBookings()
      if (data.success) setBookings(data.bookings || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load bookings')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadBookings() }, [])

  const updateStatus = (id, status) => {
    Alert.alert('Update Status', `Set booking #${id} to ${status}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: () => { Alert.alert('Success', `Booking ${status}`); loadBookings() } },
    ])
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.bookingId}>#{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (item.status === 'active' || item.status === 'confirmed' ? Colors.success : Colors.warning) + '20' }]}>
          <Text style={[styles.statusText, { color: item.status === 'active' || item.status === 'confirmed' ? Colors.success : Colors.warning }]}>
            {item.status || '—'}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.detailText}>Customer: {item.customer_name || '—'}</Text>
        <Text style={styles.detailText}>Product: {item.product_type || '—'}</Text>
        <Text style={styles.detailText}>Quantity: {item.quantity || 0} tons</Text>
        <Text style={styles.detailText}>Period: {item.start_date} → {item.end_date}</Text>
        <Text style={styles.detailText}>Fee: {item.storage_fee ? `${Number(item.storage_fee).toLocaleString()} TZS` : '—'}</Text>
      </View>
      {(item.status === 'pending') && (
        <View style={styles.actionRow}>
          <Button title="Confirm" onPress={() => updateStatus(item.id, 'confirmed')} variant="primary" style={styles.actionButton} />
          <Button title="Reject" onPress={() => updateStatus(item.id, 'cancelled')} variant="secondary" style={styles.actionButton} />
        </View>
      )}
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookings</Text>
        <Text style={styles.headerSubtitle}>{bookings.length} total</Text>
      </View>
      <FlatList
        data={bookings}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBookings() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Calendar width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No bookings yet</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bookingId: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  details: { gap: 4, marginBottom: 12 },
  detailText: { fontSize: 14, color: Colors.text },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
})
