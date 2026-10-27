import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Truck, Plus, X } from '../icons'

export default function LogisticsVehiclesScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ vehicle_type: '', registration_number: '', model: '', capacity_tonnes: '' })

  const loadVehicles = async () => {
    try {
      const data = await api.getMyVehicles()
      setVehicles(data?.vehicles || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load vehicles')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadVehicles() }, [])

  const addVehicle = async () => {
    if (!form.vehicle_type || !form.registration_number) {
      Alert.alert('Error', 'Vehicle type and registration number are required')
      return
    }
    try {
      await api.addVehicle(form.vehicle_type, form.registration_number, form.model, form.capacity_tonnes)
      Alert.alert('Success', 'Vehicle added')
      setForm({ vehicle_type: '', registration_number: '', model: '', capacity_tonnes: '' })
      setFormVisible(false)
      loadVehicles()
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to add vehicle')
    }
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.registrationNumber}>{item.registration_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (item.is_active ? Colors.success : Colors.danger) + '20' }]}>
          <Text style={[styles.statusText, { color: item.is_active ? Colors.success : Colors.danger }]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      <Text style={styles.vehicleType}>{item.vehicle_type}</Text>
      <View style={styles.details}>
        {item.model && <Text style={styles.detailText}>Model: {item.model}</Text>}
        {item.capacity_tonnes && <Text style={styles.detailText}>Capacity: {item.capacity_tonnes}t</Text>}
      </View>
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <Text style={styles.headerSubtitle}>{vehicles.length} vehicles</Text>
      </View>
      <FlatList
        data={vehicles}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadVehicles() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Truck width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No vehicles registered</Text>
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
              <Text style={styles.modalTitle}>Add Vehicle</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <X width={24} height={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Vehicle Type *</Text>
              <TextInput style={styles.input} value={form.vehicle_type} onChangeText={(text) => setForm({ ...form, vehicle_type: text })} placeholder="e.g. Truck, Van" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Registration Number *</Text>
              <TextInput style={styles.input} value={form.registration_number} onChangeText={(text) => setForm({ ...form, registration_number: text })} placeholder="e.g. T-1234 ABCD" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Model</Text>
              <TextInput style={styles.input} value={form.model} onChangeText={(text) => setForm({ ...form, model: text })} placeholder="e.g. Isuzu NPR" />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Capacity (Tonnes)</Text>
              <TextInput style={styles.input} value={form.capacity_tonnes} onChangeText={(text) => setForm({ ...form, capacity_tonnes: text })} placeholder="e.g. 5" keyboardType="numeric" />
            </View>
            <Button title="Add Vehicle" onPress={addVehicle} variant="primary" />
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  registrationNumber: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  vehicleType: { fontSize: 14, color: Colors.textMuted, marginBottom: 8 },
  details: { gap: 4 },
  detailText: { fontSize: 13, color: Colors.text },
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
