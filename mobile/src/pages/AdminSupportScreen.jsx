import React, { useState, useEffect, useContext } from 'react'
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import { MessageSquare, Search, Loader2, Ban } from '../icons'
import { ROLES } from '../../../src/config/roles'
import { useAdminGuard } from '../hooks/useAdminGuard'

export default function AdminSupportScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const hasAccess = useAdminGuard([ROLES.SUPERADMIN, ROLES.MARKETPLACE_ADMIN, ROLES.CUSTOMER_SUPPORT])

  const loadTickets = async () => {
    try {
      const data = await api.getAdminSupportTickets()
      let items = data?.tickets || data?.data?.tickets || []
      if (statusFilter) items = items.filter(t => t.status === statusFilter)
      setTickets(items)
    } catch (err) {
      Alert.alert('Error', 'Failed to load tickets')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadTickets() }, [statusFilter])

  const updateTicket = async (ticket) => {
    const statuses = ['open', 'in_progress', 'resolved', 'closed']
    Alert.alert(
      'Update Ticket Status',
      'Select new status:',
      statuses.map((s) => ({
        text: s.replace('_', ' ').toUpperCase(),
        onPress: async () => {
          try {
            await api.updateSupportTicket(ticket.id, { status: s })
            loadTickets()
          } catch (err) {
            Alert.alert('Error', 'Failed to update ticket')
          }
        },
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return '#ef4444'
      case 'in_progress': return '#f59e0b'
      case 'resolved': return '#10b981'
      case 'closed': return '#6b7280'
      default: return Colors.textMuted
    }
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.subject || 'No subject'}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
            {(item.status || '').replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.message} numberOfLines={2}>{item.message || 'No message'}</Text>
      {item.response && <Text style={styles.response}>Response: {item.response}</Text>}
      <View style={styles.cardFooter}>
        <Text style={styles.priority}>Priority: {(item.priority || 'medium').toUpperCase()}</Text>
        <TouchableOpacity onPress={() => updateTicket(item)} style={styles.actionBtn}>
          <Text style={styles.actionText}>Update</Text>
        </TouchableOpacity>
      </View>
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
        <Text style={styles.headerTitle}>Support Tickets</Text>
      </View>
      <View style={styles.filterContainer}>
        {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setStatusFilter(statusFilter === s ? '' : s)}
            style={[styles.filterBtn, statusFilter === s && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
              {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={tickets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTickets() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No tickets found</Text>
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
  filterContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  filterTextActive: { color: Colors.white },
  card: { marginHorizontal: 16, marginVertical: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  message: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  response: { fontSize: 12, color: Colors.primary, marginBottom: 8, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priority: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  actionBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  actionText: { color: Colors.white, fontWeight: '600', fontSize: 12 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  deniedTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  deniedText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
})
