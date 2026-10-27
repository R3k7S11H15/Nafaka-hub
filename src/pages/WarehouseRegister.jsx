import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import { Package } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function WarehouseRegister() {
  const [formData, setFormData] = useState({
    fullName: '', warehouseName: '', contactPerson: '', phone: '', email: '',
    location: '', region: '', businessRegNumber: '', tinNumber: '',
    capacityTonnes: '', storageTypes: '', ratePerTonneDay: '', insuranceInfo: '',
    referenceContacts: '', password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await register(
        formData.fullName,
        formData.phone,
        formData.email,
        null,
        formData.password,
        ROLES.WAREHOUSE,
        {
          warehouse_name: formData.warehouseName,
          contact_person: formData.contactPerson,
          business_registration_number: formData.businessRegNumber,
          tin_number: formData.tinNumber,
          location: formData.location,
          region: formData.region,
          capacity_tonnes: formData.capacityTonnes,
          storage_types: formData.storageTypes,
          rate_per_tonne_day: formData.ratePerTonneDay,
          insurance_info: formData.insuranceInfo,
          reference_contacts: formData.referenceContacts,
        }
      )
      if (data.success) {
        if (data.pending_approval) {
          toast.success('Application submitted for review. You can log in but your account will be pending approval.')
        }
        navigate('/dashboard')
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const update = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Warehouse Registration</h1>
              <p className="text-gray-500 text-sm">Join Nafaka Hub storage network</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-start gap-3">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-red-600 text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input type="text" value={formData.fullName} onChange={update('fullName')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="Your full name" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Warehouse Name *</label>
                <input type="text" value={formData.warehouseName} onChange={update('warehouseName')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="e.g. Mbeya Grain Storage" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                <input type="text" value={formData.contactPerson} onChange={update('contactPerson')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="Primary contact name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
                <input type="tel" value={formData.phone} onChange={update('phone')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="+255 XXX XXX XXX" required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input type="email" value={formData.email} onChange={update('email')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="warehouse@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Region *</label>
                <input type="text" value={formData.region} onChange={update('region')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="e.g. Mbeya, Iringa" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
              <input type="text" value={formData.location} onChange={update('location')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="Full address of warehouse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Business Registration Number</label>
                <input type="text" value={formData.businessRegNumber} onChange={update('businessRegNumber')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="e.g. BRN-12345" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">TIN Number</label>
                <input type="text" value={formData.tinNumber} onChange={update('tinNumber')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="Tax Identification Number" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Capacity (Tonnes)</label>
                <input type="number" value={formData.capacityTonnes} onChange={update('capacityTonnes')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="e.g. 500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Storage Types</label>
                <input type="text" value={formData.storageTypes} onChange={update('storageTypes')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="e.g. Silos, Open yards" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rate per Tonne/Day (TZS)</label>
                <input type="number" value={formData.ratePerTonneDay} onChange={update('ratePerTonneDay')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="e.g. 2000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Insurance Info</label>
                <input type="text" value={formData.insuranceInfo} onChange={update('insuranceInfo')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="Insurance provider and policy" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reference Contacts</label>
              <input type="text" value={formData.referenceContacts} onChange={update('referenceContacts')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="At least 2 existing clients" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
              <input type="password" value={formData.password} onChange={update('password')} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm" placeholder="Create a password" required minLength={6} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="flex-1 bg-green-600 text-white py-3.5 rounded-xl hover:bg-green-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
              <button type="button" onClick={() => navigate('/register')} className="px-6 py-3.5 border border-gray-200 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all">
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
