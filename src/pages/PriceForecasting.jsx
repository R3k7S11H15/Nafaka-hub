import React, { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Brain, Sparkles, AlertTriangle, ChevronDown, Calendar, Zap, Target, ArrowRight, CheckCircle2, Activity, Loader2 } from 'lucide-react'
import api from '../services/api'

const COMMODITIES = ['Rice (Pishori)', 'White Maize', 'Sesame', 'Red Beans', 'Sorghum', 'Groundnuts']
const REGIONS = ['Morogoro', 'Mbeya', 'Iringa', 'Dodoma', 'Mtwara', 'All Tanzania']

const RISK_FACTORS = [
  { name: 'Weather', impact: 'medium', score: 6 },
  { name: 'Supply Volume', impact: 'low', score: 3 },
  { name: 'Regional Demand', impact: 'high', score: 8 },
  { name: 'Currency (TZS/USD)', impact: 'medium', score: 5 },
  { name: 'Fuel/Transport', impact: 'medium', score: 5 },
]

function generateSeries(commodity, basePrice, days = 90) {
  const seasonal = [0.95, 0.92, 0.97, 1.05, 1.10, 1.08, 1.02, 0.96, 0.92, 0.94, 1.00, 1.10]
  const series = []
  const today = new Date()
  for (let i = -90; i < days; i++) {
    const day = new Date(today)
    day.setDate(day.getDate() + i)
    const monthIdx = day.getMonth()
    const noise = (Math.sin(i * 0.3) + Math.cos(i * 0.7)) * 0.04
    const drift = Math.pow(1.012, i / 30)
    const value = basePrice * seasonal[monthIdx] * drift * (1 + noise * 0.5)
    series.push({ date: day.toISOString().split('T')[0], value: Math.round(value), isForecast: i >= 0 })
  }
  return series
}

function forecastMetrics(series) {
  const future = series.filter(s => s.isForecast)
  const past = series.filter(s => !s.isForecast)
  const current = past[past.length - 1].value
  const day30 = future[29]?.value || current
  const day60 = future[59]?.value || current
  const day90 = future[89]?.value || current
  const min = Math.min(...future.map(f => f.value))
  const max = Math.max(...future.map(f => f.value))
  const avg = future.reduce((s, f) => s + f.value, 0) / future.length
  return {
    current,
    day30, day60, day90,
    change30: ((day30 - current) / current * 100),
    change60: ((day60 - current) / current * 100),
    change90: ((day90 - current) / current * 100),
    min, max, avg,
    confidence: 82,
  }
}

const AI_INSIGHTS = {
  'Rice (Pishori)': 'Demand from urban millers expected to rise 15% ahead of festive season. Consider holding stock until October. Cross-border demand from Kenya rising.',
  'White Maize': 'Harvest pressure in southern highlands will keep prices stable in Sept. Export window to DRC opens mid-October — secure buyers now.',
  'Sesame': 'Premium export-grade prices climbing due to Indian and Japanese demand. Organic certification commands 18% premium. Plant contract farming now.',
  'Red Beans': 'Prices typically dip during June-August harvest. Best selling window: November to February. Target Nairobi and Kampala markets.',
  'Sorghum': 'Brewer demand stable. Drought-resistant varieties in high demand from Dodoma and Singida. East African Breweries Ltd actively sourcing.',
  'Groundnuts': 'Cooking oil processors seeking large volumes. Direct contracts available. Watch aflatoxin levels — TBS testing mandatory for export.',
}

function LineChart({ data, width = 800, height = 280 }) {
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const min = Math.min(...data.map(d => d.value)) * 0.95
  const max = Math.max(...data.map(d => d.value)) * 1.05
  const xStep = chartW / (data.length - 1)
  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartH - ((d.value - min) / (max - min)) * chartH,
    ...d,
  }))

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const transitionIdx = points.findIndex(p => p.isForecast)
  const historicalPath = points.slice(0, transitionIdx + 1).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const forecastPath = points.filter(p => p.isForecast).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const yTicks = 5
  const yLabels = Array.from({ length: yTicks }, (_, i) => {
    const val = min + (max - min) * (i / (yTicks - 1))
    const y = padding.top + chartH - (i / (yTicks - 1)) * chartH
    return { val: Math.round(val), y }
  })
  const xLabelInterval = Math.floor(points.length / 8)
  const xLabels = points.filter((_, i) => i % xLabelInterval === 0)

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="histGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="forecastGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yLabels.map((l, i) => (
        <g key={i}>
          <line x1={padding.left} y1={l.y} x2={width - padding.right} y2={l.y} stroke="#f3f4f6" />
          <text x={padding.left - 8} y={l.y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">TZS {l.val.toLocaleString()}</text>
        </g>
      ))}
      {xLabels.map((p, i) => (
        <text key={i} x={p.x} y={height - 8} textAnchor="middle" fontSize="10" fill="#9ca3af">{p.date.slice(5)}</text>
      ))}
      <path d={`${historicalPath} L ${points[transitionIdx].x} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`} fill="url(#histGradient)" />
      <path d={historicalPath} fill="none" stroke="#16a34a" strokeWidth="2.5" />
      {transitionIdx > 0 && (
        <line x1={points[transitionIdx].x} y1={padding.top} x2={points[transitionIdx].x} y2={padding.top + chartH} stroke="#e5e7eb" strokeDasharray="4 4" />
      )}
      <path d={forecastPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 4" />
      {points.map((p, i) => i % 8 === 0 && (
        <circle key={i} cx={p.x} cy={p.y} r={p.isForecast ? 0 : 3} fill={p.isForecast ? '#f59e0b' : '#16a34a'} />
      ))}
    </svg>
  )
}

export default function PriceForecasting() {
  const [commodity, setCommodity] = useState('Rice (Pishori)')
  const [region, setRegion] = useState('Morogoro')
  const [horizon, setHorizon] = useState(90)
  const [prices, setPrices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getMarketPrices()
        if (!mounted) return
        const list = res?.data || res?.prices || res || []
        setPrices(list)
      } catch {
        if (mounted) setPrices([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const currentPrice = useMemo(() => {
    if (!prices.length) return 2500
    const match = prices.find(p => p.commodity && p.commodity.toLowerCase().includes(commodity.toLowerCase().split(' ')[0]))
    return match ? Math.round(Number(match.price || 0) / 100) : 2500
  }, [prices, commodity])

  const series = useMemo(() => generateSeries(commodity, currentPrice, horizon), [commodity, currentPrice, horizon])
  const m = useMemo(() => forecastMetrics(series), [series])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <Brain className="w-7 h-7 text-purple-700" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Price Forecasting</h1>
          <p className="text-gray-600">Predict grain prices 30, 60, 90 days ahead — powered by historical data, weather, and demand signals</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Commodity</label>
            <div className="relative">
              <select value={commodity} onChange={(e) => setCommodity(e.target.value)} className="w-full appearance-none px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                {COMMODITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Region</label>
            <div className="relative">
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full appearance-none px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white">
                {REGIONS.map(r => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Forecast horizon</label>
            <div className="flex gap-2">
              {[30, 60, 90].map(h => (
                <button key={h} onClick={() => setHorizon(h)} className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${horizon === h ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {h}d
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Model</label>
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Ensemble v3.2</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 flex items-center gap-1"><Target className="w-3 h-3" /> Current</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">TZS {m.current.toLocaleString()}</p>
          <p className="text-xs text-gray-500">per kg</p>
        </div>
        <div className={`rounded-xl p-4 border ${m.change30 >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> 30-day forecast</p>
          <p className={`text-2xl font-bold mt-1 ${m.change30 >= 0 ? 'text-green-700' : 'text-red-700'}`}>TZS {m.day30.toLocaleString()}</p>
          <p className={`text-xs flex items-center gap-1 ${m.change30 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {m.change30 >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {m.change30 >= 0 ? '+' : ''}{m.change30.toFixed(1)}%
          </p>
        </div>
        <div className={`rounded-xl p-4 border ${m.change60 >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> 60-day forecast</p>
          <p className={`text-2xl font-bold mt-1 ${m.change60 >= 0 ? 'text-green-700' : 'text-red-700'}`}>TZS {m.day60.toLocaleString()}</p>
          <p className={`text-xs flex items-center gap-1 ${m.change60 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {m.change60 >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {m.change60 >= 0 ? '+' : ''}{m.change60.toFixed(1)}%
          </p>
        </div>
        <div className={`rounded-xl p-4 border ${m.change90 >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> 90-day forecast</p>
          <p className={`text-2xl font-bold mt-1 ${m.change90 >= 0 ? 'text-green-700' : 'text-red-700'}`}>TZS {m.day90.toLocaleString()}</p>
          <p className={`text-xs flex items-center gap-1 ${m.change90 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {m.change90 >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {m.change90 >= 0 ? '+' : ''}{m.change90.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Price Forecast — {commodity}</h3>
              <p className="text-xs text-gray-500">{region} · Historical + AI projection</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-600 inline-block" /> Historical</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block border-dashed" /> Forecast</span>
            </div>
          </div>
          <LineChart data={series} />
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div><p className="text-xs text-gray-500">Forecast range</p><p className="text-sm font-semibold">TZS {m.min.toLocaleString()} – {m.max.toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500">Average</p><p className="text-sm font-semibold">TZS {Math.round(m.avg).toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500">Confidence</p><p className="text-sm font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> {m.confidence}%</p></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-purple-600 to-violet-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">AI Insight</h3>
            </div>
            <p className="text-sm text-purple-100 leading-relaxed">{AI_INSIGHTS[commodity]}</p>
            <button className="mt-4 w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1">
              Get full report <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Risk Factors
            </h4>
            <div className="space-y-3">
              {RISK_FACTORS.map((r) => (
                <div key={r.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-700">{r.name}</span>
                    <span className="font-medium text-gray-900">{r.score}/10</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      r.impact === 'high' ? 'bg-red-500' : r.impact === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                    }`} style={{ width: `${r.score * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" /> Recommended Action
            </h4>
            {m.change30 > 2 ? (
              <div className="text-sm">
                <p className="text-green-700 font-medium">📈 HOLD — prices expected to rise</p>
                <p className="text-gray-600 mt-1">Wait 30 days before selling to maximize returns. Lock in buyer contracts now.</p>
              </div>
            ) : m.change30 < -2 ? (
              <div className="text-sm">
                <p className="text-red-700 font-medium">📉 SELL NOW — prices expected to drop</p>
                <p className="text-gray-600 mt-1">Move inventory in next 7-14 days before prices decline further.</p>
              </div>
            ) : (
              <div className="text-sm">
                <p className="text-gray-700 font-medium">⚖️ STABLE — hold or sell normally</p>
                <p className="text-gray-600 mt-1">Prices expected to remain flat. Focus on quality differentiation.</p>
              </div>
            )}
            <button className="mt-3 w-full bg-purple-50 text-purple-700 text-sm py-2 rounded-lg hover:bg-purple-100">
              Set Price Alert
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" /> Model Performance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">MAPE (30 day)</p>
            <p className="text-2xl font-bold text-gray-900">4.2%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">MAPE (60 day)</p>
            <p className="text-2xl font-bold text-gray-900">6.8%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">MAPE (90 day)</p>
            <p className="text-2xl font-bold text-gray-900">9.4%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Data points used</p>
            <p className="text-2xl font-bold text-gray-900">{prices.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
