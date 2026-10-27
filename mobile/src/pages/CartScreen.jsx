import React, { useContext, useState } from 'react'
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useCart } from '../../../src/context/CartContext'
import { Colors, Button } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { Trash2, ShoppingBag, ArrowRight, Plus, Minus, Package } from '../icons'

export default function CartScreen() {
  const navigation = useNavigation()
  const { cartItems, loading, updateQuantity, removeFromCart, totalItems, totalAmount } = useCart()
  const [updatingItem, setUpdatingItem] = useState(null)
  const [removingItem, setRemovingItem] = useState(null)

  const handleQuantity = async (item, delta) => {
    const newQty = item.quantity + delta
    if (newQty < 1) return
    setUpdatingItem(item.product_id)
    await updateQuantity(item.product_id, newQty)
    setUpdatingItem(null)
  }

  const handleRemove = async (productId) => {
    Alert.alert('Remove Item', 'Are you sure you want to remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemovingItem(productId)
          await removeFromCart(productId)
          setRemovingItem(null)
        },
      },
    ])
  }

  const handleCheckout = () => {
    navigation.navigate('Checkout')
  }

  const subtotal = totalAmount
  const shipping = 5000
  const total = subtotal + shipping

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner text="Loading cart..." />
      </SafeAreaView>
    )
  }

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImage}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url.startsWith('http') ? item.image_url : `images/${item.image_url}` }}
            style={styles.itemImageImg}
          />
        ) : (
          <View style={[styles.itemImageImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }]}>
            <Package width={32} height={32} color={Colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemPrice}>TZS {(item.price || 0).toLocaleString()} / {item.weight || 'kg'}</Text>
        <View style={styles.quantityControl}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantity(item, -1)}
            disabled={updatingItem === item.product_id}
            activeOpacity={0.7}
          >
            {updatingItem === item.product_id ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Minus width={18} height={18} color={Colors.text} />
            )}
          </TouchableOpacity>
          <Text style={styles.quantityValue}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantity(item, 1)}
            disabled={updatingItem === item.product_id}
            activeOpacity={0.7}
          >
            <Plus width={18} height={18} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.itemTotal}>
        <Text style={styles.itemTotalText}>TZS {(item.price * item.quantity).toLocaleString()}</Text>
        <TouchableOpacity
          onPress={() => handleRemove(item.id)}
          disabled={removingItem === item.product_id}
          activeOpacity={0.7}
          style={styles.removeButton}
        >
          {removingItem === item.product_id ? (
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <Trash2 width={18} height={18} color={Colors.danger} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <ShoppingBag width={48} height={48} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Looks like you haven't added any products yet.</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Products')}
            activeOpacity={0.8}
          >
            <Text style={styles.browseButtonText}>Browse Products</Text>
            <ArrowRight width={18} height={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.itemsContainer}>
            {cartItems.map((item) => (
              <View key={item.id}>
                {renderCartItem({ item })}
              </View>
            ))}
          </View>

          <View style={styles.checkoutContainer}>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal ({totalItems} items)</Text>
                <Text style={styles.summaryValue}>TZS {subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>TZS {shipping.toLocaleString()}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>TZS {total.toLocaleString()}</Text>
              </View>
            </View>

            <Button title="Proceed to Checkout" onPress={handleCheckout} />
            <TouchableOpacity
              style={styles.continueShopping}
              onPress={() => navigation.navigate('Products')}
              activeOpacity={0.7}
            >
              <Text style={styles.continueShoppingText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  itemImage: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
  },
  itemImageImg: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  itemTotal: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  itemTotalText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  removeButton: {
    padding: 4,
  },
  itemsContainer: {
    flex: 1,
    padding: 16,
  },
  checkoutContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  summary: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
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
    color: Colors.text,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 10,
    paddingTop: 12,
    marginBottom: 12,
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
  continueShopping: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  continueShoppingText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  browseButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
})
