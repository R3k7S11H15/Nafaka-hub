import React, { useState, useEffect, useContext } from 'react'
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import { Truck, Check, X, Clock, ChevronRight, Ban } from '../icons'
import { ROLES } from '../../../src/config/roles'
import { useAdminGuard } from '../hooks/useAdminGuard'

export default function AdminLogisticsScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('pending')

  const hasAccess = useAdminGuard([ROLES.SUPERADMIN, ROLES.TRANSPORT_MANAGER])

  const loadApplications = async () => {
    try {
      const data = await api.getLogisticsApplications(filter)
      if (data.success) setApplications(data.applications || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load applications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadApplications() }, [filter])

  const handleApprove = async (id) => {
    Alert.prompt('Approval Notes (optional)', 'Add any notes for the applicant:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async (notes) => {
          try {
            const data = await api.approveLogisticsApplication(id, notes)
            if (data.success) {
              Alert.alert('Success', 'Application approved')
              loadApplications()
            } else {
              Alert.alert('Error', data.message)
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to approve application')
          }
        },
      },
    ])
  }

  const handleReject = async (id) => {
    Alert.prompt('Rejection Reason', 'Please provide a reason for rejection:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async (notes) => {
          if (!notes) {
            Alert.alert('Required', 'Please provide a rejection reason')
            return
          }
          try {
            const data = await api.rejectLogisticsApplication(id, notes)
            if (data.success) {
              Alert.alert('Success', 'Application rejected')
              loadApplications()
            } else {
              Alert.alert('Error', data.message)
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to reject application')
          }
        },
      },
    ])
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return Colors.warning
      case 'approved': return Colors.success
      case 'rejected': return Colors.danger
      default: return Colors.textMuted
    }
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.companyName}>{item.company_name}</Text>
          <Text style={styles.applicant}>{item.applicant_name} | {item.phone}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.details}>
        {item.coverage_areas && <Text style={styles.detail}>Coverage: {item.coverage_areas}</Text>}
        {item.vehicle_types && <Text style={styles.detail}>Vehicles: {item.vehicle_types}</Text>}
        {item.base_rate_per_km && <Text style={styles.detail}>Base Rate: {item.base_rate_per_km} TZS/km</Text>}
        {item.commission_rate && <Text style={styles.detail}>Commission: {item.commission_rate}%</Text>}
        {item.business_registration_number && <Text style={styles.detail}>BRN: {item.business_registration_number}</Text>}
        {item.tin_number && <Text style={styles.detail}>TIN: {item.tin_number}</Text>}
        {item.reference_contacts && <Text style={styles.detail}>Refs: {item.reference_contacts}</Text>}
        {item.notes && <Text style={styles.detail}>Notes: {item.notes}</Text>}
        <Text style={styles.date}>Applied: {new Date(item.created_at).toLocaleDateString()}</Text>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item.id)}>
            <Check width={18} height={18} color={Colors.white} />
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item.id)}>
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
        <Text style={styles.headerTitle}>Logistics Applications</Text>
      </View>

      <View style={styles.filterRow}>
        {['pending', 'approved', 'rejected'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterBtn, filter === s && styles.filterBtnActive]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={applications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApplications() }} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Truck width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No applications found</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: 16,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: Colors.white,
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  applicant: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  email: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  details: {
    gap: 4,
  },
  detail: {
    fontSize: 13,
    color: Colors.text,
  },
  date: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  approveBtn: {
    backgroundColor: Colors.success,
  },
  rejectBtn: {
    backgroundColor: Colors.danger,
  },
  actionText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  denied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  deniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
  },
  deniedText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
})
