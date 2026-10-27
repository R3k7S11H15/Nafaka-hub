import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Package, Truck, Users, DollarSign, Clock, ChevronRight } from '../icons'

export default function LogisticsDashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    available: 0,
    active: 0,
    completed: 0,
    earnings: 0,
  })

  const loadStats = async () => {
    try {
      const [requests, deliveries, history, earnings] = await Promise.all([
        api.getDeliveryRequests(),
        api.getMyDeliveries(),
        api.getDeliveryHistory(),
        api.getMyEarningsSummary(),
      ])
      setStats({
        available: requests?.requests?.length || 0,
        active: deliveries?.deliveries?.filter(d => ['in_transit', 'pending', 'assigned', 'picked_up'].includes((d.status || '').toLowerCase())).length || 0,
        completed: history?.history?.filter(h => (h.status || '').toLowerCase() === 'delivered').length || 0,
        earnings: earnings?.summary?.month || 0,
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
    { title: 'Available Deliveries', subtitle: `${stats.available} requests`, icon: Package, screen: 'LogisticsAvailableDeliveries', color: Colors.primary },
    { title: 'Active Deliveries', subtitle: `${stats.active} in progress`, icon: Truck, screen: 'LogisticsActiveDeliveries', color: '#f59e0b' },
    { title: 'Delivery History', subtitle: `${stats.completed} completed`, icon: Clock, screen: 'LogisticsHistory', color: '#10b981' },
    { title: 'My Vehicles', subtitle: 'Manage fleet', icon: Truck, screen: 'LogisticsVehicles', color: '#8b5cf6' },
    { title: 'My Drivers', subtitle: 'Driver management', icon: Users, screen: 'LogisticsDrivers', color: '#06b6d4' },
    { title: 'Earnings', subtitle: `TZS ${stats.earnings.toLocaleString()} this month`, icon: DollarSign, screen: 'LogisticsEarnings', color: '#16a34a' },
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
      <ChevronRight width={20} height={20} color={Colors.textMuted} />
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
        <Text style={styles.headerTitle}>Nafaka Hub Logistics</Text>
        <Text style={styles.headerSubtitle}>Welcome, {user?.name || 'Partner'}!</Text>
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
