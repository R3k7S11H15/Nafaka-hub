import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Users, RefreshCw, DollarSign, Calendar } from '../icons'

export default function WarehouseCustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadCustomers = async () => {
    try {
      const data = await api.getMyWarehouseCustomers()
      if (data.success) setCustomers(data.customers || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load customers')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadCustomers() }, [])

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.customerName}>{item.full_name || 'Customer'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: Colors.success + '20' }]}>
          <Text style={[styles.statusText, { color: Colors.success }]}>Active</Text>
        </View>
      </View>
      <View style={styles.details}>
        {item.phone && <Text style={styles.detailText}>Phone: {item.phone}</Text>}
        <Text style={styles.detailText}>Bookings: {item.total_bookings || 0}</Text>
        <Text style={styles.detailText}>Total Spend: {item.total_spend ? `${Number(item.total_spend).toLocaleString()} TZS` : '—'}</Text>
      </View>
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <Text style={styles.headerSubtitle}>{customers.length} customers</Text>
      </View>
      <FlatList
        data={customers}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCustomers() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No customers yet</Text>
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
  customerName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  details: { gap: 4 },
  detailText: { fontSize: 14, color: Colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
})
