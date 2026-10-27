import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors } from '../components/UI'
import { Star, ShoppingCart } from '../icons'

export function ProductCard({ product, onAddToCart, onPress, cartAdding = false }) {
  const price = product.price || 0
  const rating = product.average_rating ? parseFloat(product.average_rating).toFixed(1) : '0.0'

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress && onPress(product)} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url.startsWith('http') ? product.image_url : `images/${product.image_url}` }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.ratingBadge}>
          <Star width={12} height={12} color="#eab308" fill="#eab308" />
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.categoryTag}>{product.type || 'General'}</Text>
        <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {product.description || 'Premium agricultural product'}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>TZS {price.toLocaleString()}</Text>
          <Text style={styles.unit}>/{product.weight || 'unit'}</Text>
        </View>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => onAddToCart && onAddToCart(product.id)}
          disabled={cartAdding}
          activeOpacity={0.8}
        >
          <ShoppingCart width={18} height={18} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 2,
  },
  content: {
    padding: 16,
    position: 'relative',
  },
  categoryTag: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  unit: {
    fontSize: 13,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  cartButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
})
