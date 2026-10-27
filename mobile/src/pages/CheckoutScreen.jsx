import React, { useState, useContext, useEffect, useRef } from 'react'
import { View, Text, Alert, ScrollView, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import { useCart } from '../../../src/context/CartContext'
import { useAuth } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Colors, Button, Input } from '../components/UI'
import { MapPin, CreditCard, Truck, Check, QrCode, Copy, Wallet } from '../icons'

const paymentMethods = [
  { id: 'mpesa', name: 'M-Pesa' },
  { id: 'airtel', name: 'Airtel Money' },
  { id: 'tigo', name: 'Tigo Pesa' },
  { id: 'lipa_namba', name: 'Lipa Namba' },
  { id: 'card', name: 'Credit/Debit Card' },
  { id: 'bank', name: 'Bank Transfer' },
  { id: 'cash', name: 'Cash on Delivery' },
]

const mobileMoneyMethods = ['mpesa', 'airtel', 'tigo', 'lipa_namba']

export default function CheckoutScreen({ navigation }) {
  const [selectedPayment, setSelectedPayment] = useState('mpesa')
  const [deliveryOption, setDeliveryOption] = useState('standard')
  const [processing, setProcessing] = useState(false)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [phoneInput, setPhoneInput] = useState('')
  const [paymentState, setPaymentState] = useState(null)
  const pollTimerRef = useRef(null)
  const { cartItems, totalItems, totalAmount, clearCart } = useCart()
  const { user } = useAuth()

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getSavedAddresses()
        if (data.success) {
          setAddresses(data.addresses || [])
          const def = (data.addresses || []).find(a => a.is_default) || (data.addresses || [])[0]
          if (def) setSelectedAddress(def.id)
        }
      } catch (err) {
        /* no addresses yet */
      }
    }
    load()

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  const subtotal = totalAmount
  const shippingCost = deliveryOption === 'express' ? 15000 : 5000
  const platformFee = Math.round(subtotal * 0.03)
  const total = subtotal + shippingCost + platformFee

  const parseInstructions = (instructions) => {
    if (!instructions) return null
    if (typeof instructions === 'string') {
      try { return JSON.parse(instructions) } catch { return { text: instructions } }
    }
    return instructions
  }

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty')
      return
    }

    if (mobileMoneyMethods.includes(selectedPayment) && !phoneInput.replace(/\s/g, '')) {
      Alert.alert('Phone number required', 'Enter a mobile money number for this payment method')
      return
    }

    setProcessing(true)
    try {
      const addr = addresses.find(a => a.id === selectedAddress)
      const shippingAddress = addr
        ? `${addr.street || addr.address || ''}, ${addr.district || ''}, ${addr.region || ''}`.trim(', ')
        : ''

      const orderData = {
        customer_id: user?.id,
        shipping_address: shippingAddress,
        payment_method: selectedPayment,
        items: cartItems.map(it => ({ product_id: it.product_id, quantity: it.quantity })),
        notes: `Payment method: ${selectedPayment}`,
      }
      const result = await api.createOrder(orderData)
      if (!result.success) throw new Error(result.message || 'Failed to create order')

      const orderId = result.order_id || result.order_number
      const idempotencyKey = `mobile-${orderId}-${selectedPayment}-${user?.id || 'guest'}`
      const paymentPayload = {
        order_id: orderId,
        amount: total,
        method: selectedPayment,
        idempotency_key: idempotencyKey,
      }

      if (mobileMoneyMethods.includes(selectedPayment)) {
        paymentPayload.phone = phoneInput
      }

      if (selectedPayment === 'card') {
        const appUrl = Constants?.expoConfig?.extra?.appUrl || 'nafakahub://'
        paymentPayload.redirect_url = `${appUrl}/checkout/success`
        paymentPayload.cancel_url = `${appUrl}/checkout/cancel`
      }

      if (selectedPayment === 'cash') {
        await api.initPayment(paymentPayload)
        await clearCart()
        setPaymentState({ type: 'cod_pending', orderNumber: result.order_number })
        return
      }

      const payRes = await api.initPayment(paymentPayload)
      if (!payRes?.success) throw new Error(payRes?.message || 'Payment could not be initiated')

      await clearCart()

      const baseState = {
        paymentId: payRes.payment_id,
        orderNumber: result.order_number,
        method: selectedPayment,
        instructions: payRes.instructions,
        reference: payRes.reference,
        paymentUrl: payRes.next_action?.payment_url,
      }

      if (selectedPayment === 'card' && payRes.next_action?.type === 'ntzs_card_redirect' && payRes.next_action?.payment_url) {
        setPaymentState({ ...baseState, type: 'card_redirect', redirectUrl: payRes.next_action.payment_url })
        Linking.openURL(payRes.next_action.payment_url)
      } else if (selectedPayment === 'bank' && payRes.instructions) {
        setPaymentState({ ...baseState, type: 'bank_instructions' })
      } else if (mobileMoneyMethods.includes(selectedPayment)) {
        setPaymentState({ ...baseState, type: 'mobile_money_prompt' })
        startPolling(payRes.payment_id)
      } else {
        setPaymentState({ ...baseState, type: 'prompt' })
        startPolling(payRes.payment_id)
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to connect to server')
    } finally {
      setProcessing(false)
    }
  }

  const startPolling = (paymentId, maxAttempts = 30) => {
    let attempts = 0
    const pollFn = async () => {
      try {
        const res = await api.getPaymentStatus(paymentId)
        if (res?.success && (res.status === 'completed' || res.status === 'failed' || res.status === 'reversed')) {
          await clearCart()
          setPaymentState(prev => ({
            ...prev,
            pollingComplete: true,
            paymentStatus: res.status,
          }))
          return
        }
      } catch (_) {
        /* ignore */
      }
      attempts++
      if (attempts < maxAttempts) {
        pollTimerRef.current = setTimeout(pollFn, 3000)
      }
    }
    pollTimerRef.current = setTimeout(pollFn, 3000)
  }

  const handleCheckStatus = async () => {
    if (!paymentState?.paymentId) return
    try {
      const res = await api.getPaymentStatus(paymentState.paymentId)
      if (res?.success && (res.status === 'completed' || res.status === 'failed' || res.status === 'reversed')) {
        clearCart()
        setPaymentState(prev => ({
          ...prev,
          pollingComplete: true,
          paymentStatus: res.status,
        }))
      }
    } catch (err) {
      Alert.alert('Error', 'Could not check payment status')
    }
  }

  const renderPaymentInstructions = (state) => {
    const parsed = parseInstructions(state.instructions)
    const bankInstructions = parsed?.instructions
    const methodLabel = paymentMethods.find(m => m.id === state.method)?.name || state.method
    const phoneDisplay = mobileMoneyMethods.includes(state.method) ? phoneInput : null

    return (
      <View style={styles.instructionsBox}>
        <View style={styles.instructionsHeader}>
          <QrCode width={24} height={24} color={Colors.primary} />
          <Text style={styles.instructionsTitle}>Payment Instructions</Text>
        </View>

        <Text style={styles.instructionsMethod}>{methodLabel}</Text>

        {phoneDisplay ? (
          <View style={styles.instructionsDetailRow}>
            <Text style={styles.instructionsDetailLabel}>Phone Number</Text>
            <Text style={styles.instructionsDetailValue}>{phoneDisplay}</Text>
          </View>
        ) : null}

        {state.reference ? (
          <View style={styles.instructionsDetailRow}>
            <Text style={styles.instructionsDetailLabel}>Reference</Text>
            <Text style={styles.instructionsDetailValue}>{state.reference}</Text>
          </View>
        ) : null}

        {bankInstructions ? (
          <View style={styles.bankDetailsBox}>
            {bankInstructions.institution ? (
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Bank</Text>
                <Text style={styles.bankDetailValue}>{bankInstructions.institution}</Text>
              </View>
            ) : null}
            {bankInstructions.accountNumber ? (
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Account No.</Text>
                <Text style={[styles.bankDetailValue, styles.fontMono]}>{bankInstructions.accountNumber}</Text>
              </View>
            ) : null}
            {bankInstructions.accountName ? (
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Account Name</Text>
                <Text style={styles.bankDetailValue}>{bankInstructions.accountName}</Text>
              </View>
            ) : null}
            {bankInstructions.reference ? (
              <View style={styles.bankDetailRow}>
                <Text style={styles.bankDetailLabel}>Transfer Ref.</Text>
                <Text style={[styles.bankDetailValue, styles.fontMono]}>{bankInstructions.reference}</Text>
              </View>
            ) : null}
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Amount</Text>
              <Text style={styles.bankDetailValue}>TZS {Number(state.amount || total).toLocaleString()}</Text>
            </View>
            {bankInstructions.note ? (
              <Text style={styles.instructionsNote}>{bankInstructions.note}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            Your order stays in "Pending Payment" until the provider confirms the funds
          </Text>
        </View>
      </View>
    )
  }

  if (!cartItems.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Products')} style={styles.backButton}>
            <Text style={styles.backButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (paymentState?.type === 'cod_pending') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Check width={48} height={48} color={Colors.success} />
          <Text style={[styles.emptyText, { marginTop: 12, fontWeight: '700' }]}>
            Cash on Delivery
          </Text>
          <Text style={[styles.emptyText, { marginTop: 8, textAlign: 'center' }]}>
            Order #{paymentState.orderNumber} placed. Finance approval is required before
            fulfillment begins. You'll be notified once approved.
          </Text>
          <TouchableOpacity
            onPress={() => { clearCart(); navigation.popToTop() }}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Back to Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (paymentState?.type === 'bank_instructions') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Check width={48} height={48} color={Colors.success} />
          <Text style={[styles.emptyText, { marginTop: 12, fontWeight: '700' }]}>
            Bank Transfer Instructions
          </Text>
          {renderPaymentInstructions(paymentState)}
          <Text style={[styles.emptyText, { marginTop: 12 }]}>
            Complete your bank transfer. The order stays in "Pending Payment" until
            the provider confirms the funds.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('OrderTracking', { orderId: paymentState.orderNumber })}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Track Order</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (paymentState?.type === 'mobile_money_prompt' || paymentState?.type === 'card_redirect') {
    const isPolling = !paymentState.pollingComplete
    const parsed = parseInstructions(paymentState.instructions)
    const phoneDisplay = mobileMoneyMethods.includes(paymentState.method) ? phoneInput : null

    let statusText = 'A payment prompt was sent to your device.'
    if (paymentState.paymentStatus === 'completed') {
      statusText = 'Payment confirmed! Your order is being processed.'
    } else if (paymentState.paymentStatus === 'failed') {
      statusText = 'Payment failed. Please try a different payment method.'
    } else if (paymentState.method === 'card' && paymentState.redirectUrl) {
      statusText = 'You will be redirected to complete your card payment. Check your browser to finish.'
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Check width={48} height={48} color={Colors.success} />
          <Text style={[styles.emptyText, { marginTop: 12, fontWeight: '700' }]}>
            {paymentState.paymentStatus === 'completed' ? 'Payment Successful' : 'Payment initiated'}
          </Text>
          <Text style={styles.emptyText}>{statusText}</Text>

          {phoneDisplay ? (
            <View style={[styles.instructionsDetailRow, { marginVertical: 12 }]}>
              <Text style={styles.instructionsDetailLabel}>Phone Number</Text>
              <Text style={styles.instructionsDetailValue}>{phoneDisplay}</Text>
            </View>
          ) : null}

          {paymentState.reference ? (
            <View style={[styles.instructionsDetailRow, { backgroundColor: Colors.background }]}>
              <Text style={styles.instructionsDetailLabel}>Reference</Text>
              <Text style={styles.instructionsDetailValue}>{paymentState.reference}</Text>
            </View>
          ) : null}

          {(parsed && typeof parsed === 'object') ? (
            <View style={styles.instructionsDetailRow}>
              <Text style={styles.instructionsDetailLabel}>Provider Instructions</Text>
              <Text style={styles.instructionsNote}>
                {typeof parsed === 'object' && parsed.instructions
                  ? parsed.instructions
                  : typeof paymentState.instructions === 'string'
                    ? paymentState.instructions
                    : 'Complete the payment on your device.'}
              </Text>
            </View>
          ) : null}

          {isPolling && (
            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={[styles.emptyText, { fontSize: 12, color: Colors.textMuted }]}>
                Checking payment status...
              </Text>
            </View>
          )}

          <View style={{ gap: 12, marginTop: 16, width: '100%' }}>
            <TouchableOpacity
              onPress={handleCheckStatus}
              style={[styles.backButton, { width: '100%' }]}
            >
              <Text style={styles.backButtonText}>Check Status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('OrderTracking', { orderId: paymentState.orderNumber })}
              style={[styles.backButton, { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }]}
            >
              <Text style={[styles.backButtonText, { color: Colors.text }]}>Track Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (paymentState?.type === 'prompt') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Check width={48} height={48} color={Colors.success} />
          <Text style={[styles.emptyText, { marginTop: 12, fontWeight: '700' }]}>
            {paymentState.paymentStatus === 'completed' ? 'Payment Successful' : 'Payment initiated'}
          </Text>
          <Text style={styles.emptyText}>
            {paymentState.paymentStatus === 'completed'
              ? 'Payment confirmed! Your order is being processed.'
              : paymentState.paymentStatus === 'failed'
                ? 'Payment failed. Please try a different payment method.'
                : 'Waiting for payment confirmation...'}
          </Text>
          <View style={{ gap: 12, marginTop: 16, width: '100%' }}>
            <TouchableOpacity
              onPress={handleCheckStatus}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>Check Status</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('OrderTracking', { orderId: paymentState.orderNumber })}
              style={[styles.backButton, { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }]}
            >
              <Text style={[styles.backButtonText, { color: Colors.text }]}>Track Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.shippingSection}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <MapPin width={20} height={20} color={Colors.primary} />
              <Text style={styles.addressType}>Home</Text>
            </View>
            <Text style={styles.addressText}>
              {user?.address || addresses.find(a => a.id === selectedAddress)?.street
                ? `${addresses.find(a => a.id === selectedAddress)?.street}, ${addresses.find(a => a.id === selectedAddress)?.district}, ${addresses.find(a => a.id === selectedAddress)?.region}`
                : 'Set your shipping address in your profile'}
            </Text>
          </View>
        </View>

        <View style={styles.shippingSection}>
          <Text style={styles.sectionTitle}>Delivery Options</Text>
          <TouchableOpacity
            style={[styles.optionCard, deliveryOption === 'standard' && styles.optionCardActive]}
            onPress={() => setDeliveryOption('standard')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionName}>Standard Delivery</Text>
            <Text style={styles.optionDesc}>3-5 business days</Text>
            <Text style={styles.optionPrice}>TZS {shippingCost.toLocaleString()}</Text>
            {deliveryOption === 'standard' && (
              <Check width={18} height={18} color={Colors.primary} style={styles.checkIcon} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionCard, deliveryOption === 'express' && styles.optionCardActive]}
            onPress={() => setDeliveryOption('express')}
            activeOpacity={0.7}
          >
            <Text style={styles.optionName}>Express Delivery</Text>
            <Text style={styles.optionDesc}>1-2 business days</Text>
            <Text style={styles.optionPrice}>TZS 15,000</Text>
            {deliveryOption === 'express' && (
              <Check width={18} height={18} color={Colors.primary} style={styles.checkIcon} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentOption, selectedPayment === method.id && styles.paymentOptionActive]}
              onPress={() => setSelectedPayment(method.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.paymentName}>{method.name}</Text>
              {selectedPayment === method.id && (
                <Check width={18} height={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
          {mobileMoneyMethods.includes(selectedPayment) && (
            <View style={{ marginTop: 12 }}>
              <Input
                label="Mobile number"
                placeholder="07XXXXXXXX"
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
              />
            </View>
          )}
          {selectedPayment === 'card' && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 4 }}>
                Card payments are processed securely via NTZS. You will be redirected to
                complete the payment on a secure page.
              </Text>
            </View>
          )}
          {selectedPayment === 'bank' && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 4 }}>
                A bank transfer reference will be generated after you place the order.
                Complete the transfer using the details on the next screen.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
            <Text style={styles.summaryValue}>TZS {subtotal.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>TZS {shippingCost.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform fee (3%)</Text>
            <Text style={styles.summaryValue}>TZS {platformFee.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>TZS {total.toLocaleString()}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.checkoutFooter}>
        <Button
          title={processing ? 'Placing Order...' : 'Place Order & Pay'}
          onPress={handlePlaceOrder}
          disabled={processing}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  shippingSection: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addressCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  addressType: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  addressText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    position: 'relative',
    backgroundColor: Colors.white,
    marginBottom: 10,
  },
  optionCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f0fdf4',
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  checkIcon: {
    position: 'absolute',
    top: 14,
    right: 14,
  },
  paymentSection: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  paymentOptionActive: {
    backgroundColor: '#f0fdf4',
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  summarySection: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 10,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary,
  },
  checkoutFooter: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  instructionsBox: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  instructionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  instructionsMethod: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  instructionsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 6,
  },
  instructionsDetailLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  instructionsDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  instructionsNote: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  bankDetailsBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bankDetailLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  bankDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  fontMono: {
    fontFamily: 'monospace',
  },
  statusBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#1e40af',
    textAlign: 'center',
  },
})
