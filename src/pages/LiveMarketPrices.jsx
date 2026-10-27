import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Bell, MapPin, RefreshCw, AlertCircle } from 'lucide-react'
import api from '../services/api'

export default function LiveMarketPrices() {
  const [prices, setPrices] = useState([])
  const [historyCache, setHistoryCache] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeRegion, setActiveRegion] = useState('All Regions')
  const [alertTarget, setAlertTarget] = useState('')
  const [alertPrice, setAlertPrice] = useState('')
  const [alertCondition, setAlertCondition] = useState('above')
  const [alertSubmitting, setAlertSubmitting] = useState(false)
  const [alertSuccess, setAlertSuccess] = useState(false)
  const [alertError, setAlertError] = useState(null)

  useEffect(() => {
    fetchAllPrices()
  }, [])

  useEffect(() => {
    if (prices.length > 0) {
      const filtered = activeRegion === 'All Regions' ? prices : prices.filter(p => p.region === activeRegion)
      fetchHistoryForItems(filtered)
    }
  }, [activeRegion, prices])

  const regions = ['All Regions', ...Array.from(new Set(prices.map(p => p.region).filter(Boolean)))]

  const fetchAllPrices = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getAllRegionsPrices()
      if (data.success) {
        const allPrices = Object.values(data.prices || {}).flat()
        setPrices(allPrices)
      } else {
        setError(data.message || 'API error')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistoryForItems = async (items) => {
    const uniqueKeys = [...new Set(items.map(p => `${p.commodity}-${p.region}`))]
    const missingKeys = uniqueKeys.filter(k => !historyCache[k])

    if (missingKeys.length === 0) return

    const promises = missingKeys.map(async key => {
      const [commodity, region] = key.split('-')
      const data = await api.getPriceHistory(commodity, region, 7)
      return { key, history: data.success ? data.history : [] }
    })

    const results = await Promise.all(promises)
    const newCache = { ...historyCache }
    results.forEach(({ key, history }) => {
      newCache[key] = history
    })
    setHistoryCache(newCache)
  }

  const getChangePercent = (item) => {
    const key = `${item.commodity}-${item.region}`
    const history = historyCache[key]
    if (!history || history.length < 2) return 0
    const oldest = history[0].price
    const newest = history[history.length - 1].price
    if (oldest === 0) return 0
    return parseFloat(((newest - oldest) / oldest * 100).toFixed(1))
  }

  const getSparklineData = (item) => {
    const key = `${item.commodity}-${item.region}`
    const history = historyCache[key]
    if (!history || history.length === 0) return [30, 45, 35, 50, 40, 55, 48, 60]
    return history.map(h => h.price)
  }

  const filteredPrices = activeRegion === 'All Regions' ? prices : prices.filter(p => p.region === activeRegion)

  const handleRefresh = () => {
    setHistoryCache({})
    fetchAllPrices()
  }

  const handleAlertSubmit = async (e) => {
    e.preventDefault()
    setAlertError(null)
    setAlertSuccess(false)
    if (!alertTarget || !alertPrice) return

    setAlertSubmitting(true)
    try {
      const data = await api.createPriceAlert(null, alertTarget, parseFloat(alertPrice), alertCondition)
      if (data.success) {
        setAlertSuccess(true)
        setAlertTarget('')
        setAlertPrice('')
        setTimeout(() => setAlertSuccess(false), 3000)
      } else {
        setAlertError(data.message || 'Failed to create alert')
      }
    } catch (err) {
      setAlertError(err.message)
    } finally {
      setAlertSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Market Prices</h1>
            <p className="text-gray-500 mt-1">Real-time grain prices across Tanzania</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Market Prices</h1>
            <p className="text-gray-500 mt-1">Real-time grain prices across Tanzania</p>
          </div>
          <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm font-medium">Retry</span>
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Failed to load market prices</h3>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Market Prices</h1>
          <p className="text-gray-500 mt-1">Real-time grain prices across Tanzania</p>
        </div>
        <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="h-4 w-4" />
          <span className="text-sm font-medium">Refresh</span>
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {regions.map(region => (
          <button
            key={region}
            onClick={() => setActiveRegion(region)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeRegion === region
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {region}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrices.map((item, index) => {
          const change = getChangePercent(item)
          const sparklineData = getSparklineData(item)
          const pricePerKg = (item.price / 100).toFixed(0)

          return (
            <div key={`${item.id}-${item.region}`} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.commodity}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="h-4 w-4" />
                    {item.region}
                  </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                  change > 0 ? 'bg-green-100 text-green-700' : change < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {change > 0 ? <TrendingUp className="h-4 w-4" /> : change < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                  {Math.abs(change)}%
                </div>
              </div>
              <div className="mb-4">
                <p className="text-3xl font-bold text-gray-900">TZS {pricePerKg}<span className="text-lg text-gray-500">/kg</span></p>
              </div>
              <div className="h-16 flex items-end gap-1">
                {sparklineData.map((val, i) => {
                  const maxVal = Math.max(...sparklineData)
                  const minVal = Math.min(...sparklineData)
                  const range = maxVal - minVal || 1
                  const heightPercent = ((val - minVal) / range) * 80 + 20
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 rounded-t"
                      style={{ height: `${heightPercent}%`, opacity: 0.3 + (i / sparklineData.length) * 0.7 }}
                    ></div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900">Set Price Alert</h2>
        </div>
        {alertSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Price alert created successfully!
          </div>
        )}
        {alertError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {alertError}
          </div>
        )}
        <form onSubmit={handleAlertSubmit} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <input
              type="text"
              value={alertTarget}
              onChange={e => setAlertTarget(e.target.value)}
              placeholder="e.g., Rice"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <select
              value={alertCondition}
              onChange={e => setAlertCondition(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Price (TZS/kg)</label>
            <input
              type="number"
              value={alertPrice}
              onChange={e => setAlertPrice(e.target.value)}
              placeholder="850"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button type="submit" disabled={alertSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {alertSubmitting ? 'Creating...' : 'Create Alert'}
          </button>
        </form>
      </div>
    </div>
  )
}
