import React, { useState, useEffect } from 'react'
import { FileText, Plus, Calendar, MapPin, Package, DollarSign, Shield, CheckCircle2, Clock, X, ChevronRight, Edit2, FileSignature, Sprout, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import api from '../services/api'

const statusColor = (s) => ({
  in_progress: 'bg-blue-100 text-blue-700',
  harvest_ready: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  disputed: 'bg-red-100 text-red-700',
}[s] || 'bg-gray-100 text-gray-700')

const fmt = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return `TZS ${(n / 1_000_000).toFixed(1)}M`
}

export default function ContractFarming() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('active')
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()
  const [contractForm, setContractForm] = useState({
    crop: '', acres: '', expected_yield: '', price_per_kg: '',
    planting_date: '', harvest_date: '', terms: '',
  })
  const [showRequests, setShowRequests] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getMyContracts()
        if (!mounted) return
        setList(res?.data || res?.contracts || res || [])
      } catch {
        if (mounted) setList([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const active = list.filter(c => c.status === 'in_progress' || c.status === 'harvest_ready')
  const past = list.filter(c => c.status === 'completed')

  const totalValue = active.reduce((s, c) => s + Number(c.totalValue || c.total_value || 0), 0)
  const expectedYieldSum = active.reduce((s, c) => s + Number(String(c.expectedYield || c.expected_yield || '0').replace(/[^0-9.]/g, '')), 0)
  const insuredCount = active.filter(c => c.insurance && c.insurance !== 'Not requested').length
  const insuredPct = active.length > 0 ? Math.round((insuredCount / active.length) * 100) : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <FileSignature className="w-7 h-7 text-amber-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Contract Farming</h1>
            <p className="text-gray-600">Pre-harvest agreements between farmers, cooperatives & buyers</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRequests(true)} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50">
            <FileText className="w-5 h-5" /> Buyer Requests
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-amber-600 text-white px-5 py-2.5 rounded-lg hover:bg-amber-700 shadow-sm">
            <Plus className="w-5 h-5" /> New Contract
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
          <FileText className="w-6 h-6 text-amber-700 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{active.length}</p>
          <p className="text-xs text-gray-500">Active contracts</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <DollarSign className="w-6 h-6 text-green-700 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{fmt(totalValue)}</p>
          <p className="text-xs text-gray-500">Total contract value</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-xl p-4">
          <Package className="w-6 h-6 text-blue-700 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{(expectedYieldSum / 1000).toFixed(0)}t</p>
          <p className="text-xs text-gray-500">Expected harvest</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4">
          <Shield className="w-6 h-6 text-purple-700 mb-2" />
          <p className="text-2xl font-bold text-gray-900">{insuredPct}%</p>
          <p className="text-xs text-gray-500">Insured contracts</p>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          <button onClick={() => setTab('active')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'active' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500'}`}>
            Active Contracts ({active.length})
          </button>
          <button onClick={() => setTab('completed')} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === 'completed' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500'}`}>
            Completed ({past.length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading contracts...
        </div>
      ) : (
        <div className="space-y-4">
          {(tab === 'active' ? active : past).map((c) => (
            <div key={c.id || c.contract_id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{c.crop || c.commodity || 'Contract'}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{(c.status || '').replace('_', ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.id || c.contract_id || ''} · {c.buyer || ''} ↔ {c.farmer || ''}</p>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {c.region || '—'}</span>
                    <span className="flex items-center gap-1"><Sprout className="w-3 h-3" /> {c.acres || '—'} acres</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Harvest {c.harvestDate || c.harvest_date || '—'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{fmt(c.totalValue ?? c.total_value)}</p>
                  <p className="text-xs text-gray-500">@ TZS {c.pricePerKg ?? c.price_per_kg ?? '—'}/kg</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium text-gray-900">{c.progress ?? 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.status === 'completed' ? 'bg-green-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`} style={{ width: `${c.progress ?? 0}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Advance paid: {fmt(c.advancePaid ?? c.advance_paid)} ({c.totalValue ? Math.round((Number(c.advancePaid ?? c.advance_paid) || 0) / Number(c.totalValue) * 100) : 0}%)</p>
                <button onClick={() => setSelected(c)} className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                  View Details <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {tab === 'active' && active.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No active contracts</p>
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selected.crop || 'Contract'} — {selected.id || selected.contract_id}</h2>
                <p className="text-sm text-gray-500 mt-1">{selected.buyer || ''} ↔ {selected.farmer || ''}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${statusColor(selected.status)}`}>{(selected.status || '').replace('_', ' ')}</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Total Value</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(selected.totalValue ?? selected.total_value)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Price per kg</p>
                  <p className="text-xl font-bold text-gray-900">TZS {selected.pricePerKg ?? selected.price_per_kg ?? '—'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Expected Yield</p>
                  <p className="text-xl font-bold text-gray-900">{selected.expectedYield || selected.expected_yield || '—'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-gray-500">Acres</p>
                  <p className="text-xl font-bold text-gray-900">{selected.acres || '—'}</p>
                </div>
              </div>

              {Array.isArray(selected.milestones) && selected.milestones.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Contract Milestones</h3>
                  <div className="space-y-3">
                    {selected.milestones.map((m, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {m.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-gray-400" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">{m.name}</p>
                            <p className="text-sm font-semibold text-gray-900">{fmt(m.amount)}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{m.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selected.qualityRequirements && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">Quality Requirements</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>Moisture: {selected.qualityRequirements.moisture || '—'}</li>
                      <li>Grade: {selected.qualityRequirements.grade || '—'}</li>
                      <li>Broken grains: {selected.qualityRequirements.brokenGrains || '—'}</li>
                    </ul>
                  </div>
                )}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Insurance & Risk</h4>
                  <p className="text-sm text-gray-700 flex items-start gap-2">
                    <Shield className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>{selected.insurance || 'Not specified'}</span>
                  </p>
                  {selected.cooperative && <p className="text-xs text-gray-500 mt-2">Cooperative: {selected.cooperative}</p>}
                </div>
              </div>

              {selected.terms && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Terms & Conditions</h4>
                  <p className="text-sm text-gray-700">{selected.terms}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 bg-amber-600 text-white py-2.5 rounded-lg hover:bg-amber-700">
                  <FileText className="w-4 h-4" /> Download PDF Contract
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50">
                  <Edit2 className="w-4 h-4" /> Amend Terms
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRequests && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowRequests(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Open Buyer Requests</h2>
              <button onClick={() => setShowRequests(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">No buyer requests available.</div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Draft New Contract</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <select value={contractForm.crop} onChange={(e) => setContractForm({ ...contractForm, crop: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                <option value="">Select crop</option>
                {['Rice', 'Maize', 'Beans', 'Sesame', 'Groundnuts', 'Sorghum'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={contractForm.acres} onChange={(e) => setContractForm({ ...contractForm, acres: e.target.value })} placeholder="Acres / Hectares" type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              <input value={contractForm.expected_yield} onChange={(e) => setContractForm({ ...contractForm, expected_yield: e.target.value })} placeholder="Expected yield (kg)" type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              <input value={contractForm.price_per_kg} onChange={(e) => setContractForm({ ...contractForm, price_per_kg: e.target.value })} placeholder="Price per kg (TZS)" type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              <input value={contractForm.planting_date} onChange={(e) => setContractForm({ ...contractForm, planting_date: e.target.value })} placeholder="Planting date" type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              <input value={contractForm.harvest_date} onChange={(e) => setContractForm({ ...contractForm, harvest_date: e.target.value })} placeholder="Expected harvest date" type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              <textarea value={contractForm.terms} onChange={(e) => setContractForm({ ...contractForm, terms: e.target.value })} placeholder="Special terms..." rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
              <button onClick={async (e) => {
                e.preventDefault()
                if (!contractForm.crop || !contractForm.acres) {
                  toast.error('Please select a crop and specify acres')
                  return
                }
                setSubmitting(true)
                try {
                  const res = await api.createDispute({ ...contractForm })
                  if (res?.success) {
                    toast.success('Contract drafted successfully')
                    setShowCreate(false)
                    setContractForm({ crop: '', acres: '', expected_yield: '', price_per_kg: '', planting_date: '', harvest_date: '', terms: '' })
                  } else {
                    toast.error(res?.message || 'Failed to create contract')
                  }
                } catch {
                  toast.error('Failed to create contract')
                } finally {
                  setSubmitting(false)
                }
              }} disabled={submitting} className="w-full bg-amber-600 text-white py-2.5 rounded-lg hover:bg-amber-700 font-medium inline-flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Sending...' : 'Send Contract for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
