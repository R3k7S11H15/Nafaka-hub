import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Users, Plus, X, Phone } from '../icons'

export default function LogisticsDriversScreen({ navigation }) {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', license_number: '', region: '' })

  const loadDrivers = async () => {
    try {
      const data = await api.getMyDrivers()
      setDrivers(data?.drivers || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load drivers')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadDrivers() }, [])

  const addDriver = async () => {
    if (!form.name) {
      Alert.alert('Error', 'Driver name is required')
      return
    }
    try {
      await api.addDriver(form.name, form.phone, form.license_number, form.region)
      Alert.alert('Success', 'Driver added')
      setForm({ name: '', phone: '', license_number: '', region: '' })
      setFormVisible(false)
      loadDrivers()
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to add driver')
    }
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.driverName}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (item.is_active ? Colors.success : Colors.danger) + '20' }]}>
          <Text style={[styles.statusText, { color: item.is_active ? Colors.success : Colors.danger }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        {item.phone && (
          <View style={styles.row}>
            <Phone width={16} height={16} color={Colors.textMuted} />
            <Text style={styles.rowText}>{item.phone}</Text>
          </View>
        )}
        {item.license_number && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>License:</Text>
            <Text style={styles.rowText}>{item.license_number}</Text>
          </View>
        )}
        {item.region && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Region:</Text>
            <Text style={styles.rowText}>{item.region}</Text>
          </View>
        )}
      </View>
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading drivers...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Drivers</Text>
        <Text style={styles.headerSubtitle}>{drivers.length} drivers</Text>
      </View>
      <FlatList
        data={drivers}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDrivers() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No drivers registered</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => setFormVisible(true)}>
        <Plus width={24} height={24} color={Colors.white} />
      </TouchableOpacity>

      {formVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Driver</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <X width={24} height={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(text) => setForm({ ...form, name: text })} placeholder="Driver name" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={(text) => setForm({ ...form, phone: text })} placeholder="+255 XXX XXX XXX" keyboardType="phone-pad" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>License Number</Text>
              <TextInput style={styles.input} value={form.license_number} onChangeText={(text) => setForm({ ...form, license_number: text })} placeholder="e.g. DL-12345" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Region</Text>
              <TextInput style={styles.input} value={form.region} onChangeText={(text) => setForm({ ...form, region: text })} placeholder="e.g. Dar es Salaam" />
            </View>
            <Button title="Add Driver" onPress={addDriver} variant="primary" />
          </View>
        </View>
      )}
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
  driverName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  details: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 14, color: Colors.textMuted, minWidth: 60 },
  rowText: { fontSize: 14, color: Colors.text, flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.card, borderRadius: 16, padding: 20, width: '100%', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: Colors.text },
})
