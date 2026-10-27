import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../../../src/services/api'
import { Button, Card, Colors } from '../components/UI'
import { Package, FileText } from '../icons'

export default function ReceiptScreen({ route, navigation }) {
  const { paymentId } = route.params
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getPaymentReceipt(paymentId)
      .then((res) => {
        if (res?.success) setReceipt(res.receipt)
        else setError(res?.message || 'Receipt not found')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load receipt'); setLoading(false) })
  }, [paymentId])

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ marginTop: 12, color: Colors.textMuted }}>Loading receipt…</Text></SafeAreaView>
  }

  if (error || !receipt) {
    return <SafeAreaView style={styles.center}><Text style={{ color: Colors.danger }}>{error || 'Receipt not found'}</Text></SafeAreaView>
  }

  const statusColor = {
    pending: Colors.warning,
    completed: Colors.success,
    failed: Colors.danger,
    reversed: Colors.textMuted,
  }[receipt.status] || Colors.textMuted

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <FileText width={28} height={28} color={Colors.primary} />
        <Text style={styles.title}>Payment Receipt</Text>
      </View>
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Receipt #{receipt.id}</Text>
          <Text style={[styles.badge, { backgroundColor: statusColor + '20', color: statusColor }]}>{receipt.status}</Text>
        </View>
        <View style={styles.rowBetween}><Text style={styles.label}>Order</Text><Text style={styles.value}>#{receipt.order_number}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.label}>Customer</Text><Text style={styles.value}>{receipt.customer_name}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.label}>Method</Text><Text style={styles.value}>{receipt.method}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.label}>Provider ref</Text><Text style={styles.value}>{receipt.provider_ref || '—'}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.label}>Amount</Text><Text style={[styles.value, styles.total]}>TZS {Number(receipt.amount || 0).toLocaleString()}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.label}>Payment date</Text><Text style={styles.value}>{receipt.payment_date ? new Date(receipt.payment_date).toLocaleString() : '—'}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.label}>Shipping</Text><Text style={styles.value}>{receipt.shipping_address || '—'}</Text></View>
      </Card>
      <View style={styles.footer}>
        <Button title="Back to Orders" icon={Package} onPress={() => navigation.popToTop()} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  card: { padding: 16, marginBottom: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label: { fontSize: 13, color: Colors.textMuted },
  value: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  total: { fontSize: 16, fontWeight: '700' },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  footer: { marginTop: 'auto' },
})
