import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { DollarSign, Wallet } from '../icons'

export default function LogisticsEarningsScreen({ navigation }) {
  const [summary, setSummary] = useState({ today: 0, week: 0, month: 0, total: 0, available: 0 })
  const [earnings, setEarnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadEarnings = async () => {
    try {
      const [sumRes, listRes] = await Promise.all([api.getMyEarningsSummary(), api.getMyEarnings()])
      setSummary(sumRes?.summary || { today: 0, week: 0, month: 0, total: 0, available: 0 })
      setEarnings(listRes?.earnings || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load earnings')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadEarnings() }, [])

  const handleWithdraw = () => {
    Alert.prompt(
      'Withdraw Funds',
      `Available balance: TZS ${Number(summary.available).toLocaleString()}\n\nEnter amount to withdraw:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          onPress: async (amount) => {
            const value = parseFloat(amount)
            if (isNaN(value) || value <= 0) {
              Alert.alert('Error', 'Please enter a valid amount')
              return
            }
            if (value > (summary.available || 0)) {
              Alert.alert('Error', 'Amount exceeds available balance')
              return
            }
            try {
              const res = await api.withdrawEarnings(value)
              if (res.success) {
                Alert.alert('Success', 'Withdrawal processed successfully!')
                loadEarnings()
              } else {
                Alert.alert('Error', res.message || 'Withdrawal failed')
              }
            } catch (err) {
              Alert.alert('Error', err?.message || 'Withdrawal failed')
            }
          },
        },
      ]
    )
  }

  const formatCurrency = (val) => `TZS ${Number(val || 0).toLocaleString()}`

  const renderEarning = ({ item }) => (
    <Card style={styles.earningCard}>
      <View style={styles.earningHeader}>
        <Text style={styles.orderNumber}>#{item.order_number || item.id}</Text>
        <Text style={styles.amount}>+{formatCurrency(item.amount)}</Text>
      </View>
      <Text style={styles.date}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}</Text>
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
        <Text style={styles.headerSubtitle}>Track your income</Text>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>Today</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.today)}</Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>This Week</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.week)}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.month)}</Text>
          </View>
          <View style={[styles.summaryCard, { flex: 1 }]}>
            <Text style={styles.summaryLabel}>Available</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>{formatCurrency(summary.available)}</Text>
          </View>
        </View>
        <Button title="Withdraw Funds" onPress={handleWithdraw} variant="primary" icon={Wallet} style={styles.withdrawButton} />
      </View>

      <Text style={styles.sectionTitle}>Recent Payments</Text>
      <FlatList
        data={earnings}
        renderItem={renderEarning}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadEarnings() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <DollarSign width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No earnings yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, backgroundColor: Colors.primary },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.white },
  headerSubtitle: { fontSize: 14, color: Colors.white + 'cc', marginTop: 4 },
  summaryContainer: { padding: 16 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  summaryLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  withdrawButton: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },
  earningCard: { marginBottom: 12, padding: 16 },
  earningHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNumber: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  amount: { fontSize: 16, fontWeight: 'bold', color: Colors.success },
  date: { fontSize: 12, color: Colors.textMuted },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
})
