import React, { useState, useEffect, useContext } from 'react'
import { View, Text, TouchableOpacity, FlatList, Alert, StyleSheet, RefreshControl, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors } from '../components/UI'
import { Package, Search, Ban, Check, X, Loader2 } from '../icons'
import { ROLES } from '../../../src/config/roles'
import { useAdminGuard } from '../hooks/useAdminGuard'

export default function AdminProductsScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const limit = 20

  const hasAccess = useAdminGuard([ROLES.SUPERADMIN, ROLES.MARKETPLACE_ADMIN, ROLES.VENDOR_ADMIN])

  const loadProducts = async () => {
    try {
      const data = await api.getSuperAdminProducts({ search, status: '', limit, offset: page * limit })
      setProducts(data?.products || data?.data?.products || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load products')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadProducts() }, [search, page])

  const toggleActive = async (product) => {
    Alert.alert(
      product.is_active ? 'Deactivate Product' : 'Activate Product',
      `Are you sure you want to ${product.is_active ? 'deactivate' : 'activate'} this product?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: product.is_active ? 'Deactivate' : 'Activate',
          style: product.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.updateSuperAdminProduct(product.id, { is_active: product.is_active ? 0 : 1 })
              loadProducts()
            } catch (err) {
              Alert.alert('Error', 'Failed to update product')
            }
          },
        },
      ]
    )
  }

  const deleteProduct = async (product) => {
    Alert.alert('Delete Product', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteSuperAdminProduct(product.id)
            loadProducts()
          } catch (err) {
            Alert.alert('Error', 'Failed to delete product')
          }
        },
      },
    ])
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.name}</Text>
        <View style={[styles.badge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.badgeText, item.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{item.description || 'No description'}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.price}>TZS {Number(item.price).toLocaleString()}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => toggleActive(item)} style={styles.iconBtn}>
            {item.is_active ? <Ban width={18} height={18} color={Colors.danger} /> : <Check width={18} height={18} color={Colors.success} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteProduct(item)} style={styles.iconBtn}>
            <X width={18} height={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
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
        <Text style={styles.headerTitle}>Products</Text>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search width={18} height={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts() }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products found</Text>
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
  title: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: Colors.background },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeInactive: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextActive: { color: '#166534' },
  badgeTextInactive: { color: '#6b7280' },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14 },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  deniedTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 16 },
  deniedText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
})
