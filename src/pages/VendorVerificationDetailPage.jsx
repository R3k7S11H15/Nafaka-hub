import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, CheckCircle, XCircle, Building2, FileText, Phone, Mail, MapPin, Calendar, DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorVerificationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [userRes, analyticsRes] = await Promise.all([
          api.getAdminUsers({ role: 'seller', limit: 1000 }),
          api.getAdminVendorAnalyticsDetail(id),
        ])
        if (!mounted) return

        const users = Array.isArray(userRes?.users) ? userRes.users : Array.isArray(userRes?.data?.users) ? userRes.data.users : []
        const found = users.find(u => String(u.id) === String(id))
        setVendor(found || null)
        setAnalytics(analyticsRes || null)
      } catch {
        if (mounted) {
          setVendor(null)
          setAnalytics(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const handleVerify = async () => {
    setActionLoading(true)
    try {
      await api.request(`/auth.php?action=update_profile`, {
        method: 'POST',
        body: { customer_id: id, is_verified: 1 },
      })
      toast.success('Vendor verified successfully')
      navigate('/verification')
    } catch {
      toast.error('Failed to verify vendor')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    setActionLoading(true)
    try {
      await api.request(`/auth.php?action=update_profile`, {
        method: 'POST',
        body: { customer_id: id, is_active: 0, rejection_reason: reason },
      })
      toast.success('Vendor rejected')
      navigate('/verification')
    } catch {
      toast.error('Failed to reject vendor')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <p className="text-gray-500">Vendor not found</p>
          <button onClick={() => navigate('/verification')} className="mt-4 text-green-600 hover:text-green-700">Back to Verification</button>
        </div>
      </div>
    )
  }

  const isVerified = vendor.is_verified === 1 || vendor.is_verified === true

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/verification')} className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Verification</h1>
            <p className="text-gray-600 mt-1">Review vendor credentials and business information</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" /> Business Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Business Name</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.business_name || vendor.analytics?.business_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Business Type</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.business_type || vendor.analytics?.business_type || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">TIN Number</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.tin_number || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Registration Date</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.created_at ? new Date(vendor.created_at).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Region</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.region || vendor.analytics?.region || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isVerified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" /> Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Shipping Address</p>
                  <p className="text-sm font-medium text-gray-900">{vendor.shipping_address || '—'}</p>
                </div>
              </div>
            </div>

            {analytics && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" /> Performance Metrics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-xl font-bold text-gray-900">{analytics.stats?.total_orders || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-xl font-bold text-green-600">{fmtMoney(analytics.stats?.total_revenue || 0)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Avg Order Value</p>
                    <p className="text-xl font-bold text-gray-900">{fmtMoney(analytics.stats?.avg_order_value || 0)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Products</p>
                    <p className="text-xl font-bold text-gray-900">{analytics.stats?.total_products || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Active Products</p>
                    <p className="text-xl font-bold text-green-600">{analytics.stats?.active_products || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Avg Rating</p>
                    <p className="text-xl font-bold text-yellow-600">{analytics.stats?.avg_rating ? `${Number(analytics.stats.avg_rating).toFixed(1)} ★` : '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {!isVerified && (
                  <button
                    onClick={handleVerify}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                  >
                    <CheckCircle className="w-4 h-4" /> Verify Vendor
                  </button>
                )}
                {isVerified && (
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                  >
                    <XCircle className="w-4 h-4" /> Revoke Verification
                  </button>
                )}
                <button
                  onClick={() => navigate(`/admin/vendors/analytics?vendor_id=${id}`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium"
                >
                  <TrendingUp className="w-4 h-4" /> View Full Analytics
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">Business Registration</p>
                  <p className="text-xs text-gray-500 mt-1">Upload business certificate</p>
                  <button className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">Upload Document</button>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">TIN Certificate</p>
                  <p className="text-xs text-gray-500 mt-1">Upload TIN document</p>
                  <button className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">Upload Document</button>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">ID Document</p>
                  <p className="text-xs text-gray-500 mt-1">Upload national ID or passport</p>
                  <button className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">Upload Document</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
