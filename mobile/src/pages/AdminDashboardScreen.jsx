import React, { useState, useEffect, useContext } from 'react'
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import {
  Users, Package, ShoppingCart, DollarSign, MessageSquare,
  ChevronRight, AlertCircle, Warehouse, Truck, ClipboardList
} from '../icons'
import { ROLES } from '../../../src/config/roles'
import { useAdminGuard } from '../hooks/useAdminGuard'

const ADMIN_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.MARKETPLACE_ADMIN,
  ROLES.VENDOR_ADMIN,
  ROLES.WAREHOUSE_MANAGER,
  ROLES.TRANSPORT_MANAGER,
  ROLES.CUSTOMER_SUPPORT,
  ROLES.FINANCE_ADMIN,
]

export default function AdminDashboardScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const hasAccess = useAdminGuard(ADMIN_ROLES)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    try {
      const data = await api.getSuperAdminStats()
      if (data.success) setStats(data)
    } catch (err) {
      Alert.alert('Error', 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasAccess) {
      loadStats()
    } else {
      setLoading(false)
    }
  }, [hasAccess])

  const role = user?.role

  const statsConfig = {
    [ROLES.SUPERADMIN]: [
      { label: 'Users', value: stats?.users || 0, icon: Users, color: '#15803d' },
      { label: 'Products', value: stats?.products || 0, icon: Package, color: '#2563eb' },
      { label: 'Orders', value: stats?.orders || 0, icon: ShoppingCart, color: '#d97706' },
      { label: 'Revenue', value: stats?.revenue || 0, icon: DollarSign, color: '#059669' },
    ],
    [ROLES.MARKETPLACE_ADMIN]: [
      { label: 'Products', value: stats?.products || 0, icon: Package, color: '#2563eb' },
      { label: 'Orders', value: stats?.orders || 0, icon: ShoppingCart, color: '#d97706' },
      { label: 'Reported', value: stats?.reportedProducts || 0, icon: AlertCircle, color: '#dc2626' },
    ],
    [ROLES.FINANCE_ADMIN]: [
      { label: 'Revenue', value: stats?.revenue || 0, icon: DollarSign, color: '#059669' },
      { label: 'Commissions', value: stats?.commissions || 0, icon: DollarSign, color: '#15803d' },
      { label: 'Payouts', value: stats?.payouts || 0, icon: ClipboardList, color: '#7c3aed' },
    ],
    [ROLES.CUSTOMER_SUPPORT]: [
      { label: 'Open Tickets', value: stats?.openTickets || 0, icon: MessageSquare, color: '#d97706' },
      { label: 'Disputes', value: stats?.disputes || 0, icon: AlertCircle, color: '#dc2626' },
    ],
    [ROLES.WAREHOUSE_MANAGER]: [
      { label: 'Bookings', value: stats?.warehouseBookings || 0, icon: Warehouse, color: '#059669' },
      { label: 'Inventory', value: stats?.inventoryItems || 0, icon: Package, color: '#2563eb' },
    ],
    [ROLES.TRANSPORT_MANAGER]: [
      { label: 'Active Deliveries', value: stats?.activeDeliveries || 0, icon: Truck, color: '#7c3aed' },
      { label: 'Drivers', value: stats?.drivers || 0, icon: Users, color: '#15803d' },
    ],
  }

  const menuItemsConfig = {
    [ROLES.SUPERADMIN]: [
      { icon: Users, label: 'Manage Users', screen: 'AdminUsers', color: Colors.primary },
      { icon: Package, label: 'Manage Products', screen: 'AdminProducts', color: '#2563eb' },
      { icon: ShoppingCart, label: 'Manage Orders', screen: 'AdminOrders', color: '#d97706' },
      { icon: DollarSign, label: 'Finance', screen: 'AdminFinance', color: '#059669' },
      { icon: MessageSquare, label: 'Support Tickets', screen: 'AdminSupport', color: '#dc2626' },
    ],
    [ROLES.MARKETPLACE_ADMIN]: [
      { icon: Package, label: 'Manage Products', screen: 'AdminProducts', color: '#2563eb' },
      { icon: ShoppingCart, label: 'Manage Orders', screen: 'AdminOrders', color: '#d97706' },
      { icon: MessageSquare, label: 'Support Tickets', screen: 'AdminSupport', color: '#dc2626' },
    ],
    [ROLES.FINANCE_ADMIN]: [
      { icon: DollarSign, label: 'Finance Overview', screen: 'AdminFinance', color: '#059669' },
      { icon: ClipboardList, label: 'Transactions', screen: 'AdminFinance', color: '#7c3aed' },
    ],
    [ROLES.CUSTOMER_SUPPORT]: [
      { icon: MessageSquare, label: 'Support Tickets', screen: 'AdminSupport', color: '#d97706' },
      { icon: AlertCircle, label: 'Disputes', screen: 'AdminSupport', color: '#dc2626' },
    ],
    [ROLES.WAREHOUSE_MANAGER]: [
      { icon: Warehouse, label: 'Warehouse Applications', screen: 'AdminWarehouse', color: '#059669' },
    ],
    [ROLES.TRANSPORT_MANAGER]: [
      { icon: Truck, label: 'Logistics Applications', screen: 'AdminLogistics', color: '#7c3aed' },
    ],
  }

  const currentStats = statsConfig[role] || statsConfig[ROLES.SUPERADMIN]
  const currentMenuItems = menuItemsConfig[role] || menuItemsConfig[ROLES.SUPERADMIN]

  if (!hasAccess) return null

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>
      <FlatList
        data={currentMenuItems}
        keyExtractor={(item) => item.screen}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
        ListHeaderComponent={
          <View style={styles.statsContainer}>
            <Text style={styles.sectionLabel}>Statistics</Text>
            <View style={styles.statsGrid}>
              {currentStats.map((stat, idx) => (
                <View key={idx} style={styles.statBox}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                    <stat.icon width={22} height={22} color={stat.color} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
              <item.icon width={24} height={24} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <ChevronRight width={20} height={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 16, paddingTop: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.white },
  statsContainer: { padding: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', color: Colors.textMuted, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: Colors.card, padding: 14, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, alignItems: 'center' },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text },
})
