import React, { useState, useEffect, useContext } from 'react'
import { View, ScrollView, Text, Image, TouchableOpacity, FlatList, Alert, StyleSheet, ImageBackground } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useCart } from '../../../src/context/CartContext'
import api from '../../../src/services/api'
import { Colors, Button } from '../components/UI'
import { ProductCard } from '../components/ProductCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { Home as HomeIcon, ShoppingCart, Package, MapPin, Star, Users, Truck, Shield, Wheat, ArrowRight, Bell, MessageSquare, ShoppingBag } from '../icons'

const categoryIcons = {
  'Rice': Package, 'Maize': Wheat, 'Wheat': Wheat, 'Sorghum': Wheat,
  'Beans': Package, 'Groundnuts': Package, 'Millet': Wheat,
  'Certified Seeds': Wheat, 'Seeds': Wheat, 'Fertilizers': Wheat, 'Fertilizer': Wheat,
  'Farm Equipment': Package, 'Storage Services': Package, 'Logistics': Truck,
  'Financing': Shield, 'Crop Insurance': Shield, 'Export Services': ShoppingBag,
}

export default function HomeScreen() {
  const navigation = useNavigation()
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [featuredProducts, setFeaturedProducts] = useState([])
  const [marketPrices, setMarketPrices] = useState([])
  const [categories, setCategories] = useState([])
  const [stats, setStats] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [marketsLoading, setMarketsLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(true)
  const [productsError, setProductsError] = useState(null)
  const [marketsError, setMarketsError] = useState(null)
  const [cartAddingId, setCartAddingId] = useState(null)

  useEffect(() => {
    fetchFeaturedProducts()
    fetchMarketPrices()
    fetchContent()
  }, [])

  const fetchFeaturedProducts = async () => {
    setProductsLoading(true)
    try {
      const data = await api.getProducts({ limit: 8 })
      if (data.success) {
        setProducts(data.products || [])
        setFeaturedProducts((data.products || []).slice(0, 4))
      } else {
        setProductsError(data.message || 'Failed to load products')
      }
    } catch (err) {
      setProductsError('Failed to connect to server')
    } finally {
      setProductsLoading(false)
    }
  }

  const fetchMarketPrices = async () => {
    setMarketsLoading(true)
    try {
      const data = await api.getMarketPrices()
      if (data.success) {
        setMarketPrices((data.prices || []).slice(0, 4))
      } else {
        setMarketsError(data.message || 'Failed to load prices')
      }
    } catch (err) {
      setMarketsError('Failed to connect to server')
    } finally {
      setMarketsLoading(false)
    }
  }

  const fetchContent = async () => {
    setContentLoading(true)
    try {
      const [cat, st] = await Promise.all([
        api.getSiteCategories(),
        api.getSiteStats(),
      ])
      if (cat.success) setCategories((cat.categories || []).slice(0, 8))
      if (st.success) setStats(st.stats || [])
    } catch (err) {
      console.error('Failed to load site content', err)
    } finally {
      setContentLoading(false)
    }
  }

  const handleAddToCart = async (productId) => {
    setCartAddingId(productId)
    try {
      await addToCart(productId, 1)
    } catch (err) {
      Alert.alert('Error', 'Failed to add to cart')
    } finally {
      setCartAddingId(null)
    }
  }

  const renderCategory = ({ item, index }) => {
    const Icon = categoryIcons[item.name] || Package
    return (
      <TouchableOpacity
        style={styles.categoryCard}
        onPress={() => navigation.navigate('Products')}
        activeOpacity={0.7}
      >
        <View style={styles.categoryIcon}>
          <Icon width={24} height={24} color={Colors.primary} />
        </View>
        <Text style={styles.categoryName}>{item.name}</Text>
        {item.description ? <Text style={styles.categoryCount} numberOfLines={1}>{item.description}</Text> : null}
      </TouchableOpacity>
    )
  }

  const renderMarketPrice = ({ item, index }) => (
    <View style={styles.priceCard}>
      <Text style={styles.priceCommodity}>{item.commodity}</Text>
      <View style={styles.priceLocation}>
        <MapPin width={12} height={12} color={Colors.textMuted} />
        <Text style={styles.priceRegion}>{item.region}</Text>
      </View>
      <Text style={styles.priceValue}>TZS {(item.price || 0).toLocaleString()}</Text>
      <Text style={styles.priceUnit}>/kg</Text>
      {item.trend === 'rising' ? (
        <View style={[styles.trendBadge, { backgroundColor: '#dcfce7' }]}>
          <Text style={[styles.trendText, { color: Colors.success }]}>rising</Text>
        </View>
      ) : item.trend === 'falling' ? (
        <View style={[styles.trendBadge, { backgroundColor: '#fee2e2' }]}>
          <Text style={[styles.trendText, { color: Colors.danger }]}>falling</Text>
        </View>
      ) : (
        <View style={[styles.trendBadge, { backgroundColor: '#f1f5f9' }]}>
          <Text style={[styles.trendText, { color: Colors.textMuted }]}>stable</Text>
        </View>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../assets/back.png')}
          style={styles.hero}
          resizeMode="cover"
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Smart Grain Trading for Tanzania</Text>
            <Text style={styles.heroSubtitle}>Connecting farmers, wholesalers, and buyers across Tanzania</Text>
            <View style={styles.heroButtons}>
              <Button title="Browse Products" onPress={() => navigation.navigate('Products')} />
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('Register')}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Become a Seller</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.heroCrops}>
            {['Rice', 'Maize', 'Groundnuts', 'Beans', 'Wheat'].map((crop, i) => (
              <View key={i} style={styles.heroCrop}>
                <Package width={20} height={20} color={Colors.accent} />
                <Text style={styles.heroCropText}>{crop}</Text>
              </View>
            ))}
          </View>
        </ImageBackground>

        <View style={styles.stats}>
          {stats.length === 0 ? (
            <Text style={styles.statLabel}>—</Text>
          ) : stats.slice(0, 4).map((s) => (
            <View key={s.id} style={styles.statCard}>
              <View style={styles.statIcon}>
                <Users width={24} height={24} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Shop by Category</Text>
          </View>
          {contentLoading ? (
            <LoadingSpinner text="Loading categories..." />
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCategory}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Products')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {productsLoading ? (
            <LoadingSpinner text="Loading products..." />
          ) : (
            <FlatList
              data={featuredProducts}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onAddToCart={handleAddToCart}
                  onPress={(product) => navigation.navigate('ProductDetail', { productId: product.id })}
                  cartAdding={cartAddingId === item.id}
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Market Prices</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MarketPrices')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {marketsLoading ? (
            <LoadingSpinner text="Loading market prices..." />
          ) : marketsError ? (
            <Text style={styles.errorText}>{marketsError}</Text>
          ) : (
            <FlatList
              data={marketPrices}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderMarketPrice}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 4 }}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const stats = StyleSheet.create({
  statIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    backgroundColor: Colors.primaryDark,
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 16,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21,128,61,0.72)',
  },
  heroContent: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#bbf7d0',
    lineHeight: 22,
    marginBottom: 16,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  heroCrops: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  heroCrop: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroCropText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  categoryCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 6,
    width: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#dcfce7',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  categoryCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  priceCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 6,
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  priceCommodity: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  priceLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  priceRegion: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  priceUnit: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  trendBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  errorText: {
    color: Colors.danger,
    textAlign: 'center',
    padding: 16,
  },
})
