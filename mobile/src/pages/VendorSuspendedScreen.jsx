import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { Shield, AlertCircle } from '../icons'
import api from '../../../src/services/api'

const Colors = {
  primary: '#15803d',
  primaryDark: '#166534',
  accent: '#f59e0b',
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#94a3b8',
  white: '#ffffff',
}

export default function VendorSuspendedScreen() {
  const [suspended, setSuspended] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getSuspendedVendors()
        if (!mounted) return
        setSuspended(Array.isArray(res?.suspended) ? res.suspended : Array.isArray(res?.data) ? res.data : [])
      } catch {
        if (mounted) setSuspended([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Suspended Vendors</Text>

      <View style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
        <Shield size={28} color="#dc2626" />
        <Text style={styles.summaryValue}>{String(suspended.length)}</Text>
        <Text style={styles.summaryLabel}>Currently Suspended</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : suspended.length === 0 ? (
        <Text style={styles.empty}>No suspended vendors</Text>
      ) : (
        suspended.map((v) => (
          <View key={v.id || v.vendor_id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>{v.full_name || v.name || '—'}</Text>
                <Text style={styles.cardSub}>{v.business_name || v.business || '—'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.badgeText, { color: '#dc2626' }]}>Suspended</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>Reason: {v.reason || v.suspension_reason || '—'}</Text>
            <Text style={styles.cardMeta}>Reports: {v.reports || v.report_count || 0}</Text>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  summaryCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#fecaca' },
  summaryValue: { fontSize: 28, fontWeight: 'bold', color: '#dc2626', marginTop: 8 },
  summaryLabel: { fontSize: 14, color: '#991b1b', marginTop: 4 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textMuted },
  cardMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 20 },
})
