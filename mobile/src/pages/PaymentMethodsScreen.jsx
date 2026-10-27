import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import api from '../../../src/services/api'
import { Colors } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { CreditCard, Plus, Trash2, Edit3, ChevronRight, Shield } from '../icons'

export default function PaymentMethodsScreen({ navigation }) {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    setLoading(true)
    try {
      const data = await api.getPaymentMethods()
      if (data.success) {
        setMethods(data.methods || [])
      } else {
        setError(data.message || 'Failed to load payment methods')
      }
    } catch (e) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (method) => {
    Alert.alert('Remove Card', 'Are you sure you want to remove this card?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => console.log('Delete:', method.id) }
    ])
  }

  const renderMethod = ({ item }) => {
    const isDefault = item.is_default
    const isMobileMoney = item.type === 'mobile_money'
    const Icon = isMobileMoney ? Shield : CreditCard
    const color = isMobileMoney ? Colors.accent : Colors.primary

    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}10` }]}>
            <Icon width={24} height={24} color={color} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>
              {isMobileMoney ? item.provider_name || 'Mobile Money' : item.card_type || 'Card'}
            </Text>
            <Text style={styles.methodDetail}>
              {isMobileMoney ? item.phone_number : `**** **** **** ${item.last4 || '1234'}`}
            </Text>
            {isDefault && <Text style={styles.defaultBadge}>Default</Text>}
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Trash2 width={20} height={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronRight width={24} height={24} color={Colors.white} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Methods</Text>
        </View>
        <LoadingSpinner text="Loading payment methods..." />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronRight width={24} height={24} color={Colors.white} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : methods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CreditCard width={64} height={64} color={Colors.textMuted} style={{ opacity: 0.3 }} />
            <Text style={styles.emptyTitle}>No payment methods</Text>
            <Text style={styles.emptySubtitle}>Add a payment method to get started</Text>
          </View>
        ) : (
          <FlatList
            data={methods}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderMethod}
            scrollEnabled={false}
          />
        )}

        <TouchableOpacity style={styles.addButton}>
          <Plus width={20} height={20} color={Colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  backButton: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  methodDetail: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  defaultBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.danger,
    textAlign: 'center',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
})
