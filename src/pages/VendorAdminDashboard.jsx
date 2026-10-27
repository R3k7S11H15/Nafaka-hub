import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Users, UserCheck, Package, DollarSign, TrendingUp,
  ArrowUpRight, ArrowDownRight, Star, Bell, Search, Brain,
  Lightbulb, Zap, Loader2, Truck, MapPin, User, BarChart3,
  Shield, FileText, ClipboardCheck, MessageSquare, CheckSquare
} from 'lucide-react'
import api from '../services/api'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorAdminDashboard() {
  const [stats, setStats] = useState([
    { label: 'Total Vendors', value: '...', change: '', up: true, icon: Users, color: 'blue' },
    { label: 'Active Vendors', value: '...', change: '', up: true, icon: Package, color: 'green' },
    { label: 'Pending Applications', value: '...', change: '', up: true, icon: UserCheck, color: 'yellow' },
    { label: 'Suspended Vendors', value: '...', change: '', up: true, icon: Shield, color: 'red' },
  ])
  const [applications, setApplications] = useState([])
  const [topVendors, setTopVendors] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [usersRes, appsRes, analyticsRes, auditRes, suspendedRes] = await Promise.all([
          api.getAdminUsers({ role: 'seller', limit: 1000 }),
          api.getApplications().catch(() => ({ success: true, applications: [] })),
          api.getAdminVendorAnalytics({ limit: 1000 }).catch(() => ({ success: true, vendors: [] })),
          api.getAdminAuditLogs().catch(() => ({ success: true, logs: [] })),
          api.getSuspendedVendors().catch(() => ({ success: true, suspended: [] })),
        ])

        if (!mounted) return

        const users = Array.isArray(usersRes?.users) ? usersRes.users : Array.isArray(usersRes?.data?.users) ? usersRes.data.users : []
        const apps = Array.isArray(appsRes?.applications) ? appsRes.applications : Array.isArray(appsRes?.data?.applications) ? appsRes.data.applications : []
        const analytics = Array.isArray(analyticsRes?.vendors) ? analyticsRes.vendors : []
        const logs = Array.isArray(auditRes?.logs) ? auditRes.logs : Array.isArray(auditRes) ? auditRes : []
        const suspended = Array.isArray(suspendedRes?.suspended) ? suspendedRes.suspended : Array.isArray(suspendedRes?.data) ? suspendedRes.data : []

        const activeCount = users.filter(u => u.is_active === 1 || u.is_active === true).length
        const pendingCount = apps.filter(a => (a.status || '').toLowerCase() === 'pending').length
        const totalRevenue = analytics.reduce((s, v) => s + Number(v.total_revenue || 0), 0)

        setStats([
          { label: 'Total Vendors', value: String(users.length), change: '', up: true, icon: Users, color: 'blue' },
          { label: 'Active Vendors', value: String(activeCount), change: '', up: true, icon: Package, color: 'green' },
          { label: 'Pending Applications', value: String(pendingCount), change: '', up: true, icon: UserCheck, color: 'yellow' },
          { label: 'Suspended Vendors', value: String(suspended.length), change: '', up: false, icon: Shield, color: 'red' },
        ])

        setApplications(apps.slice(0, 5))
        setTopVendors(analytics.slice(0, 5))
        setRecentActivity(logs.slice(0, 8))
      } catch (err) {
        console.error('Failed to fetch vendor dashboard data:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Loading vendor overview...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vendor Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Vendor onboarding, verification, and performance management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Vendor Applications</h2>
            <NavLink to="/vendor/applications" className="text-primary-600 hover:text-primary-700 text-sm font-medium">View All</NavLink>
          </div>
          {applications.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No applications yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Applicant</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id || app.application_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">{app.applicant_name || app.full_name || app.name || '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          (app.status || '').toLowerCase() === 'approved' ? 'bg-green-100 text-green-700' :
                          (app.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {app.status || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{app.created_at ? new Date(app.created_at).toISOString().split('T')[0] : '—'}</td>
                      <td className="py-4 px-4">
                        <NavLink to={`/vendor/verify/${app.customer_id || app.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Review</NavLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h2>
          {topVendors.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-4">
              {topVendors.map((vendor, i) => (
                <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{vendor.full_name || vendor.business_name || '—'}</p>
                    <p className="text-xs text-gray-500">{vendor.total_orders || 0} orders · {vendor.total_products || 0} products</p>
                  </div>
                  <span className="text-xs font-semibold text-green-600">{fmtMoney(vendor.total_revenue || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <NavLink to="/vendor/applications" className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Review Applications</span>
            </NavLink>
            <NavLink to="/verification" className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Verify Vendors</span>
            </NavLink>
            <NavLink to="/vendor/reports" className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">View Reports</span>
            </NavLink>
            <NavLink to="/vendor/bulk-actions" className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
              <CheckSquare className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">Bulk Actions</span>
            </NavLink>
            <NavLink to="/vendor/communications" className="flex items-center gap-3 p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors">
              <MessageSquare className="h-5 w-5 text-pink-600" />
              <span className="text-sm font-medium text-gray-700">Send Announcement</span>
            </NavLink>
            <NavLink to="/admin/vendors/analytics" className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <span className="text-sm font-medium text-gray-700">Vendor Analytics</span>
            </NavLink>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">{activity.action || 'Action'}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{activity.details || '—'}</p>
                    <p className="text-xs text-gray-400 mt-1">{activity.created_at ? new Date(activity.created_at).toLocaleString() : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
