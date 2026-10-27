import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Shield, UserCheck, Eye, Search } from '../icons'
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

export default function VendorVerificationScreen() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [usersRes, analyticsRes] = await Promise.all([
          api.getAdminUsers({ role: 'seller', limit: 1000 }),
          api.getAdminVendorAnalytics({ limit: 1000 }),
        ])
        if (!mounted) return
        const users = Array.isArray(usersRes?.users) ? usersRes.users : Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []
        const analytics = Array.isArray(analyticsRes?.vendors) ? analyticsRes.vendors : []
        const analyticsMap = {}
        analytics.forEach(a => { analyticsMap[a.id] = a })
        setVendors(users.map(u => ({ ...u, analytics: analyticsMap[u.id] || {} })))
      } catch {
        if (mounted) setVendors([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filtered = vendors.filter(v => {
    if (filter === 'verified') return v.is_verified === 1 || v.is_verified === true
    if (filter === 'unverified') return v.is_verified !== 1 && v.is_verified !== true
    return true
  })

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vendor Verification</Text>

      <View style={styles.filters}>
        {['all', 'verified', 'unverified'].map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>No vendors found</Text>
      ) : (
        filtered.map((vendor) => (
          <View key={vendor.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(vendor.full_name || vendor.business_name || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{vendor.full_name || vendor.business_name || '—'}</Text>
                <Text style={styles.cardSub}>{vendor.email || '—'}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: (vendor.is_verified === 1 || vendor.is_verified === true) ? '#dcfce7' : '#fef9c3' }]}>
                <Text style={[styles.badgeText, { color: (vendor.is_verified === 1 || vendor.is_verified === true) ? '#16a34a' : '#ca8a04' }]}>
                  {vendor.is_verified === 1 || vendor.is_verified === true ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>Revenue: {vendor.analytics?.total_revenue ? `TZS ${Number(vendor.analytics.total_revenue).toLocaleString()}` : '—'}</Text>
              <TouchableOpacity style={styles.reviewBtn}>
                <Eye size={16} color={Colors.primary} />
                <Text style={styles.reviewText}>Review</Text>
              </TouchableOpacity>
            </View>
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
  filters: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.primary },
  filterText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  filterTextActive: { color: Colors.white },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: 'bold', color: '#2563eb' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textMuted },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cardMeta: { fontSize: 12, color: Colors.textMuted },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#dcfce7', borderRadius: 8 },
  reviewText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 20 },
})
