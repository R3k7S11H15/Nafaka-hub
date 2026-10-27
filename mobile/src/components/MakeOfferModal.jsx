import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native'
import api from '../../../src/services/api'
import { Colors } from '../components/UI'
import { X, ShoppingCart } from '../icons'

function formatCurrency(amount) {
  const num = Number(amount) || 0
  return num.toLocaleString()
}

export default function MakeOfferModal({ visible, conversationId, product, requestedQuantity, onClose, onCreated }) {
  const [quantity, setQuantity] = useState(product?.min_order_quantity || 1)
  const [unitPrice, setUnitPrice] = useState(product?.price ? String(product.price) : '')
  const [deliveryLocation, setDeliveryLocation] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const totalPrice = (Number(quantity) || 0) * (parseFloat(unitPrice) || 0)

  const handleSubmit = async () => {
    if (submitting) return
    if (!quantity || !unitPrice) {
      Alert.alert('Validation', 'Quantity and unit price are required.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await api.createOffer(conversationId, {
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        delivery_location: deliveryLocation,
        delivery_date: deliveryDate || null,
        note,
      })
      if (res?.success) {
        onCreated?.({
          id: res.offer_id,
          quantity: parseFloat(quantity),
          unit_price: parseFloat(unitPrice),
          total_price: totalPrice,
          delivery_location: deliveryLocation,
          delivery_date: deliveryDate,
          note,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
      } else {
        setError(res?.message || 'Failed to create offer')
      }
    } catch (err) {
      setError(err?.message || 'Failed to create offer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Make an Offer</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <X width={20} height={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {product && (
            <View style={styles.productRow}>
              <View style={styles.productImg}>
                <ShoppingCart width={24} height={24} color={Colors.textMuted} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.price && (
                  <Text style={styles.productPrice}>TZS {formatCurrency(product.price)}</Text>
                )}
              </View>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Quantity (tonnes)
              {requestedQuantity ? <Text style={styles.subtext}> (Buyer requested: {requestedQuantity} tonnes)</Text> : null}
            </Text>
            {requestedQuantity ? (
              <Text style={styles.subtextSmall}>You can offer up to {requestedQuantity} tonnes. Partial offers are accepted.</Text>
            ) : null}
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(quantity)}
              onChangeText={(v) => setQuantity(Math.max(1, parseInt(v) || 1))}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Unit Price (TZS)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="e.g. 85000"
            />
          </View>

          {totalPrice > 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Price</Text>
              <Text style={styles.totalValue}>TZS {formatCurrency(totalPrice)}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Delivery Location</Text>
            <TextInput
              style={styles.input}
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
              placeholder="Where should delivery be made?"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Delivery Date</Text>
            <TextInput
              style={styles.input}
              value={deliveryDate}
              onChangeText={setDeliveryDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Any special requests..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose} style={[styles.actionBtn, styles.cancelBtn]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !quantity || !unitPrice}
              style={[styles.actionBtn, styles.submitBtn, (!quantity || !unitPrice || submitting) && styles.submitBtnDisabled]}
            >
              <Text style={styles.submitText}>{submitting ? 'Sending...' : 'Send Offer'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  iconBtn: { padding: 4 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, backgroundColor: Colors.background, borderRadius: 10 },
  productImg: { width: 40, height: 40, backgroundColor: Colors.white, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  productPrice: { fontSize: 13, color: Colors.textMuted },
  errorText: { color: Colors.danger, fontSize: 13, marginBottom: 8 },
  fieldGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  subtext: { fontSize: 11, color: Colors.textMuted, fontWeight: 'normal' },
  subtextSmall: { fontSize: 10, color: Colors.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    minHeight: 44,
  },
  textArea: { textAlignVertical: 'top', paddingVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, marginBottom: 12 },
  totalLabel: { fontSize: 14, color: Colors.textMuted },
  totalValue: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 20 },
  cancelBtn: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  submitBtn: { backgroundColor: Colors.primary },
  submitBtnDisabled: { opacity: 0.5 },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  submitText: { fontSize: 15, fontWeight: '700', color: Colors.white },
})
