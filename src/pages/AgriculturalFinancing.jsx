import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { DollarSign, ArrowRight, Loader2 } from 'lucide-react'
import api from '../services/api'

export default function AgriculturalFinancing() {
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getLoanProducts()
        if (!mounted) return
        const list = res?.data || res?.loans || res?.products || res || []
        setLoans(Array.isArray(list) ? list : [])
      } catch {
        if (mounted) setLoans([])
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
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Agricultural Financing</h1>
              <p className="text-green-100">Loans and credit for farmers and agribusinesses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin w-8 h-8" />
          </div>
        ) : loans.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No financing products available yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {loans.map((p) => (
              <div key={p.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{p.name || p.title || '—'}</h3>
                <p className="text-3xl font-bold text-green-600 mb-1">{p.amount || p.max_amount || '—'}</p>
                <p className="text-sm text-gray-500 mb-3">{p.rate ? `Rate: ${p.rate}` : ''}{p.term_months ? ` · ${p.term_months} months` : ''}</p>
                {p.eligibility && <p className="text-sm text-gray-600 mb-4">Eligibility: {p.eligibility}</p>}
                <NavLink to="/financing" className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                  Apply Now <ArrowRight className="w-4 h-4" />
                </NavLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
