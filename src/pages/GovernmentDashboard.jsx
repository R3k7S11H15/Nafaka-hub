import React, { useState, useMemo, useEffect } from 'react'
import { Landmark, Users, Package, DollarSign, Download, MapPin, AlertTriangle, FileText, Globe, ArrowRight, Eye, Loader2 } from 'lucide-react'
import api from '../services/api'

const nationalStats = {
  totalProduction: 0,
  totalValue: 0,
  farmersActive: 0,
  hectaresPlanted: 0,
  foodSecurityIndex: 76,
  exports: 0,
}

export default function GovernmentDashboard() {
  const [prices, setPrices] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRegion, setFilterRegion] = useState('All Regions')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [p, pr] = await Promise.all([
          api.getAllRegionsPrices(),
          api.getProducts(),
        ])
        if (!mounted) return
        const allPrices = p?.prices ? Object.values(p.prices).flat() : []
        setPrices(allPrices)
        setProducts(pr?.data || pr?.products || pr || [])
      } catch {
        if (mounted) {
          setPrices([])
          setProducts([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const regions = useMemo(() => {
    const set = new Set(prices.map(p => p.region).filter(Boolean))
    return ['All Regions', ...Array.from(set)]
  }, [prices])

  const regionStats = useMemo(() => {
    const map = {}
    prices.forEach(p => {
      if (!p.region) return
      if (!map[p.region]) map[p.region] = { region: p.region, total: 0, count: 0, commodities: new Set() }
      map[p.region].total += Number(p.price || 0)
      map[p.region].count += 1
      if (p.commodity) map[p.region].commodities.add(p.commodity)
    })
    return Object.values(map).map(r => ({
      region: r.region,
      avgPrice: r.count > 0 ? Math.round(r.total / r.count) : 0,
      commodities: Array.from(r.commodities),
    }))
  }, [prices])

  const filteredRegions = filterRegion === 'All Regions' ? regionStats : regionStats.filter(r => r.region === filterRegion)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Landmark className="w-7 h-7 text-blue-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Government & Ministry Dashboard</h1>
            <p className="text-gray-600">National grain market intelligence for policy makers</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-4">
          <Package className="w-5 h-5 text-blue-700 mb-2" />
          <p className="text-xs text-gray-500">Tracked Products</p>
          <p className="text-xl font-bold text-gray-900">{products.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <DollarSign className="w-5 h-5 text-green-700 mb-2" />
          <p className="text-xs text-gray-500">Tracked Regions</p>
          <p className="text-xl font-bold text-gray-900">{regionStats.length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4">
          <Users className="w-5 h-5 text-purple-700 mb-2" />
          <p className="text-xs text-gray-500">Active Farmers</p>
          <p className="text-xl font-bold text-gray-900">—</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4">
          <MapPin className="w-5 h-5 text-amber-700 mb-2" />
          <p className="text-xs text-gray-500">Hectares</p>
          <p className="text-xl font-bold text-gray-900">—</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4">
          <DollarSign className="w-5 h-5 text-emerald-700 mb-2" />
          <p className="text-xs text-gray-500">Food Security</p>
          <p className="text-xl font-bold text-gray-900">—</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
          <Globe className="w-5 h-5 text-indigo-700 mb-2" />
          <p className="text-xs text-gray-500">Exports</p>
          <p className="text-xl font-bold text-gray-900">—</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Regional Performance</h3>
          <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
            {regions.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading regional data...
          </div>
        ) : filteredRegions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No regional data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Avg Price (TZS/kg)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Records</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commodities</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRegions.map(r => (
                  <tr key={r.region} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900">{r.region}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.avgPrice.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.count}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.commodities.slice(0, 3).map(c => (
                          <span key={c} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">{c}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Market Alerts
          </h3>
          <div className="text-center py-8 text-gray-500">No active alerts.</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" /> Cross-Border Exports
          </h3>
          <div className="text-center py-8 text-gray-500">No export data available.</div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Policy & Research Reports
          </h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View archive</button>
        </div>
        <div className="text-center py-8 text-gray-500">No reports available.</div>
      </div>
    </div>
  )
}
