import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { FileText, RefreshCw, Plus, X, Shield, Check } from '../icons'

export default function WarehouseDocumentsScreen({ navigation }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [form, setForm] = useState({ document_type: '', document_url: '', document_number: '', issued_date: '', expiry_date: '' })

  const loadDocuments = async () => {
    try {
      const data = await api.getMyWarehouseDocuments()
      if (data.success) setDocuments(data.documents || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load documents')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadDocuments() }, [])

  const addDocument = async () => {
    if (!form.document_type || !form.document_url) {
      Alert.alert('Error', 'Document type and URL are required')
      return
    }
    try {
      await api.addWarehouseDocument(form)
      Alert.alert('Success', 'Document uploaded')
      setForm({ document_type: '', document_url: '', document_number: '', issued_date: '', expiry_date: '' })
      setFormVisible(false)
      loadDocuments()
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to upload document')
    }
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.docType}>{item.document_type?.replace('_', ' ')}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (item.is_verified ? Colors.success : Colors.warning) + '20' }]}>
          <Text style={[styles.statusText, { color: item.is_verified ? Colors.success : Colors.warning }]}>
            {item.is_verified ? 'Verified' : 'Pending'}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        {item.document_number && <Text style={styles.detailText}>Number: {item.document_number}</Text>}
        {item.issued_date && <Text style={styles.detailText}>Issued: {item.issued_date}</Text>}
        {item.expiry_date && <Text style={styles.detailText}>Expires: {item.expiry_date}</Text>}
      </View>
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Documents</Text>
        <Text style={styles.headerSubtitle}>{documents.length} documents</Text>
      </View>
      <FlatList
        data={documents}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDocuments() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No documents uploaded</Text>
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
              <Text style={styles.modalTitle}>Add Document</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <X width={24} height={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Document Type *</Text>
              <View style={styles.input}>
                <Text style={styles.inputText}>{form.document_type || 'Select type'}</Text>
              </View>
              {['business_registration', 'tin_certificate', 'warehouse_license', 'insurance', 'safety_certificate'].map((type) => (
                <TouchableOpacity key={type} onPress={() => setForm({ ...form, document_type: type })} style={styles.option}>
                  <Text style={styles.optionText}>{type.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Document URL *</Text>
              <TextInput style={styles.input} value={form.document_url} onChangeText={(text) => setForm({ ...form, document_url: text })} placeholder="https://..." />
            </View>
            <Button title="Add Document" onPress={addDocument} variant="primary" />
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
  docType: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  details: { gap: 4 },
  detailText: { fontSize: 14, color: Colors.text },
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
  inputText: { fontSize: 14, color: Colors.text },
  option: { padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, marginBottom: 8 },
  optionText: { fontSize: 14, color: Colors.text, textTransform: 'capitalize' },
})
