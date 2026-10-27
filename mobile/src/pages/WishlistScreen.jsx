import React, { useState, useEffect, useContext } from 'react'
import { View, Text, Image, FlatList, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../../src/context/AuthContext'
import { useCart } from '../../../src/context/CartContext'
import api from '../../../src/services/api'
import { Colors } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { Heart, Package, ShoppingCart, Star } from '../icons'

export default function WishlistScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const [wishlist, setWishlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [removingId, setRemovingId] = useState(null)
  const [addingToCartId, setAddingToCartId] = useState(null)
  const { addToCart } = useCart()

  useEffect(() => {
    loadWishlist()
  }, [])

  const loadWishlist = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const data = await api.getWishlist(user.id)
      if (data.success) {
        setWishlist(data.wishlist || data.products || [])
        setError(null)
      } else {
        setError(data.message || 'Failed to load wishlist')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (productId) => {
    Alert.alert('Remove', 'Remove from wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRemovingId(productId)
          try {
            await api.removeFromWishlist(user.id, productId)
            setWishlist(prev => prev.filter(p => p.id !== productId))
          } catch (err) {
            Alert.alert('Error', 'Failed to remove item')
          } finally {
            setRemovingId(null)
          }
        },
      },
    ])
  }

  const handleAddToCart = async (productId) => {
    setAddingToCartId(productId)
    try {
      const data = await addToCart(productId, 1)
      if (!data.success) {
        Alert.alert('Error', data.message || 'Failed to add to cart')
      } else {
        Alert.alert('Success', 'Added to cart')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect to server')
    } finally {
      setAddingToCartId(null)
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.wishlistItem}>
      <TouchableOpacity
        style={styles.wishlistItemInner}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.itemImage}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url.startsWith('http') ? item.image_url : `images/${item.image_url}` }} style={styles.itemImageImg} />
          ) : (
            <View style={[styles.itemImageImg, { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }]}>
              <Package width={32} height={32} color={Colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemDesc} numberOfLines={2}>{item.description || 'Premium agricultural product'}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>TZS {(item.price || 0).toLocaleString()}</Text>
            {item.average_rating && (
              <View style={styles.ratingRow}>
                <Star width={12} height={12} color="#eab308" fill="#eab308" />
                <Text style={styles.ratingText}>{parseFloat(item.average_rating).toFixed(1)}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleAddToCart(item.id)}
          disabled={addingToCartId === item.id}
          activeOpacity={0.7}
        >
          {addingToCartId === item.id ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <ShoppingCart width={18} height={18} color={Colors.primary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={() => handleRemove(item.id)}
          disabled={removingId === item.id}
          activeOpacity={0.7}
        >
          {removingId === item.id ? (
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <Heart width={18} height={18} color={Colors.danger} fill={Colors.danger} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <LoadingSpinner text="Loading wishlist..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadWishlist} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart width={48} height={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptyText}>Save items you like for later</Text>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={loadWishlist}
          refreshing={loading}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  listContent: {
    padding: 16,
  },
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  wishlistItemInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
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
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  itemDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 14,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonDanger: {
    backgroundColor: '#fef2f2',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
})
