import { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, FileText, Phone, Mail, MapPin, Building2, Package, DollarSign } from 'lucide-react'
import api from '../services/api'

export default function PendingApprovalScreen() {
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const data = await api.getMyApplication()
        if (mounted) {
          if (data.success) {
            setApplication(data)
          } else {
            setError(data.message || 'Failed to load application status')
          }
        }
      } catch {
        if (mounted) setError('Failed to connect to server')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-6 h-6 text-green-600" />
      case 'rejected': return <XCircle className="w-6 h-6 text-red-600" />
      default: return <Clock className="w-6 h-6 text-yellow-600" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-50 border-green-200 text-green-800'
      case 'rejected': return 'bg-red-50 border-red-200 text-red-800'
      default: return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const isPending = application?.applications?.[0]?.status === 'pending' || !application?.is_verified
  const appData = application?.applications?.[0]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                {getStatusIcon(appData?.status)}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Application Status</h1>
                <p className="text-green-100 mt-1">
                  {isPending ? 'Your application is under review' : 'Application processed'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {isPending && (
              <div className={`border rounded-xl p-6 mb-8 ${getStatusColor(appData?.status)}`}>
                <div className="flex items-start gap-4">
                  <Clock className="w-8 h-8 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Pending Admin Approval</h3>
                    <p className="text-sm opacity-90 mb-4">
                      Your {application?.type === 'logistics_company' ? 'logistics company' : 'warehouse'} registration 
                      has been submitted and is awaiting verification by our team.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                        <span>Application submitted on {appData?.created_at ? new Date(appData.created_at).toLocaleDateString() : 'recently'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                        <span>Typical review time: 24-48 hours</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-current rounded-full"></div>
                        <span>You will be notified once your application is reviewed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {appData?.status === 'approved' && (
              <div className={`border rounded-xl p-6 mb-8 ${getStatusColor('approved')}`}>
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Application Approved!</h3>
                    <p className="text-sm opacity-90">
                      Congratulations! Your application has been approved. You can now access all features.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {appData?.status === 'rejected' && (
              <div className={`border rounded-xl p-6 mb-8 ${getStatusColor('rejected')}`}>
                <div className="flex items-start gap-4">
                  <XCircle className="w-8 h-8 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Application Not Approved</h3>
                    <p className="text-sm opacity-90">
                      Unfortunately, your application was not approved at this time.
                    </p>
                    {appData.notes && (
                      <div className="mt-3 p-3 bg-white/50 rounded-lg">
                        <p className="text-sm font-medium mb-1">Reason:</p>
                        <p className="text-sm">{appData.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {appData && (
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Application Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {application.type === 'logistics_company' ? (
                    <>
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Company</p>
                          <p className="font-medium text-gray-900">{appData.company_name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                          <p className="font-medium text-gray-900">{appData.phone}</p>
                        </div>
                      </div>
                      {appData.email && (
                        <div className="flex items-start gap-3">
                          <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                            <p className="font-medium text-gray-900">{appData.email}</p>
                          </div>
                        </div>
                      )}
                      {appData.coverage_areas && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Coverage Areas</p>
                            <p className="font-medium text-gray-900">{appData.coverage_areas}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Warehouse</p>
                          <p className="font-medium text-gray-900">{appData.warehouse_name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                          <p className="font-medium text-gray-900">{appData.location}, {appData.region}</p>
                        </div>
                      </div>
                      {appData.capacity_tonnes && (
                        <div className="flex items-start gap-3">
                          <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Capacity</p>
                            <p className="font-medium text-gray-900">{appData.capacity_tonnes} tonnes</p>
                          </div>
                        </div>
                      )}
                      {appData.rate_per_tonne_day && (
                        <div className="flex items-start gap-3">
                          <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Rate</p>
                            <p className="font-medium text-gray-900">{appData.rate_per_tonne_day} TZS/tonne/day</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleString()}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
