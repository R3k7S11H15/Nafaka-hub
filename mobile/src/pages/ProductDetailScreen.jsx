import React, { useState, useEffect, useContext } from 'react'
import { View, Text, Image, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCart } from '../../../src/context/CartContext'
import api from '../../../src/services/api'
import { Colors, Button } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { Star, ShoppingCart, Package, Check } from '../icons'

export default function ProductDetailScreen({ route, navigation }) {
  const { productId } = route.params
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)
  const { addToCart } = useCart()

  useEffect(() => {
    loadProduct()
  }, [productId])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const data = await api.getProduct(productId)
      if (data.success && data.product) {
        setProduct(data.product)
        setError(null)
      } else {
        setError(data.message || 'Product not found')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async () => {
    setAddingToCart(true)
    try {
      const data = await addToCart(product.id, quantity)
      if (data.success) {
        Alert.alert('Success', 'Added to cart', [
          { text: 'Continue', style: 'cancel' },
          { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
        ])
      } else {
        Alert.alert('Error', data.message || 'Failed to add to cart')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect to server')
    } finally {
      setAddingToCart(false)
    }
  }

  const handleCheckout = () => {
    handleAddToCart()
    setTimeout(() => navigation.navigate('Checkout'), 500)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner text="Loading product..." />
      </SafeAreaView>
    )
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Product not found'}</Text>
          <TouchableOpacity onPress={loadProduct} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url.startsWith('http') ? product.image_url : `images/${product.image_url}` }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }]}>
              <Package width={64} height={64} color={Colors.textMuted} />
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryTag}>{product.type || 'General'}</Text>
            {product.is_verified && (
              <View style={styles.verifiedBadge}>
                <Check width={12} height={12} color={Colors.primary} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.ratingRow}>
            <Star width={16} height={16} color="#eab308" fill="#eab308" />
            <Text style={styles.rating}>{product.average_rating ? parseFloat(product.average_rating).toFixed(1) : '0.0'}</Text>
            <Text style={styles.reviews}>({product.review_count || 0} reviews)</Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>TZS {(product.price || 0).toLocaleString()}</Text>
            <Text style={styles.unit}>/{product.weight || 'unit'}</Text>
          </View>

          <View style={styles.sellerRow}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{product.seller_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'S'}</Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.seller_name || 'Verified Seller'}</Text>
              <Text style={styles.sellerRating}>4.8 ★</Text>
            </View>
          </View>

          <View style={styles.quantityRow}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}
                activeOpacity={0.7}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.descriptionTitle}>Description</Text>
          <Text style={styles.description}>{product.description || 'Premium agricultural product sourced directly from verified farmers.'}</Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Origin</Text>
              <Text style={styles.detailValue}>{product.origin || 'Tanzania'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{product.category || 'Grains'}</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cartButton}
              onPress={handleAddToCart}
              disabled={addingToCart}
              activeOpacity={0.8}
            >
              <ShoppingCart width={20} height={20} color={Colors.white} />
              <Text style={styles.cartButtonText}>Add to Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.buyButton}
              onPress={handleCheckout}
              disabled={addingToCart}
              activeOpacity={0.8}
            >
              <Text style={styles.buyButtonText}>Buy Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  imageContainer: {
    width: '100%',
    height: 280,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'uppercase',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  rating: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  reviews: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  unit: {
    fontSize: 15,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#dcfce7',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  sellerRating: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  quantityLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  quantityValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    marginBottom: 18,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  cartButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  buyButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
  },
  buyButtonText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: Colors.danger,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '600',
  },
})
