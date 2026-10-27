import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Shield, ArrowRight, Loader2 } from 'lucide-react'
import api from '../services/api'

const formatAmount = (value) => {
  if (value == null) return '—'
  if (typeof value === 'string') return value
  return `Up to TZS ${(Number(value) / 1_000_000).toFixed(1)}M`
}

export default function CropInsurance() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getInsurancePolicies()
        if (!mounted) return
        setPolicies(res?.data || res?.policies || res || [])
      } catch {
        if (mounted) setPolicies([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/10 rounded-lg">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Crop Insurance</h1>
              <p className="text-green-100">Protect your crops against weather and pests</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading policies...
          </div>
        ) : policies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">No insurance policies available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {policies.map((product) => {
              const features = product.features || product.benefits || []
              const featuresArr = Array.isArray(features) ? features : typeof features === 'string' ? features.split(',').map(s => s.trim()) : []
              return (
                <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{product.type || product.category || product.kind || 'Insurance'}</span>
                  <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-2">{product.name || product.title}</h3>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-600">Coverage: <span className="font-medium text-gray-900">{formatAmount(product.coverage ?? product.coverage_amount)}</span></p>
                    <p className="text-sm text-gray-600">Premium: <span className="font-medium text-gray-900">{product.premium || product.premium_rate || '—'}</span></p>
                  </div>
                  {featuresArr.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {featuresArr.map((feature, idx) => (
                        <span key={idx} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{feature}</span>
                      ))}
                    </div>
                  )}
                  <NavLink to="/finance" className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2">
                    Get Quote <ArrowRight className="w-4 h-4" />
                  </NavLink>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
