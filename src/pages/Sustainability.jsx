import React, { useState, useEffect } from 'react'
import { Leaf, TreePine, Droplet, Recycle, Sun, Wind, Award, TrendingUp, Plus, CheckCircle2, MapPin, X, BarChart3, Loader2 } from 'lucide-react'
import api from '../services/api'

const ICON_MAP = { organic: Leaf, rotation: Recycle, water: Droplet, tree: TreePine, solar: Sun, wind: Wind, compost: Recycle, ipm: Leaf }
const COLOR_MAP = { organic: 'green', rotation: 'amber', water: 'blue', tree: 'emerald', solar: 'yellow', wind: 'cyan', compost: 'amber', ipm: 'green' }

export default function Sustainability() {
  const [practices, setPractices] = useState([])
  const [certifications, setCertifications] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPractices, setSelectedPractices] = useState([])
  const [acres, setAcres] = useState(25)
  const [showCert, setShowCert] = useState(false)
  const [showProject, setShowProject] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: '', location: '', acres: '', methodology: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    try {
      const data = await api.getSustainability()
      if (data.success) {
        const pList = (data.practices || []).map(p => ({
          id: p.slug,
          name: p.name,
          co2PerHa: 1.0,
          color: COLOR_MAP[p.slug] || 'green',
          icon: ICON_MAP[p.slug] || Leaf,
          description: p.impact,
        }))
        setPractices(pList)
        setCertifications(data.certifications || [])
        setProjects((data.projects || []).map(p => ({
          id: p.id,
          name: p.name,
          cooperator: p.region,
          co2Tons: parseFloat(p.co2_offset_tons || 0),
          value: parseFloat(p.co2_offset_tons || 0) * 20000,
          status: p.status,
          vintage: p.start_date ? new Date(p.start_date).getFullYear() : '',
          acres: 0,
        })))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    load()
  }, [])

  const handleProjectSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await api.createSustainabilityProject({
        name: projectForm.name,
        description: projectForm.description,
        region: projectForm.location,
        methodology: projectForm.methodology,
        acres: projectForm.acres,
      })
      if (res.success) {
        setShowProject(false)
        setProjectForm({ name: '', location: '', acres: '', methodology: '', description: '' })
        load()
      }
    } catch (err) { console.error(err) }
    finally { setSubmitting(false) }
  }

  const totalCO2 = practices
    .filter(p => selectedPractices.includes(p.id))
    .reduce((s, p) => s + p.co2PerHa * acres / 2.471, 0)

  const estValue = totalCO2 * 20000

  const toggle = (id) => {
    setSelectedPractices(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Leaf className="w-7 h-7 text-green-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sustainability & Carbon Credits</h1>
            <p className="text-gray-600">Track sustainable practices, measure impact, earn tradeable carbon credits</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCert(true)} className="flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-50">
            <Award className="w-5 h-5" /> Certifications
          </button>
          <button onClick={() => setShowProject(true)} className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 shadow-sm">
            <Plus className="w-5 h-5" /> Register Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Sustainable Practice Tracker</h3>
              <p className="text-xs text-gray-500">Select practices you're using to calculate your carbon impact</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Farm size</p>
              <input type="number" value={acres} onChange={(e) => setAcres(parseInt(e.target.value) || 0)} className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-right" />
              <span className="text-xs text-gray-500 ml-1">acres</span>
            </div>
          </div>

          {practices.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sustainability practices available yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {practices.map((p) => {
                const Icon = p.icon
                const active = selectedPractices.includes(p.id)
                return (
                  <button key={p.id} onClick={() => toggle(p.id)} className={`text-left p-4 rounded-xl border-2 transition-all ${active ? `border-${p.color}-500 bg-${p.color}-50` : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${p.color}-100`}>
                        <Icon className={`w-5 h-5 text-${p.color}-700`} />
                      </div>
                      {active && <CheckCircle2 className={`w-5 h-5 text-${p.color}-600`} />}
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                    {p.description && <p className="text-xs text-gray-500 mt-1">{p.description}</p>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5" />
              <h3 className="font-semibold">Carbon Credit Estimator</h3>
            </div>
            <p className="text-3xl font-bold">{totalCO2.toFixed(1)}</p>
            <p className="text-green-100 text-sm">tCO₂e / year (estimate)</p>
            <div className="mt-4 pt-4 border-t border-green-400/30">
              <p className="text-sm text-green-100">Estimated credit value</p>
              <p className="text-2xl font-bold">TZS {estValue.toLocaleString()}</p>
              <p className="text-xs text-green-200 mt-1">@ TZS 20,000 per tCO₂e</p>
            </div>
            <button className="mt-4 w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm py-2 rounded-lg">
              Apply for Verification
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h4 className="font-semibold text-gray-900 mb-3">Carbon Projects</h4>
            {projects.length === 0 ? (
              <p className="text-xs text-gray-500">No carbon projects registered yet.</p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 3).map(p => (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
                    </div>
                    <p className="text-xs text-gray-600 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.cooperator}</p>
                    <div className="flex justify-between text-xs mt-2">
                      <span className="font-medium text-gray-900">{p.co2Tons.toFixed(0)} tCO₂e</span>
                      <span className="text-green-700 font-medium">TZS {(p.value / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCert && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowCert(false)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Available Certifications</h2>
              <button onClick={() => setShowCert(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-3">
              {certifications.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No certifications available.</p>
              ) : certifications.map(c => (
                <div key={c.id} className="border border-gray-200 rounded-lg p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <Award className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-sm text-gray-600">{c.issuing_body}</p>
                      {c.description && <p className="text-xs text-gray-500 mt-1">{c.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showProject && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowProject(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Register Carbon Project</h3>
              <button onClick={() => setShowProject(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
             <div className="space-y-3">
              <input value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="Project name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" required />
              <input value={projectForm.location} onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })} placeholder="Location (region)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" required />
              <input value={projectForm.acres} onChange={(e) => setProjectForm({ ...projectForm, acres: e.target.value })} placeholder="Acres" type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              <select value={projectForm.methodology} onChange={(e) => setProjectForm({ ...projectForm, methodology: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">Methodology</option>
                <option value="VM0007">VM0007 - REDD+ Methodology</option>
                <option value="VM0042">VM0042 - Improved Agricultural Land Management</option>
                <option value="AMS-III.B">AMS-III.B - Smallholder Agroforestry</option>
              </select>
              <textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Project description..." rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              <button onClick={handleProjectSubmit} disabled={submitting || !projectForm.name || !projectForm.location} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
