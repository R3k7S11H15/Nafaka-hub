import React, { useState } from 'react'
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Button, Colors } from '../components/UI'
import { ACTIONS } from '../../../src/config/orderLifecycle'
import { X } from '../icons'

export default function OrderActions({ order, allowedActions = [], onAction, loading }) {
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})

  const visible = (allowedActions || []).filter((a) => Boolean(ACTIONS[a.action]))
  if (!visible.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>{order?.frozen ? 'Order is frozen' : 'No actions available for your role'}</Text>
      </View>
    )
  }

  const open = (def) => {
    setModal(def)
    setForm({
      notes: '',
      reason: '',
      location: '',
      provider_id: '',
      warehouse_id: '',
      quality_document_url: '',
      proof_of_delivery_url: '',
      refund_amount: '',
      target_status: '',
    })
  }

  const submit = async () => {
    const def = modal
    const payload = { action: def.action, order_id: order.order_number || order.id }
    const requires = ACTIONS[def.action].requires || []
    for (const field of requires) {
      const v = form[field]
      if (v === undefined || v === null || v === '') {
        Alert.alert('Missing field', `Please enter ${field.replace(/_/g, ' ')}`)
        return
      }
      payload[field] = v
    }
    if (def.action === 'attach_quality_documents') payload.quality_document_url = form.quality_document_url
    if (def.action === 'submit_pod') {
      if (!form.proof_of_delivery_url) {
        Alert.alert('Proof of delivery URL is required')
        return
      }
      payload.proof_of_delivery_url = form.proof_of_delivery_url
    }
    if (form.notes) payload.notes = form.notes
    setModal(null)
    await onAction && onAction(payload)
  }

  return (
    <>
      <View style={styles.row}>
        {visible.map((a) => (
          <Button key={a.action} title={ACTIONS[a.action].label} onPress={() => open(a)} disabled={loading} />
        ))}
      </View>
      {modal && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setModal(null)}>
          <View style={styles.backdrop}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{ACTIONS[modal.action].label}</Text>
                <TouchableOpacity onPress={() => setModal(null)} style={styles.closeBtn}>
                  <X width={18} height={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              {(ACTIONS[modal.action].requires || []).map((field) => (
                <View key={field} style={styles.field}>
                  <Text style={styles.label}>{field.replace(/_/g, ' ')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={field.replace(/_/g, ' ')}
                    keyboardType={field === 'refund_amount' || field === 'provider_id' || field === 'warehouse_id' || field === 'target_status' ? 'numeric' : 'default'}
                    value={form[field] || ''}
                    onChangeText={(v) => setForm({ ...form, [field]: v })}
                  />
                </View>
              ))}
              {modal.action === 'attach_quality_documents' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Quality document URL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://..."
                    value={form.quality_document_url || ''}
                    onChangeText={(v) => setForm({ ...form, quality_document_url: v })}
                  />
                </View>
              )}
              {modal.action === 'submit_pod' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Proof of delivery URL</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="https://..."
                    value={form.proof_of_delivery_url || ''}
                    onChangeText={(v) => setForm({ ...form, proof_of_delivery_url: v })}
                  />
                </View>
              )}
              <View style={styles.field}>
                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes"
                  multiline
                  value={form.notes || ''}
                  onChangeText={(v) => setForm({ ...form, notes: v })}
                />
              </View>
              <View style={styles.modalFooter}>
                <Button title="Cancel" variant="secondary" onPress={() => setModal(null)} />
                <Button title="Confirm" onPress={submit} disabled={loading} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  empty: { marginTop: 8 },
  emptyText: { fontSize: 12, color: Colors.textMuted },
  backdrop: { flex: 1, backgroundColor: '#00000060', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 400, backgroundColor: Colors.white, borderRadius: 14, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  closeBtn: { padding: 4 },
  field: { marginBottom: 10 },
  label: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 8, fontSize: 13, color: Colors.text,
  },
  textArea: { height: 72, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 6 },
})
