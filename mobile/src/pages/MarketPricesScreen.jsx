import React, { useState, useEffect, useContext } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../../src/context/AuthContext'
import api from '../../../src/services/api'
import { Colors } from '../components/UI'
import LoadingSpinner from '../components/LoadingSpinner'
import { MapPin, TrendingUp, TrendingDown, Package, BarChart3 } from '../icons'

export default function MarketPricesScreen({ navigation }) {
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [sortBy, setSortBy] = useState('recent')

  useEffect(() => {
    loadPrices()
  }, [])

  const loadPrices = async () => {
    setLoading(true)
    try {
      const data = await api.getMarketPrices()
      if (data.success) {
        setPrices(data.prices || [])
        setError(null)
      } else {
        setError(data.message || 'Failed to load prices')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const regions = [
    { id: 'all', name: 'All Regions' },
    ...Array.from(new Set(prices.map(p => p.region).filter(Boolean))).map(name => ({
      id: name.toLowerCase().replace(/\s+/g, '_'),
      name,
    })),
  ]

  const filteredPrices = selectedRegion === 'all'
    ? prices
    : prices.filter(p => p.region?.toLowerCase().includes(selectedRegion.replace(/_/g, ' ')) || p.region === selectedRegion)

  const sortedPrices = [...filteredPrices].sort((a, b) => {
    if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0)
    if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0)
    if (sortBy === 'alphabetical') return (a.commodity || '').localeCompare(b.commodity || '')
    return new Date(b.updated_at) - new Date(a.updated_at)
  })

  const formatPrice = (price) => price ? (price / 100).toFixed(0) : '0'

  const renderItem = ({ item }) => (
    <View style={styles.priceCard}>
      <View style={styles.priceHeader}>
        <View style={styles.commodityInfo}>
          <Package width={24} height={24} color={Colors.primary} />
          <View>
            <Text style={styles.commodityName}>{item.commodity}</Text>
            <View style={styles.locationRow}>
              <MapPin width={12} height={12} color={Colors.textMuted} />
              <Text style={styles.locationText}>{item.region}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.priceDetails}>
        <Text style={styles.priceValue}>TZS {formatPrice(item.price)}</Text>
        <Text style={styles.priceUnit}>/kg</Text>
        {item.previous_price && item.price > item.previous_price ? (
          <View style={styles.trendUp}>
            <TrendingUp width={14} height={14} color={Colors.success} />
            <Text style={styles.trendUpText}>+{(item.price - item.previous_price).toFixed(0)}</Text>
          </View>
        ) : item.previous_price && item.price < item.previous_price ? (
          <View style={styles.trendDown}>
            <TrendingDown width={14} height={14} color={Colors.danger} />
            <Text style={styles.trendDownText}>-{Math.abs(item.price - item.previous_price).toFixed(0)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.priceFooter}>
        <Text style={styles.updateTime}>Updated {new Date(item.updated_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.regionContainer}>
        <FlatList
          data={regions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.regionChip, selectedRegion === item.id && styles.regionChipActive]}
              onPress={() => setSelectedRegion(item.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.regionChipText, selectedRegion === item.id && styles.regionChipTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.sortRow}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortBy(sortBy === 'recent' ? 'price-low' : sortBy === 'price-low' ? 'price-high' : 'recent')}
          activeOpacity={0.7}
        >
          <Text style={styles.sortButtonText}>
            Sort: {sortBy === 'recent' ? 'Recent' : sortBy === 'price-low' ? 'Low to High' : sortBy === 'price-high' ? 'High to Low' : 'Alphabetical'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingSpinner text="Loading market prices..." />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadPrices} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sortedPrices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <BarChart3 width={48} height={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No prices found</Text>
          <Text style={styles.emptyText}>Try a different region or check back later</Text>
        </View>
      ) : (
        <FlatList
          data={sortedPrices}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={loadPrices}
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
  regionContainer: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  regionChip: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  regionChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  regionChipTextActive: {
    color: Colors.white,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortButton: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortButtonText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  listContent: {
    padding: 12,
  },
  priceCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  priceHeader: {
    marginBottom: 10,
  },
  commodityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  commodityName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  priceDetails: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  priceUnit: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  trendUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendUpText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '600',
  },
  trendDown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendDownText: {
    fontSize: 11,
    color: Colors.danger,
    fontWeight: '600',
  },
  priceFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  updateTime: {
    fontSize: 11,
    color: Colors.textMuted,
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
