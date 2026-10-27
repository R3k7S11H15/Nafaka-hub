import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Users, UserCheck, Package, DollarSign, Shield, BarChart3, MessageSquare, TrendingUp } from '../icons'
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

export default function VendorDashboardScreen() {
  const [stats, setStats] = useState([
    { label: 'Total Vendors', value: '...', icon: Users, color: '#3b82f6' },
    { label: 'Active', value: '...', icon: Package, color: '#22c55e' },
    { label: 'Pending', value: '...', icon: UserCheck, color: '#eab308' },
    { label: 'Suspended', value: '...', icon: Shield, color: '#ef4444' },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [usersRes, appsRes, suspendedRes] = await Promise.all([
          api.getAdminUsers({ role: 'seller', limit: 1000 }),
          api.getApplications().catch(() => ({ success: true, applications: [] })),
          api.getSuspendedVendors().catch(() => ({ success: true, suspended: [] })),
        ])
        if (!mounted) return
        const users = Array.isArray(usersRes?.users) ? usersRes.users : Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []
        const apps = Array.isArray(appsRes?.applications) ? appsRes.applications : Array.isArray(appsRes?.data?.applications) ? appsRes.data.applications : []
        const suspended = Array.isArray(suspendedRes?.suspended) ? suspendedRes.suspended : Array.isArray(suspendedRes?.data) ? suspendedRes.data : []
        const active = users.filter(u => u.is_active === 1 || u.is_active === true).length
        setStats([
          { label: 'Total Vendors', value: String(users.length), icon: Users, color: '#3b82f6' },
          { label: 'Active', value: String(active), icon: Package, color: '#22c55e' },
          { label: 'Pending', value: String(apps.filter(a => (a.status || '').toLowerCase() === 'pending').length), icon: UserCheck, color: '#eab308' },
          { label: 'Suspended', value: String(suspended.length), icon: Shield, color: '#ef4444' },
        ])
      } catch {
        // keep defaults
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Vendor Admin</Text>
      <Text style={styles.subtitle}>Manage vendors and applications</Text>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
              <stat.icon size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#dbeafe' }]}>
            <UserCheck size={24} color="#2563eb" />
            <Text style={styles.actionText}>Applications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#dcfce7' }]}>
            <Shield size={24} color="#16a34a" />
            <Text style={styles.actionText}>Verification</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#f3e8ff' }]}>
            <BarChart3 size={24} color="#9333ea" />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#fef9c3' }]}>
            <MessageSquare size={24} color="#ca8a04" />
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginTop: 4, marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.text },
})
