import React, { useEffect, useState } from 'react'
import { Search, TrendingUp, Package, DollarSign, Star, Eye, X, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../services/api'

export default function AdminVendorAnalyticsPage() {
  const [vendors, setVendors] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [metric, setMetric] = useState('revenue')
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    fetchVendors()
  }, [metric])

  const fetchVendors = async () => {
    setLoading(true)
    try {
      const res = await api.getAdminVendorAnalytics({ vendor_id: search || undefined })
      const topRes = await api.getAdminTopVendors(metric, 20)
      if (topRes?.success) {
        setVendors(topRes.vendors)
        setTotal(topRes.vendors.length)
      } else if (res?.success) {
        setVendors(res.vendors)
        setTotal(res.total)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewVendor = async (vendorId) => {
    setDetailLoading(true)
    setSelectedVendor(vendorId)
    setDetail(null)
    try {
      const res = await api.getAdminVendorAnalyticsDetail(vendorId)
      if (res?.success) setDetail(res)
    } catch (err) {
      console.error(err)
    } finally {
      setDetailLoading(false)
    }
  }

  const stats = [
    { label: 'Total Vendors', value: total, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Products', value: vendors.reduce((s, v) => s + (v.total_products || 0), 0), icon: Package, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Revenue', value: vendors.reduce((s, v) => s + (v.total_revenue || 0), 0), icon: DollarSign, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Avg Rating', value: vendors.length ? (vendors.reduce((s, v) => s + (v.avg_rating || 0), 0) / vendors.length).toFixed(1) : 0, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vendor Analytics</h1>
          <p className="text-gray-600 mt-2">Monitor vendor performance and marketplace contributions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Vendors</h2>
            <div className="flex items-center gap-3">
              <select value={metric} onChange={(e) => setMetric(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="revenue">By Revenue</option>
                <option value="orders">By Orders</option>
                <option value="products">By Products</option>
                <option value="rating">By Rating</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchVendors()}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <button onClick={fetchVendors} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">Search</button>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading vendors...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendors.length === 0 ? (
                    <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No vendors found.</td></tr>
                  ) : vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{v.full_name}</div>
                        <div className="text-sm text-gray-500">{v.business_name || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{v.total_products || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{v.total_orders || 0}</td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">{(v.total_revenue || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{(v.total_commission || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />{(v.avg_rating || 0).toFixed(1)}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleViewVendor(v.id)} className="text-sm text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                          <Eye className="w-4 h-4" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedVendor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Vendor Details</h3>
              <button onClick={() => { setSelectedVendor(null); setDetail(null) }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin w-8 h-8 text-red-600" />
              </div>
            ) : detail ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatCard label="Total Orders" value={detail.stats?.total_orders || 0} />
                  <StatCard label="Revenue" value={(detail.stats?.total_revenue || 0).toLocaleString()} />
                  <StatCard label="Active Products" value={detail.stats?.active_products || 0} />
                  <StatCard label="Avg Rating" value={(detail.stats?.avg_rating || 0).toFixed(1)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Total Commission</p>
                    <p className="text-lg font-bold text-gray-900">{(detail.stats?.total_commission || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Paid Commission</p>
                    <p className="text-lg font-bold text-green-600">{(detail.stats?.paid_commission || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">Pending Commission</p>
                    <p className="text-lg font-bold text-yellow-600">{(detail.stats?.pending_commission || 0).toLocaleString()}</p>
                  </div>
                </div>
                {detail.monthly_revenue?.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Monthly Revenue</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={detail.monthly_revenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(val) => [val.toLocaleString(), 'Revenue']} />
                        <Bar dataKey="revenue" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {detail.top_products?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Products</h4>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detail.top_products.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{p.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{(p.price || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{p.order_count || 0}</td>
                            <td className="px-4 py-2 text-sm font-medium text-green-600">{(p.revenue || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500">No detail data available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}
