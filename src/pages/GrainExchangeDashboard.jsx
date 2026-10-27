import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { LineChart as LineChartIcon, TrendingUp, TrendingDown, MapPin, Users, Newspaper, Activity, Globe, ArrowUpRight, ArrowDownRight, Minus, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function GrainExchangeDashboard() {
  const [prices, setPrices] = useState([])
  const [auctions, setAuctions] = useState([])
  const [loading, setLoading] = useState(true)
  const [marketSentiment, setMarketSentiment] = useState('neutral')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [p, a] = await Promise.all([
          api.getAllRegionsPrices(),
          api.getAuctions(),
        ])
        if (!mounted) return
        const allPrices = p?.prices ? Object.values(p.prices).flat() : []
        setPrices(allPrices)
        setAuctions(a?.data || a?.auctions || a || [])
      } catch {
        if (mounted) {
          setPrices([])
          setAuctions([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const regions = Array.from(new Set(prices.map(p => p.region).filter(Boolean)))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <LineChartIcon className="w-10 h-10" />
            <h1 className="text-4xl font-bold">National Grain Exchange Dashboard</h1>
          </div>
          <p className="text-blue-100 text-lg">Tanzania's comprehensive grain market intelligence</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{prices.length}</div>
            <div className="text-sm text-gray-500">Tracked Price Records</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{regions.length}</div>
            <div className="text-sm text-gray-500">Active Regions</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <LineChartIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{auctions.length}</div>
            <div className="text-sm text-gray-500">Active Auctions</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-emerald-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 capitalize">{marketSentiment}</div>
            <div className="text-sm text-gray-500">Market Sentiment</div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Globe className="w-6 h-6" /> Live Grain Prices by Region
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading prices...
            </div>
          ) : prices.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No price data available.</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Region</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Commodity</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700">Price (TZS/kg)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {prices.slice(0, 50).map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900 flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-400" /> {item.region || '—'}
                        </td>
                        <td className="py-3 px-4">{item.commodity || '—'}</td>
                        <td className="py-3 px-4 text-right">{Math.round(Number(item.price || 0) / 100).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6" /> Active Auctions
          </h2>
          {auctions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No active auctions.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {auctions.slice(0, 6).map((a, i) => (
                <div key={a.id || a.auction_id || i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold text-gray-900">{a.title || a.commodity || 'Auction'}</h3>
                  <p className="text-sm text-gray-500">{a.region || a.location || '—'}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-500">Status: </span>
                    <span className="font-medium">{a.status || 'Active'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6" /> Market Sentiment Indicator
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  marketSentiment === 'bullish' ? 'bg-green-100' : marketSentiment === 'bearish' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {marketSentiment === 'bullish' ? <TrendingUp className="w-8 h-8 text-green-600" /> : marketSentiment === 'bearish' ? <TrendingDown className="w-8 h-8 text-red-600" /> : <Minus className="w-8 h-8 text-gray-600" />}
                </div>
                <div>
                  <div className="text-3xl font-bold capitalize text-gray-900">{marketSentiment}</div>
                  <p className="text-gray-500">Market sentiment indicator</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMarketSentiment('bullish')} className={`px-4 py-2 rounded-lg font-medium transition ${marketSentiment === 'bullish' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Bullish</button>
                <button onClick={() => setMarketSentiment('neutral')} className={`px-4 py-2 rounded-lg font-medium transition ${marketSentiment === 'neutral' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Neutral</button>
                <button onClick={() => setMarketSentiment('bearish')} className={`px-4 py-2 rounded-lg font-medium transition ${marketSentiment === 'bearish' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Bearish</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
