import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { BarChart3, TrendingUp, DollarSign, Package, Star } from '../icons'
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

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorAnalyticsScreen() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminVendorAnalytics({ limit: 1000 })
        if (!mounted) return
        setData(res)
      } catch {
        if (mounted) setData(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const vendors = Array.isArray(data?.vendors) ? data.vendors : []
  const totalRevenue = vendors.reduce((s, v) => s + Number(v.total_revenue || 0), 0)
  const totalOrders = vendors.reduce((s, v) => s + Number(v.total_orders || 0), 0)
  const avgRating = vendors.length > 0 ? (vendors.reduce((s, v) => s + Number(v.avg_rating || 0), 0) / vendors.length).toFixed(1) : 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vendor Analytics</Text>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
          <DollarSign size={24} color="#16a34a" />
          <Text style={styles.statValue}>{fmtMoney(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Package size={24} color="#2563eb" />
          <Text style={styles.statValue}>{String(totalOrders)}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef9c3' }]}>
          <Star size={24} color="#ca8a04" />
          <Text style={styles.statValue}>{avgRating}</Text>
          <Text style={styles.statLabel}>Avg Rating</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Vendors</Text>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : vendors.length === 0 ? (
          <Text style={styles.empty}>No vendor data available</Text>
        ) : (
          vendors.slice(0, 10).map((v, i) => (
            <View key={v.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.rank}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{v.full_name || v.business_name || '—'}</Text>
                  <Text style={styles.cardSub}>{v.total_orders || 0} orders · {v.total_products || 0} products</Text>
                </View>
                <Text style={styles.revenue}>{fmtMoney(v.total_revenue || 0)}</Text>
              </View>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginTop: 8 },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { fontSize: 18, fontWeight: 'bold', color: Colors.primary, width: 28 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  cardSub: { fontSize: 13, color: Colors.textMuted },
  revenue: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 20 },
})
