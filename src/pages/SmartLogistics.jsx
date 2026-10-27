import React, { useState, useEffect } from 'react'
import {
  Navigation, Truck, Sprout, FlaskConical, Wrench, Warehouse as WarehouseIcon,
  PiggyBank, ShieldCheck, Globe2, ArrowRight, Star, MapPin,
  Search, Users, Phone, CheckCircle2, ChevronRight, Loader2
} from 'lucide-react'
import api from '../services/api'

const ICON_BY_CATEGORY = {
  seeds: Sprout,
  fertilizers: FlaskConical,
  'farm-equipment': Wrench,
  storage: WarehouseIcon,
  logistics: Truck,
  financing: PiggyBank,
  insurance: ShieldCheck,
  export: Globe2,
  default: Truck,
}

const CATEGORY_LABELS = {
  seeds: 'Seeds',
  fertilizers: 'Fertilizers',
  'farm-equipment': 'Farm Equipment',
  storage: 'Storage Services',
  logistics: 'Logistics',
  financing: 'Agricultural Financing',
  insurance: 'Crop Insurance',
  export: 'Export Services',
  default: 'Services',
}

const COLOR_BY_CATEGORY = {
  seeds: 'green',
  fertilizers: 'amber',
  'farm-equipment': 'gray',
  storage: 'indigo',
  logistics: 'blue',
  financing: 'emerald',
  insurance: 'red',
  export: 'cyan',
  default: 'blue',
}

const colorMap = {
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700', hover: 'hover:border-green-300', accent: 'bg-green-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700', hover: 'hover:border-amber-300', accent: 'bg-amber-600' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700', hover: 'hover:border-gray-300', accent: 'bg-gray-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-700', hover: 'hover:border-indigo-300', accent: 'bg-indigo-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700', hover: 'hover:border-blue-300', accent: 'bg-blue-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', hover: 'hover:border-emerald-300', accent: 'bg-emerald-600' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700', hover: 'hover:border-red-300', accent: 'bg-red-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700', hover: 'hover:border-cyan-300', accent: 'bg-cyan-600' },
}

export default function SmartLogistics() {
  const [activeService, setActiveService] = useState('logistics')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getValueAddedServices()
        if (!mounted) return
        const list = res?.data || res?.services || res || []
        setServices(Array.isArray(list) ? list : [])
      } catch {
        if (mounted) setServices([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const grouped = services.reduce((acc, s) => {
    const cat = (s.category || 'default').toLowerCase()
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const categoryKeys = Object.keys(grouped).length > 0 ? Object.keys(grouped) : ['default']
  const activeKey = grouped[activeService] ? activeService : categoryKeys[0]
  const activeProviders = grouped[activeKey] || []
  const activeColor = COLOR_BY_CATEGORY[activeKey] || 'blue'
  const colors = colorMap[activeColor]
  const Icon = ICON_BY_CATEGORY[activeKey] || ICON_BY_CATEGORY.default

  const filteredProviders = activeProviders.filter(p =>
    (p.name || p.provider_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.location || p.region || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-grain-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <Navigation className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agricultural Services</h1>
            <p className="text-gray-500">End-to-end supply chain solutions for farmers and agribusinesses</p>
          </div>
        </div>

        {categoryKeys.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
            {categoryKeys.map((key) => {
              const I = ICON_BY_CATEGORY[key] || ICON_BY_CATEGORY.default
              const c = colorMap[COLOR_BY_CATEGORY[key] || 'blue']
              const isActive = activeKey === key
              return (
                <button
                  key={key}
                  onClick={() => { setActiveService(key); setSelectedProvider(null); setSearchQuery('') }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${isActive ? `${c.border} ${c.bg} shadow-md` : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <I className={`w-6 h-6 ${isActive ? c.text : 'text-gray-500'}`} />
                  <span className={`text-xs font-medium text-center ${isActive ? c.text : 'text-gray-600'}`}>{CATEGORY_LABELS[key] || key}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${colors.text}`} />
                <h2 className="text-xl font-semibold text-gray-900">{CATEGORY_LABELS[activeKey] || activeKey}</h2>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none w-64"
                />
              </div>
            </div>

            {filteredProviders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No providers in this category.</p>
            ) : (
              <div className="space-y-3">
                {filteredProviders.map((provider, idx) => (
                  <div
                    key={provider.id || idx}
                    onClick={() => setSelectedProvider(selectedProvider === idx ? null : idx)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${selectedProvider === idx ? `${colors.border} ${colors.bg}` : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 ${colors.accent} rounded-lg flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{(provider.name || provider.provider_name || '?')[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm">{provider.name || provider.provider_name || '—'}</p>
                          {provider.verified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{provider.location || provider.region || '—'}</span>
                          {provider.rating && <span className="text-xs text-gray-500 flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" />{provider.rating}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${colors.text}`}>{provider.price || provider.price_display || '—'}</span>
                      <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${selectedProvider === idx ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedProvider !== null && filteredProviders[selectedProvider] && (
              <div className={`mt-4 p-5 rounded-xl ${colors.bg} border ${colors.border}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{filteredProviders[selectedProvider].name || filteredProviders[selectedProvider].provider_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{filteredProviders[selectedProvider].description || 'Verified provider'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                    {filteredProviders[selectedProvider].verified ? 'Certified' : 'Standard'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" />Contact Provider
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />Quick Stats
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50">
                  <span className="text-sm text-gray-600">Active Providers</span>
                  <span className="font-semibold text-gray-900">{activeProviders.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-primary-50">
                  <span className="text-sm text-gray-600">Verified Partners</span>
                  <span className="font-semibold text-gray-900">{activeProviders.filter(p => p.verified).length}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="font-semibold text-lg mb-2">Need Help Choosing?</h3>
              <p className="text-sm text-green-100 mb-4">Our agronomists can help you select the right products and services for your farm.</p>
              <button className="w-full bg-white text-primary-700 font-medium py-2.5 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />Call +255 710 379 317
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
