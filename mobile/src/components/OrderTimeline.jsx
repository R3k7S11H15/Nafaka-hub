import React from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { Colors } from '../components/UI'
import { LIFECYCLE_STAGES, STATUS_LABELS, STATUS_NORMALIZE, getCurrentStageIndex } from '../../../src/config/orderLifecycle'
import { Package, Clock, CheckCircle, Truck, AlertCircle, XCircle } from '../icons'

const ICONS = {
  draft: Package,
  pending_payment: Clock,
  paid: CheckCircle,
  awaiting_seller_confirmation: Package,
  seller_accepted: CheckCircle,
  awaiting_warehouse_allocation: Package,
  quality_inspection: AlertCircle,
  ready_for_dispatch: Package,
  assigned_to_logistics: Truck,
  in_transit: Truck,
  delivered: CheckCircle,
  buyer_confirmation: Clock,
  completed: CheckCircle,
  disputed: AlertCircle,
  refunded: AlertCircle,
  cancelled: XCircle,
}

export function OrderLifecycleStepper({ status }) {
  const currentIdx = getCurrentStageIndex(status)
  const normalized = STATUS_NORMALIZE[status] || status
  return (
    <View style={styles.stepper}>
      {LIFECYCLE_STAGES.map((stage, idx) => {
        const state =
          currentIdx === -1
            ? 'pending'
            : idx < currentIdx
            ? 'completed'
            : idx === currentIdx
            ? 'current'
            : 'pending'
        const Icon = ICONS[stage.status] || Clock
        const color =
          state === 'completed'
            ? Colors.success
            : state === 'current'
            ? Colors.primary
            : Colors.textMuted
        const bg =
          state === 'completed'
            ? Colors.success
            : state === 'current'
            ? Colors.primary
            : Colors.border
        return (
          <View key={stage.status} style={styles.stepRow}>
            <View style={[styles.stepLeft, { borderColor: Colors.border }]}>
              {idx < LIFECYCLE_STAGES.length - 1 && (
                <View style={[styles.stepLine, { backgroundColor: Colors.border }]} />
              )}
              <View style={[styles.stepIcon, { backgroundColor: bg, borderColor: bg }]}>
                <Icon width={16} height={16} color={state === 'pending' ? Colors.textMuted : Colors.white} />
              </View>
            </View>
            <View style={styles.stepRight}>
              <Text style={[styles.stepTitle, { color: state === 'pending' ? Colors.textMuted : Colors.text }]}>{stage.label}</Text>
              {state === 'current' && <Text style={styles.stepCurrent}>Current</Text>}
              {state === 'completed' && <Text style={styles.stepDone}>Done</Text>}
            </View>
          </View>
        )
      })}
      {/* Show terminal state indicator for cancelled/refunded/disputed if not in main flow */}
      {normalized !== status && TERMINAL_LABEL[normalized]}
    </View>
  )
}

const TERMINAL_LABEL = {
  disputed: 'Disputed',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
}

export function OrderTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <View style={styles.empty}>
        <Clock width={24} height={24} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No timeline events recorded yet.</Text>
      </View>
    )
  }
  return (
    <FlatList
      data={events}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => {
        const Icon = ICONS[item.status] || Clock
        return (
          <View style={styles.event}>
            <View style={[styles.eventIcon, { backgroundColor: Colors.primary + '20' }]}>
              <Icon width={14} height={14} color={Colors.primary} />
            </View>
            <View style={styles.eventBody}>
              <Text style={styles.eventTitle}>{item.action || item.status || 'Event'}</Text>
              {item.notes ? <Text style={styles.eventNotes}>{item.notes}</Text> : null}
              <View style={styles.eventMeta}>
                {item.actor_role ? <Text style={styles.eventActor}>by {item.actor_role}</Text> : null}
                <Text style={styles.eventTime}>
                  {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                </Text>
              </View>
            </View>
          </View>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  stepper: { paddingVertical: 8 },
  stepRow: { flexDirection: 'row', marginBottom: 12 },
  stepLeft: { alignItems: 'center', marginRight: 14, position: 'relative' },
  stepLine: { position: 'absolute', top: 32, bottom: -16, width: 2 },
  stepIcon: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  stepRight: { flex: 1, paddingBottom: 4 },
  stepTitle: { fontSize: 14, fontWeight: '600' },
  stepCurrent: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  stepDone: { fontSize: 11, color: Colors.success, fontWeight: '700' },
  event: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  eventIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 13, fontWeight: '600', color: Colors.text },
  eventNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  eventMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  eventActor: { fontSize: 11, color: Colors.textMuted },
  eventTime: { fontSize: 11, color: Colors.textMuted },
  empty: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 13, color: Colors.textMuted, marginTop: 8, textAlign: 'center' },
})
