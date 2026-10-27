import React, { useState, useEffect } from 'react'
import { FileText, TrendingUp, Download, Calendar, Filter, Loader2, Star, Bell, Check } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const reportTypes = [
  { value: '', label: 'All Reports' },
  { value: 'price_trend', label: 'Price Trends' },
  { value: 'market_analysis', label: 'Market Analysis' },
  { value: 'demand_forecast', label: 'Demand Forecast' },
  { value: 'export_report', label: 'Export Reports' },
]

const commodities = ['', 'rice', 'maize', 'wheat', 'sorghum', 'beans']

export default function MarketIntelligence() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ type: '', commodity: '', premium: '' })
  const [subscribed, setSubscribed] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('basic')
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => {
    fetchReports()
    if (user) checkSubscription()
  }, [user, filter])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filter.type) params.type = filter.type
      if (filter.commodity) params.commodity = filter.commodity
      if (filter.premium !== '') params.premium = filter.premium

      const { data } = await api.getMarketReports(params)
      if (data.success) setReports(data.reports)
    } catch (err) {
      console.error('Failed to fetch reports:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkSubscription = async () => {
    try {
      const { data } = await api.getMyMarketSubscription(user.id)
      if (data.success && data.subscription) setSubscribed(true)
    } catch (err) {
      console.error('Failed to check subscription:', err)
    }
  }

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }
    try {
      const { data } = await api.subscribeMarketIntel(user.id, selectedPlan)
      if (data.success) {
        toast.success(`Subscribed to ${data.plan} plan!`, `Amount: TZS ${data.amount.toLocaleString()}/month`)
        setSubscribed(true)
      }
    } catch (err) {
      toast.error('Subscription failed')
    }
  }

  const handleDownload = async (reportId) => {
    try {
      const { data } = await api.purchaseReport(reportId, user?.id)
      if (data.success) {
        const msg = data.amount > 0 ? `Charged TZS ${data.amount.toLocaleString()}` : 'Free report'
        toast.success('Report downloaded!', msg)
      }
    } catch (err) {
      toast.error('Download failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-grain-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Market Intelligence</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Access detailed market reports, price trends, and demand forecasts for informed trading decisions
          </p>
        </div>

        <div className="bg-gradient-to-r from-primary-700 to-primary-900 rounded-2xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Premium Intelligence Subscription</h2>
              <p className="text-primary-100">Get weekly reports, SMS alerts, and exclusive market insights</p>
            </div>
            <div className="flex gap-3">
              {['basic', 'professional', 'enterprise'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => setSelectedPlan(plan)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedPlan === plan ? 'bg-white text-primary-700' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubscribe}
              disabled={subscribed}
              className="bg-white text-primary-700 px-6 py-3 rounded-xl font-medium hover:bg-primary-50 transition disabled:opacity-50 flex items-center gap-2"
            >
              {subscribed ? <><Check className="w-4 h-4" /> Subscribed</> : <><Bell className="w-4 h-4" /> Subscribe</>}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{selectedPlan === 'basic' ? '10K' : selectedPlan === 'professional' ? '25K' : '50K'}</p>
              <p className="text-sm text-primary-200">TZS/month</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{selectedPlan === 'basic' ? 'Weekly' : 'Daily'}</p>
              <p className="text-sm text-primary-200">Updates</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{selectedPlan === 'basic' ? '3' : selectedPlan === 'professional' ? '10' : 'All'}</p>
              <p className="text-sm text-primary-200">Commodities</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter.type}
              onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {reportTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={filter.commodity}
              onChange={(e) => setFilter(prev => ({ ...prev, commodity: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Commodities</option>
              {commodities.filter(c => c).map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <select
              value={filter.premium}
              onChange={(e) => setFilter(prev => ({ ...prev, premium: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Reports</option>
              <option value="0">Free</option>
              <option value="1">Premium</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.is_premium ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {report.is_premium ? 'Premium' : 'Free'}
                    </span>
                    {report.is_premium && (
                      <span className="font-semibold text-gray-900">TZS {report.price?.toLocaleString()}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{report.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{report.summary}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {report.published_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {report.downloads}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    {report.commodity && (
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">{report.commodity}</span>
                    )}
                    {report.region && (
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{report.region}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownload(report.id)}
                    className="w-full bg-primary-50 text-primary-700 py-2 rounded-lg text-sm font-medium hover:bg-primary-100 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {report.is_premium && report.price > 0 ? `Purchase (TZS ${report.price.toLocaleString()})` : 'Download Free'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reports found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  )
}
