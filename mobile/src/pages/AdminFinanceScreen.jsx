import React, { useState, useEffect, useContext } from 'react'
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import { DollarSign, Check, X, Clock, Loader2, Ban } from '../icons'
import { ROLES } from '../../../src/config/roles'
import { useAdminGuard } from '../hooks/useAdminGuard'

export default function AdminFinanceScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const hasAccess = useAdminGuard([ROLES.SUPERADMIN, ROLES.FINANCE_ADMIN])

  const loadWithdrawals = async () => {
    try {
      const data = await api.getAdminWithdrawals()
      setWithdrawals(data?.withdrawals || data?.data?.withdrawals || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load withdrawals')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadWithdrawals() }, [])

  const approveWithdrawal = async (item) => {
    Alert.alert('Approve Withdrawal', `Approve withdrawal of TZS ${Number(item.amount).toLocaleString()}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await api.approveWithdrawal(item.id, 'Approved via mobile')
            loadWithdrawals()
          } catch (err) {
            Alert.alert('Error', 'Failed to approve')
          }
        },
      },
    ])
  }

  const rejectWithdrawal = async (item) => {
    Alert.alert('Reject Withdrawal', 'Please provide a reason:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async (reason) => {
          if (!reason) {
            Alert.alert('Required', 'Please provide a reason')
            return
          }
          try {
            await api.rejectWithdrawal(item.id, reason)
            loadWithdrawals()
          } catch (err) {
            Alert.alert('Error', 'Failed to reject')
          }
        },
      },
    ])
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'completed': return '#10b981'
      case 'rejected': return '#ef4444'
      default: return Colors.textMuted
    }
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>Withdrawal #{item.id}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.amount}>TZS {Number(item.amount).toLocaleString()}</Text>
      <Text style={styles.customer}>Customer: #{item.customer_id}</Text>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => approveWithdrawal(item)} style={[styles.actionBtn, styles.approveBtn]}>
            <Check width={18} height={18} color={Colors.white} />
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => rejectWithdrawal(item)} style={[styles.actionBtn, styles.rejectBtn]}>
            <X width={18} height={18} color={Colors.white} />
            <Text style={styles.actionText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
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
        <Text style={styles.headerTitle}>Finance</Text>
      </View>
      <FlatList
        data={withdrawals}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWithdrawals() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No withdrawals found</Text>
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
  card: { marginHorizontal: 16, marginVertical: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text },
  amount: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  customer: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  date: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 8 },
  approveBtn: { backgroundColor: Colors.success },
  rejectBtn: { backgroundColor: Colors.danger },
  actionText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  deniedTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  deniedText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
})
