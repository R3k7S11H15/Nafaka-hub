import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Users, UserCheck, Clock } from '../icons'
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

export default function VendorApplicationsScreen() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getApplications()
        if (!mounted) return
        setApplications(Array.isArray(res?.applications) ? res.applications : Array.isArray(res?.data?.applications) ? res.data.applications : [])
      } catch {
        if (mounted) setApplications([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const pending = applications.filter(a => (a.status || '').toLowerCase() === 'pending')
  const approved = applications.filter(a => (a.status || '').toLowerCase() === 'approved')
  const rejected = applications.filter(a => (a.status || '').toLowerCase() === 'rejected')

  const StatusBadge = ({ status }) => {
    let bg = '#f3f4f6', color = '#6b7280'
    if ((status || '').toLowerCase() === 'approved') { bg = '#dcfce7'; color = '#16a34a' }
    if ((status || '').toLowerCase() === 'pending') { bg = '#fef9c3'; color = '#ca8a04' }
    if ((status || '').toLowerCase() === 'rejected') { bg = '#fee2e2'; color = '#dc2626' }
    return (
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <Text style={[styles.badgeText, { color }]}>{status || '—'}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vendor Applications</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#fef9c3' }]}>
          <Clock size={20} color="#ca8a04" />
          <Text style={styles.statValue}>{pending.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
          <UserCheck size={20} color="#16a34a" />
          <Text style={styles.statValue}>{approved.length}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
          <Users size={20} color="#dc2626" />
          <Text style={styles.statValue}>{rejected.length}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Applications</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : applications.length === 0 ? (
          <Text style={styles.empty}>No applications yet</Text>
        ) : (
          applications.slice(0, 20).map((app) => (
            <View key={app.id || app.application_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{app.applicant_name || app.full_name || app.name || '—'}</Text>
                <StatusBadge status={app.status} />
              </View>
              <Text style={styles.cardSub}>{app.email || '—'}</Text>
              <Text style={styles.cardDate}>{app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.text, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginTop: 4 },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  cardSub: { fontSize: 13, color: Colors.textMuted },
  cardDate: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 20 },
})
