import React, { useState, useEffect, useContext } from 'react'
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, RefreshControl, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import { Users, Search, Ban, Check, Loader2 } from '../icons'
import { ROLES } from '../../../src/config/roles'
import { useAdminGuard } from '../hooks/useAdminGuard'

export default function AdminUsersScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  const hasAccess = useAdminGuard([ROLES.SUPERADMIN, ROLES.VENDOR_ADMIN])

  const loadUsers = async () => {
    try {
      const data = await api.getSuperAdminUsers({ search, limit: 50, offset: 0 })
      setUsers(data?.users || data?.data?.users || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load users')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadUsers() }, [search])

  const toggleActive = async (user) => {
    Alert.alert(
      user.is_active ? 'Deactivate User' : 'Activate User',
      `Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.is_active ? 'Deactivate' : 'Activate',
          style: user.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.updateSuperAdminUser(user.id, { is_active: user.is_active ? 0 : 1 })
              loadUsers()
            } catch (err) {
              Alert.alert('Error', 'Failed to update user')
            }
          },
        },
      ]
    )
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'superadmin': return '#dc2626'
      case 'marketplace_admin': return '#2563eb'
      case 'finance_admin': return '#059669'
      case 'customer_support': return '#d97706'
      default: return Colors.textMuted
    }
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.full_name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>{item.role}</Text>
        </View>
      </View>
      <Text style={styles.email}>{item.email || item.phone}</Text>
      <View style={styles.cardFooter}>
        <View style={[styles.badge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.badgeText, item.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => toggleActive(item)} style={styles.iconBtn}>
          {item.is_active ? <Ban width={18} height={18} color={Colors.danger} /> : <Check width={18} height={18} color={Colors.success} />}
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
        <Text style={styles.headerTitle}>Users</Text>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search width={18} height={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadUsers() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No users found</Text>
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
  searchContainer: { padding: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 },
  card: { marginHorizontal: 16, marginVertical: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  email: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 11, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextActive: { color: '#166534' },
  badgeTextInactive: { color: '#6b7280' },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: Colors.background },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  deniedTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  deniedText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
})
