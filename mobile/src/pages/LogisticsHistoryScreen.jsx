import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import { Clock, MapPin, Navigation, Truck } from '../icons'

export default function LogisticsHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadHistory = async () => {
    try {
      const data = await api.getDeliveryHistory()
      setHistory(data?.history || [])
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadHistory() }, [])

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>#{item.order_number || item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: Colors.success + '20' }]}>
          <Text style={[styles.statusText, { color: Colors.success }]}>Delivered</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        {(item.pickup_location || item.destination) && (
          <View style={styles.routeRow}>
            <Text style={styles.routeText}>{item.pickup_location || '—'} → {item.destination || item.delivery_address || '—'}</Text>
          </View>
        )}
        {item.cargo_type && (
          <View style={styles.row}>
            <Truck width={16} height={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{item.cargo_type} {item.cargo_weight ? `(${item.cargo_weight}t)` : ''}</Text>
          </View>
        )}
        {item.delivery_cost && (
          <Text style={styles.amount}>TZS {Number(item.delivery_cost).toLocaleString()}</Text>
        )}
        {item.created_at && (
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
        )}
      </View>
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <Text style={styles.headerSubtitle}>{history.length} completed</Text>
      </View>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHistory() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Clock width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No delivery history</Text>
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
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBody: { gap: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeText: { fontSize: 14, color: Colors.text, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowText: { fontSize: 14, color: Colors.text },
  amount: { fontSize: 16, fontWeight: 'bold', color: Colors.success, marginTop: 4 },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
})
