import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Warehouse, Package, BarChart3, Calendar, DollarSign, Users, Truck, Check, X } from '../icons'

export default function WarehouseDashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ capacity: 0, available: 0, bookings: 0, revenue: 0 })

  const loadStats = async () => {
    try {
      const [invData, bookData] = await Promise.all([
        api.getMyWarehouseInventory(),
        api.getMyWarehouseBookings()
      ])
      const inventory = invData?.inventory || []
      const bookings = bookData?.bookings || []
      const warehouses = bookData?.warehouses || []
      const totalCapacity = warehouses.reduce((s, w) => s + Number(w.capacity_tonnes || 0), 0)
      const totalAvailable = warehouses.reduce((s, w) => s + Number(w.available_space || 0), 0)
      const totalStock = inventory.reduce((s, i) => s + Number(i.quantity || 0), 0)
      setStats({
        capacity: totalCapacity,
        available: totalAvailable,
        bookings: bookings.filter(b => ['pending', 'confirmed', 'active'].includes((b.status || '').toLowerCase())).length,
        revenue: bookings.reduce((s, b) => s + Number(b.storage_fee || 0), 0),
      })
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  const menuItems = [
    { title: 'Inventory', subtitle: 'Stock management', icon: Package, screen: 'WarehouseInventory', color: Colors.primary },
    { title: 'Storage Spaces', subtitle: 'Capacity management', icon: Warehouse, screen: 'WarehouseSpaces', color: '#f59e0b' },
    { title: 'Inbound', subtitle: 'Confirm arrivals', icon: Truck, screen: 'WarehouseInbound', color: '#10b981' },
    { title: 'Outbound', subtitle: 'Approve releases', icon: Truck, screen: 'WarehouseOutbound', color: '#ef4444' },
    { title: 'Bookings', subtitle: 'Storage bookings', icon: Calendar, screen: 'WarehouseBookings', color: '#8b5cf6' },
    { title: 'Customers', subtitle: 'Customer management', icon: Users, screen: 'WarehouseCustomers', color: '#06b6d4' },
    { title: 'Earnings', subtitle: `TZS ${stats.revenue.toLocaleString()}`, icon: DollarSign, screen: 'WarehouseEarnings', color: '#16a34a' },
  ]

  const renderMenuItem = ({ item }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
        <item.icon width={24} height={24} color={item.color} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nafaka Hub Warehouse</Text>
        <Text style={styles.headerSubtitle}>Welcome, {user?.name || 'Manager'}!</Text>
      </View>
      <FlatList
        data={menuItems}
        renderItem={renderMenuItem}
        keyExtractor={item => item.screen}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats() }} colors={[Colors.primary]} />}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, backgroundColor: Colors.primary },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.white },
  headerSubtitle: { fontSize: 14, color: Colors.white + 'cc', marginTop: 4 },
  listContent: { padding: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  menuIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  menuSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
})
