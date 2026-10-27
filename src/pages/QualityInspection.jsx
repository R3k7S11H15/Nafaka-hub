import React, { useState, useEffect } from 'react'
import { ClipboardCheck, Upload, FileText, Shield, Award, CheckCircle, AlertTriangle, Loader2, AlertCircle } from 'lucide-react'
import api from '../services/api'

const STATUS_COLORS = {
  Passed: 'bg-green-100 text-green-700',
  Review: 'bg-yellow-100 text-yellow-700',
  Failed: 'bg-red-100 text-red-700',
}

export default function QualityInspection() {
  const [formData, setFormData] = useState({
    moisture: '', purity: '', broken: '', grade: 'A', foreignMatter: '', notes: ''
  })
  const [inspectionResults, setInspectionResults] = useState([])
  const [inspectors, setInspectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.getQualityInspections()
        if (!mounted) return
        if (data.success || data.inspections) {
          const results = (data.inspections || data.results || []).map((item) => ({
            type: item.commodity || item.grain_type || item.type || 'Unknown',
            moisture: item.moisture || 0,
            purity: item.purity || 0,
            grade: item.grade || item.quality_grade || '—',
            inspector: item.inspector || '—',
            date: item.date || item.inspected_at || '—',
            status: item.status || 'Review',
          }))
          setInspectionResults(results)
        }
      } catch (err) {
        if (mounted) setError(err?.message || 'Failed to load inspection data')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const metrics = [
    { label: 'Moisture Content', value: parseInt(formData.moisture) || 0, color: 'bg-blue-500', optimal: '< 14%' },
    { label: 'Purity', value: parseInt(formData.purity) || 0, color: 'bg-green-500', optimal: '> 95%' },
    { label: 'Broken Grain', value: parseInt(formData.broken) || 0, color: 'bg-yellow-500', optimal: '< 5%' },
    { label: 'Foreign Matter', value: parseInt(formData.foreignMatter) || 0, color: 'bg-red-500', optimal: '< 1%' },
  ]

  const getStatusColor = (status) => STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-grain-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quality Inspection</h1>
            <p className="text-gray-500">Certified grain quality verification</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Inspection Form</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Moisture Content (%)</label>
                <input type="number" value={formData.moisture} onChange={(e) => setFormData({...formData, moisture: e.target.value})} className="input-field" placeholder="e.g. 12" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Purity (%)</label>
                <input type="number" value={formData.purity} onChange={(e) => setFormData({...formData, purity: e.target.value})} className="input-field" placeholder="e.g. 95" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Broken Grain (%)</label>
                <input type="number" value={formData.broken} onChange={(e) => setFormData({...formData, broken: e.target.value})} className="input-field" placeholder="e.g. 3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Quality Grade</label>
                <select value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="input-field">
                  <option value="A">Grade A - Premium</option>
                  <option value="B">Grade B - Standard</option>
                  <option value="C">Grade C - Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Foreign Matter (%)</label>
                <input type="number" value={formData.foreignMatter} onChange={(e) => setFormData({...formData, foreignMatter: e.target.value})} className="input-field" placeholder="e.g. 0.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Inspector Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="input-field" rows="3" placeholder="Additional observations..."></textarea>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button className="btn-primary py-2.5 px-6 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Generate Report
              </button>
              <button className="btn-secondary py-2.5 px-6 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Report
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary-600" />
              Quality Meter
            </h2>
            <div className="space-y-4">
              {metrics.map((metric) => (
                <div key={metric.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{metric.label}</span>
                    <span className="text-gray-500">{metric.optimal}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className={`${metric.color} h-3 rounded-full transition-all`} style={{ width: `${Math.min(metric.value, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{metric.value}% measured</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary-600" />
                <span className="font-semibold text-primary-900">Certificate Preview</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">Quality Certificate</span>
                </div>
                <p className="text-xs text-gray-500">Sample: Premium Rice - Grade A - 97% Purity</p>
                <div className="flex items-center gap-1 mt-2">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">TBS Certified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Certified Inspectors</h2>
          {inspectors.length === 0 ? (
            <p className="text-sm text-gray-500">No inspectors available at the moment.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {inspectors.map((inspector) => (
                <div key={inspector.name} className="border border-gray-200 rounded-xl p-4 hover:border-primary-300 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{inspector.name}</p>
                      <p className="text-xs text-gray-500">{inspector.cert} | {inspector.region}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-700">{inspector.rating}</span>
                    <span className="text-xs text-gray-500">/5.0</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Inspection Results</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-blue-600" />
              Loading inspection results…
            </div>
          ) : inspectionResults.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No inspection results available</p>
              <p className="text-sm mt-1">Be the first to submit a quality inspection.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Grain Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Moisture</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Purity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Inspector</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inspectionResults.map((row) => (
                    <tr key={row.type + row.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.moisture}%</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.purity}%</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.grade}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{row.inspector}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{row.date}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                          {row.status === 'Passed' ? <CheckCircle className="w-3 h-3" /> : row.status === 'Failed' ? <AlertTriangle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
