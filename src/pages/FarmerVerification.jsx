import React, { useState, useEffect } from 'react'
import { Shield, CheckCircle, Star, Globe, Upload, FileText, Award, Plus, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const badgeTypes = [
  { name: 'Verified Farmer', color: 'green', icon: CheckCircle, description: 'Basic verification for individual farmers' },
  { name: 'Verified Company', color: 'blue', icon: Shield, description: 'Verification for registered grain companies' },
  { name: 'Premium Seller', color: 'yellow', icon: Star, description: 'High-quality sellers with excellent track record' },
  { name: 'Export Certified', color: 'purple', icon: Globe, description: 'Certified for international grain export' },
]

const verificationSteps = [
  { step: 1, title: 'Submit Documents', description: 'Upload your identification and farm documents', icon: Upload },
  { step: 2, title: 'Document Review', description: 'Our team reviews your submitted documents', icon: FileText },
  { step: 3, title: 'Field Inspection', description: 'On-site inspection of your farm or facility', icon: Shield },
  { step: 4, title: 'Badge Awarded', description: 'Receive your verification badge', icon: Award },
]

const getBadgeColor = (color) => {
  const colors = {
    green: 'bg-green-100 text-green-700 border-green-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  }
  return colors[color] || 'bg-gray-100 text-gray-700'
}

export default function FarmerVerification() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    farmLocation: '',
    farmSize: '',
    yearsOfExperience: '',
    idNumber: '',
    supportingDocuments: null
  })
  const [verifiedProfiles, setVerifiedProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminCustomers({ verified: 1, limit: 10 })
        if (!mounted) return
        const list = res?.data?.customers || res?.data || res?.customers || res || []
        const arr = Array.isArray(list) ? list : []
        const mapped = arr.map(c => ({
          name: c.full_name || c.business_name || c.name || '—',
          badges: c.verified ? ['Verified Farmer'] : [],
          rating: Number(c.rating || 0),
          transactions: Number(c.transaction_count || c.total_orders || 0),
        }))
        setVerifiedProfiles(mapped)
      } catch {
        if (mounted) setVerifiedProfiles([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    toast.success('Verification request submitted successfully')
    setShowForm(false)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Farmer Verification</h1>
        <p className="text-gray-500 mt-1">Trust and credibility system</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Verification Badge Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {badgeTypes.map((badge, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${getBadgeColor(badge.color)}`}>
                  <badge.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{badge.name}</h3>
              </div>
              <p className="text-sm text-gray-500">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Verification Process</h2>
        <div className="flex items-center justify-between">
          {verificationSteps.map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center flex-1">
              <div className="relative">
                <div className="p-3 bg-blue-100 rounded-full mb-3">
                  <step.icon className="h-6 w-6 text-blue-600" />
                </div>
                {index < verificationSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-gray-200 -translate-y-1/2" style={{ width: 'calc(100% + 1rem)' }}></div>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Step {step.step}</h3>
              <p className="text-xs text-gray-500 max-w-[150px]">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Verified Profiles</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="animate-spin w-6 h-6 mr-2" />Loading profiles...
          </div>
        ) : verifiedProfiles.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No verified profiles yet.</p>
        ) : (
          <div className="space-y-4">
            {verifiedProfiles.map((profile, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{profile.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {profile.badges.map((badge, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">{badge}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />{profile.rating || '—'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{profile.transactions} transactions</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Submit Verification Request</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /><span className="text-sm font-medium">Start Verification</span>
            </button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farm Location</label>
                <input type="text" value={formData.farmLocation} onChange={e => setFormData({ ...formData, farmLocation: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farm Size (acres)</label>
                <input type="text" value={formData.farmSize} onChange={e => setFormData({ ...formData, farmSize: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <input type="text" value={formData.yearsOfExperience} onChange={e => setFormData({ ...formData, yearsOfExperience: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                <input type="text" value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Documents</label>
                <input type="file" onChange={e => setFormData({ ...formData, supportingDocuments: e.target.files[0] })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Submit Request</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
