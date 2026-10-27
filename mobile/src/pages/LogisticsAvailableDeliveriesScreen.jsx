import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AuthContext } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Card, Colors, Button } from '../components/UI'
import { Package, Check, X, Truck, MapPin, Navigation } from '../icons'

export default function LogisticsAvailableDeliveriesScreen({ navigation }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadRequests = async () => {
    try {
      const data = await api.getDeliveryRequests()
      setRequests(data?.requests || [])
    } catch (err) {
      Alert.alert('Error', 'Failed to load delivery requests')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadRequests() }, [])

  const handleAccept = async (orderId) => {
    Alert.prompt(
      'Accept Delivery',
      'Enter delivery cost (TZS):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Next',
          onPress: async (cost) => {
            if (!cost || isNaN(parseFloat(cost))) {
              Alert.alert('Error', 'Please enter a valid cost')
              return
            }
            Alert.prompt(
              'Additional Info',
              'Enter distance (km):',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Accept',
                  onPress: async (distance) => {
                    try {
                      await api.acceptDeliveryRequest(orderId, {
                        delivery_cost: parseFloat(cost),
                        distance: parseFloat(distance || 0),
                        driver_id: null,
                        vehicle_id: null,
                      })
                      Alert.alert('Success', 'Delivery request accepted')
                      loadRequests()
                    } catch (err) {
                      Alert.alert('Error', err?.message || 'Failed to accept delivery')
                    }
                  },
                },
              ]
            )
          },
        },
      ]
    )
  }

  const renderItem = ({ item }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderNumber}>#{item.order_number || item.id}</Text>
        <Text style={styles.amount}>{item.total_amount ? `TZS ${Number(item.total_amount).toLocaleString()}` : '—'}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <MapPin width={16} height={16} color={Colors.textMuted} />
          <Text style={styles.rowText}>To: {item.shipping_address || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Package width={16} height={16} color={Colors.textMuted} />
          <Text style={styles.rowText}>{item.product_name || 'Product'}</Text>
        </View>
        {item.customer_name && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Customer:</Text>
            <Text style={styles.rowText}>{item.customer_name}</Text>
          </View>
        )}
      </View>
      <Button title="Accept Delivery" onPress={() => handleAccept(item.id)} variant="primary" style={styles.acceptButton} />
    </Card>
  )

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading available deliveries...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Deliveries</Text>
        <Text style={styles.headerSubtitle}>{requests.length} requests</Text>
      </View>
      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests() }} colors={[Colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package width={48} height={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No available deliveries</Text>
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
  listContent: { padding: 16 },
  card: { marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  amount: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  cardBody: { gap: 8, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 14, color: Colors.textMuted },
  rowText: { fontSize: 14, color: Colors.text },
  acceptButton: { marginTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { color: Colors.textMuted, marginTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 16 },
})
