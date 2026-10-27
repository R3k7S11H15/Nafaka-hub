import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Package, Truck, Calendar, DollarSign, Users, Warehouse, RefreshCw, Loader2 } from '../icons'

export default function WarehouseInventoryScreen({ navigation }) {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadInventory = async () => {
    try {
      const data = await api.getMyWarehouseInventory()
      if (data.success) setInventory(data.inventory || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load inventory')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadInventory() }, [])

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.product_name || '—'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (Number(item.quantity || 0) === 0 ? Colors.danger : Colors.success) + '20' }]}>
          <Text style={[styles.statusText, { color: Number(item.quantity || 0) === 0 ? Colors.danger : Colors.success }]}>
            {Number(item.quantity || 0) === 0 ? 'Critical' : 'Good'}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.detailText}>Warehouse: {item.warehouse_name || '—'}</Text>
        <Text style={styles.detailText}>Quantity: {item.quantity || 0}</Text>
        <Text style={styles.detailText}>Min Threshold: {item.min_threshold || 0}</Text>
      </View>
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <Text style={styles.headerSubtitle}>{inventory.length} items</Text>
      </View>
      <FlatList
        data={inventory}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInventory() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Warehouse width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No inventory data</Text>
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
  productName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  details: { gap: 4 },
  detailText: { fontSize: 14, color: Colors.text },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
})
