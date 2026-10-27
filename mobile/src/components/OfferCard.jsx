import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../components/UI'
import { Clock, CheckCircle, XCircle, ArrowLeftRight } from '../icons'

const STATUS_CONFIG = {
  pending: { color: Colors.warning, icon: Clock, label: 'Pending', bg: '#fef3c7' },
  accepted: { color: Colors.success, icon: CheckCircle, label: 'Accepted', bg: '#dcfce7' },
  rejected: { color: Colors.danger, icon: XCircle, label: 'Rejected', bg: '#fee2e2' },
  countered: { color: '#2563eb', icon: ArrowLeftRight, label: 'Countered', bg: '#dbeafe' },
  expired: { color: Colors.textMuted, icon: Clock, label: 'Expired', bg: '#f3f4f6' },
  cancelled: { color: Colors.textMuted, icon: XCircle, label: 'Cancelled', bg: '#f3f4f6' },
}

export default function OfferCard({ offer, currentUser, onAction }) {
  if (!offer) return null
  const status = offer.status || 'pending'
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  const isBuyer = String(offer.buyer_id) === String(currentUser?.id)
  const isSeller = String(offer.seller_id) === String(currentUser?.id)
  const canAct = (isSeller && status === 'pending') || (isBuyer && status === 'countered') || status === 'pending'

  const formatCurrency = (amount) => Number(amount || 0).toLocaleString()

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Icon width={14} height={14} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={styles.totalPrice}>TZS {formatCurrency(offer.total_price)}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity:</Text>
          <Text style={styles.detailValue}>{offer.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Unit Price:</Text>
          <Text style={styles.detailValue}>TZS {formatCurrency(offer.unit_price)}</Text>
        </View>
        {offer.delivery_location ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery to:</Text>
            <Text style={styles.detailValue}>{offer.delivery_location}</Text>
          </View>
        ) : null}
        {offer.delivery_date ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Date:</Text>
            <Text style={styles.detailValue}>{new Date(offer.delivery_date).toLocaleDateString()}</Text>
          </View>
        ) : null}
      </View>

      {offer.note ? <Text style={styles.note}>{offer.note}</Text> : null}

      <View style={styles.fromTo}>
        <Text style={styles.fromToText}>From: {isBuyer ? offer.buyer_name : offer.seller_name}</Text>
        <Text style={styles.fromToText}>To: {isBuyer ? offer.seller_name : offer.buyer_name}</Text>
      </View>

      {canAct ? (
        <View style={styles.actions}>
          {status === 'pending' && isSeller ? (
            <>
              <TouchableOpacity
                onPress={() => onAction(offer.id, 'accepted')}
                style={[styles.actionBtn, styles.acceptBtn]}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAction(offer.id, 'rejected')}
                style={[styles.actionBtn, styles.rejectBtn]}
              >
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
            </>
          ) : null}
          {status === 'countered' && isBuyer ? (
            <TouchableOpacity
              onPress={() => onAction(offer.id, 'accepted')}
              style={[styles.actionBtn, styles.acceptBtn]}
            >
              <Text style={styles.acceptText}>Accept Counter Offer</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { marginVertical: 6, backgroundColor: Colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  totalPrice: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  details: { gap: 4, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 12, color: Colors.textMuted },
  detailValue: { fontSize: 12, color: Colors.text, fontWeight: '500' },
  note: { fontSize: 12, color: Colors.textMuted, marginBottom: 6 },
  fromTo: { flexDirection: 'row', justifyContent: 'space-between', fontSize: 11, color: Colors.textMuted, marginBottom: 8 },
  fromToText: { fontSize: 11, color: Colors.textMuted },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  acceptBtn: { backgroundColor: '#dcfce7' },
  acceptText: { fontSize: 13, fontWeight: '600', color: Colors.success },
  rejectBtn: { backgroundColor: '#fee2e2' },
  rejectText: { fontSize: 13, fontWeight: '600', color: Colors.danger },
})
