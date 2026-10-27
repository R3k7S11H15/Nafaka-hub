import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Shield, UserCheck, AlertCircle, Search, Filter, Loader2, Eye, Ban, CheckCircle } from 'lucide-react'
import api from '../services/api'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorVerificationPage() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [usersRes, analyticsRes] = await Promise.all([
          api.getAdminUsers({ role: 'seller', limit: 1000 }),
          api.getAdminVendorAnalytics({ limit: 1000 }),
        ])
        if (!mounted) return

        const users = Array.isArray(usersRes?.users) ? usersRes.users : Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []
        const analytics = Array.isArray(analyticsRes?.vendors) ? analyticsRes.vendors : []

        const analyticsMap = {}
        analytics.forEach(a => { analyticsMap[a.id] = a })

        const combined = users.map(u => ({
          ...u,
          analytics: analyticsMap[u.id] || {},
        }))

        setVendors(combined)
      } catch {
        if (mounted) setVendors([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filtered = vendors.filter(v => {
    const name = (v.full_name || v.business_name || '').toLowerCase()
    const email = (v.email || '').toLowerCase()
    const matchesSearch = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'verified') return v.is_verified === 1 || v.is_verified === true
    if (filter === 'unverified') return v.is_verified !== 1 && v.is_verified !== true
    if (filter === 'pending') return v.status === 'pending' || (v.analytics && v.analytics.pending)
    return true
  })

  const stats = {
    total: vendors.length,
    verified: vendors.filter(v => v.is_verified === 1 || v.is_verified === true).length,
    unverified: vendors.filter(v => v.is_verified !== 1 && v.is_verified !== true).length,
    pending: vendors.filter(v => v.status === 'pending').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" /> Vendor Verification
            </h1>
            <p className="text-gray-600 mt-1">Review and verify vendor business documents and credentials</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Vendors', value: String(stats.total), icon: Users, color: 'blue' },
            { label: 'Verified', value: String(stats.verified), icon: CheckCircle, color: 'green' },
            { label: 'Unverified', value: String(stats.unverified), icon: AlertCircle, color: 'yellow' },
            { label: 'Pending Review', value: String(stats.pending), icon: UserCheck, color: 'purple' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="all">All Vendors</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No vendors found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Business</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Region</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Revenue</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Rating</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-600">
                              {(vendor.full_name || vendor.business_name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{vendor.full_name || vendor.business_name || '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{vendor.email || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{vendor.business_name || vendor.analytics?.business_name || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{vendor.region || vendor.analytics?.region || '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendor.is_verified === 1 || vendor.is_verified === true
                            ? 'bg-green-100 text-green-800'
                            : vendor.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vendor.is_verified === 1 || vendor.is_verified === true ? 'Verified' : vendor.status === 'pending' ? 'Pending' : 'Unverified'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">{fmtMoney(vendor.analytics?.total_revenue || 0)}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {vendor.analytics?.avg_rating ? `${Number(vendor.analytics.avg_rating).toFixed(1)} ★` : '—'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <NavLink to={`/vendor/verify/${vendor.id}`} className="text-blue-600 hover:text-blue-800">
                            <Eye className="w-4 h-4" />
                          </NavLink>
                          {(vendor.is_verified !== 1 && vendor.is_verified !== true) && (
                            <button className="text-green-600 hover:text-green-800">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          {vendor.is_verified === 1 || vendor.is_verified === true ? (
                            <button className="text-red-600 hover:text-red-800">
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : null}
                        </div>
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
