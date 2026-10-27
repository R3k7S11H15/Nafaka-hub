import React, { useState, useEffect, useContext } from 'react'
import { View, FlatList, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useCart } from '../../../src/context/CartContext'
import api from '../../../src/services/api'
import { Colors } from '../components/UI'
import { ProductCard } from '../components/ProductCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { Search, Filter, ChevronDown } from '../icons'

export default function ProductsScreen() {
  const navigation = useNavigation()
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [categories, setCategories] = useState(['All'])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [sortByOpen, setSortByOpen] = useState(false)
  const [cartProductId, setCartProductId] = useState(null)

  useEffect(() => {
    loadProducts()
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await api.getSiteCategories()
      if (data.success) {
        const slugs = (data.categories || []).map(c => c.slug)
        setCategories(['All', ...slugs])
      }
    } catch (err) {
      // Keep default 'All' if categories fail
    }
  }

  useEffect(() => {
    let result = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory = selectedCategory === 'All' || p.type === selectedCategory || p.category_id?.toString() === selectedCategory
      return matchesSearch && matchesCategory
    })

    result = [...result].sort((a, b) => {
      if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0)
      if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0)
      return (a.name || '').localeCompare(b.name || '')
    })

    setFiltered(result)
  }, [products, search, selectedCategory, sortBy])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await api.getProducts()
      if (data.success) {
        setProducts(data.products || [])
        setError(null)
      } else {
        setError(data.message || 'Failed to load products')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = async (productId) => {
    setCartProductId(productId)
    try {
      const data = await addToCart(productId, 1)
      if (!data.success) {
        Alert.alert('Error', data.message || 'Failed to add to cart')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to connect to server')
    } finally {
      setCartProductId(null)
    }
  }

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search width={20} height={20} color={Colors.textMuted} />
          <View style={styles.searchInput}>
            <Text style={{ flex: 1, fontSize: 16, color: search ? Colors.text : Colors.textMuted }}>
              {search || 'Search products...'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setSortByOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.filterText}>{sortOptions.find(s => s.value === sortBy)?.label}</Text>
          <ChevronDown width={16} height={16} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryContainer}>
        <FlatList
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryButton,
                selectedCategory === item && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(item)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === item && styles.categoryButtonTextActive,
              ]}>
                {item === 'All' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {loading ? (
        <LoadingSpinner text="Loading products..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadProducts} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Search width={48} height={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>Try adjusting your search or filter criteria</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onAddToCart={handleAddToCart}
              onPress={(product) => navigation.navigate('ProductDetail', { productId: product.id })}
              cartAdding={cartProductId === item.id}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {sortByOpen && (
        <TouchableOpacity
          style={styles.sortOverlay}
          onPress={() => setSortByOpen(false)}
          activeOpacity={1}
        >
          <View style={styles.sortModal}>
            {sortOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.sortOption,
                  sortBy === opt.value && styles.sortOptionActive,
                ]}
                onPress={() => { setSortBy(opt.value); setSortByOpen(false) }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === opt.value && styles.sortOptionTextActive,
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
  },
  filterButton: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  filterText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  categoryContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  categoryButton: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: Colors.white,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  sortOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    width: '70%',
    overflow: 'hidden',
  },
  sortOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sortOptionActive: {
    backgroundColor: '#dcfce7',
  },
  sortOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  sortOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
})
