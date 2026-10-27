import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Package, DollarSign, Download, Filter, Calendar, Loader2 } from 'lucide-react'
import api from '../services/api'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorReportsPage() {
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({
    totalVendors: 0,
    activeVendors: 0,
    newVendors: 0,
    pendingApplications: 0,
    totalRevenue: 0,
    avgCommission: 0,
    topRegions: [],
    vendorGrowth: [],
    approvalRate: 0,
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [vendorsRes, appsRes, analyticsRes] = await Promise.all([
          api.getAdminVendorAnalytics({ limit: 1000 }),
          api.getApplications({ status: 'pending' }).catch(() => ({ success: true, applications: [] })),
          api.getAdminTopVendors('revenue', 20).catch(() => ({ success: true, vendors: [] })),
        ])
        if (!mounted) return

        const vendors = Array.isArray(vendorsRes?.vendors) ? vendorsRes.vendors : []
        const applications = Array.isArray(appsRes?.applications) ? appsRes.applications : []
        const topVendors = Array.isArray(analyticsRes?.vendors) ? analyticsRes.vendors : []

        const active = vendors.filter(v => (v.is_active || v.is_active === 1)).length
        const totalRevenue = vendors.reduce((s, v) => s + Number(v.total_revenue || 0), 0)
        const avgCommission = vendors.length > 0
          ? (vendors.reduce((s, v) => s + Number(v.commission_rate || v.avg_commission || 0), 0) / vendors.length).toFixed(2)
          : 0

        const regionCounts = {}
        vendors.forEach(v => {
          const r = v.region || v.business_region || 'Unknown'
          regionCounts[r] = (regionCounts[r] || 0) + 1
        })
        const topRegions = Object.entries(regionCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }))

        setReportData({
          totalVendors: vendors.length,
          activeVendors: active,
          newVendors: vendors.filter(v => {
            if (!v.created_at) return false
            const d = new Date(v.created_at)
            const now = new Date()
            return (now - d) < 30 * 24 * 60 * 60 * 1000
          }).length,
          pendingApplications: applications.length,
          totalRevenue,
          avgCommission,
          topRegions,
          vendorGrowth: topVendors.slice(0, 10),
          approvalRate: vendors.length > 0 ? ((vendors.length - applications.length) / vendors.length * 100).toFixed(1) : 0,
        })
      } catch (err) {
        console.error('Failed to fetch vendor reports:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [period])

  const handleExport = (type) => {
    const url = `/api/superadmin/export/${type}?limit=1000`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Reports</h1>
            <p className="text-gray-600 mt-1">Vendor performance, registration trends, and platform analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={() => handleExport('users')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Vendors', value: String(reportData.totalVendors), icon: Users, color: 'blue' },
                { label: 'Active Vendors', value: String(reportData.activeVendors), icon: Package, color: 'green' },
                { label: 'New Vendors', value: String(reportData.newVendors), icon: TrendingUp, color: 'purple' },
                { label: 'Pending Applications', value: String(reportData.pendingApplications), icon: Users, color: 'yellow' },
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Regions by Vendor Count</h2>
                <div className="space-y-3">
                  {reportData.topRegions.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                  ) : (
                    reportData.topRegions.map((region, i) => (
                      <div key={region.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-6">{i + 1}</span>
                          <span className="text-sm text-gray-900">{region.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">{region.count} vendors</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Vendors</h2>
                <div className="space-y-3">
                  {reportData.vendorGrowth.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                  ) : (
                    reportData.vendorGrowth.map((v, i) => (
                      <div key={v.id || i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500 w-6">{i + 1}</span>
                          <span className="text-sm text-gray-900">{v.full_name || v.business_name || '—'}</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">{fmtMoney(v.total_revenue || 0)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Platform Revenue</p>
                  <p className="text-xl font-bold text-gray-900">{fmtMoney(reportData.totalRevenue)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Average Commission Rate</p>
                  <p className="text-xl font-bold text-gray-900">{reportData.avgCommission}%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Vendor Approval Rate</p>
                  <p className="text-xl font-bold text-gray-900">{reportData.approvalRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => handleExport('users')} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium">
                  <Download className="w-4 h-4" /> Export Vendors
                </button>
                <button onClick={() => handleExport('orders')} className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium">
                  <Download className="w-4 h-4" /> Export Orders
                </button>
                <button onClick={() => handleExport('financial')} className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-medium">
                  <Download className="w-4 h-4" /> Export Financial
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
