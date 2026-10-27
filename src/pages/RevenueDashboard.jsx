import React, { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Users, Package, Truck, Warehouse, FileText, Briefcase, ArrowUpRight, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import api from '../services/api'

const COLORS = ['#059669', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1']

export default function RevenueDashboard() {
  const [overview, setOverview] = useState(null)
  const [projections, setProjections] = useState(null)
  const [subscriptionStats, setSubscriptionStats] = useState(null)
  const [commissionBreakdown, setCommissionBreakdown] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ start: new Date().toISOString().slice(0, 7) + '-01', end: new Date().toISOString().slice(0, 10) })

  useEffect(() => {
    fetchDashboardData()
  }, [dateRange])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const [overviewRes, projectionsRes, subRes, commissionRes] = await Promise.all([
        api.getRevenueOverview(dateRange.start, dateRange.end),
        api.getRevenueProjections(),
        api.getSubscriptionStats(),
        api.getCommissionBreakdown()
      ])

      if (overviewRes?.data?.success) setOverview(overviewRes.data)
      if (projectionsRes?.data?.success) setProjections(projectionsRes.data)
      if (subRes?.data?.success) setSubscriptionStats(subRes.data)
      if (commissionRes?.data?.success) setCommissionBreakdown(commissionRes.data.daily || [])
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Revenue', value: overview?.grand_total || 0, icon: DollarSign, color: 'green', format: true },
    { label: 'Monthly Projection', value: projections?.monthly_projection || 0, icon: TrendingUp, color: 'blue', format: true },
    { label: 'Paid Sellers', value: subscriptionStats?.totals?.paid_sellers || 0, icon: Users, color: 'purple' },
    { label: 'Daily Average', value: projections?.daily_average || 0, icon: DollarSign, color: 'yellow', format: true },
  ]

  const revenueByType = overview?.by_type?.map(item => ({
    name: item.revenue_type.replace('_', ' '),
    value: item.total
  })) || []

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Revenue Dashboard</h1>
            <p className="text-gray-500 mt-1">Platform monetization overview</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={fetchDashboardData}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.format ? `TZS ${stat.value.toLocaleString()}` : stat.value}
                  </p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Type</h2>
            {revenueByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={revenueByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {revenueByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `TZS ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No revenue data available</p>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              {revenueByType.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="capitalize">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Commissions</h2>
            {commissionBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={commissionBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => `TZS ${value.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-8">No commission data available</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plans</h2>
            {subscriptionStats?.plans && (
              <div className="space-y-4">
                {subscriptionStats.plans.map((plan) => (
                  <div key={plan.slug} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500">{plan.subscribers} subscribers</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">TZS {plan.monthly_revenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">monthly</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Streams</h2>
            <div className="space-y-3">
              {[
                { name: 'Sale Commissions', icon: TrendingUp, desc: '1-5% per transaction' },
                { name: 'Subscriptions', icon: Users, desc: 'Premium seller plans' },
                { name: 'Featured Ads', icon: Package, desc: 'Promoted listings' },
                { name: 'Logistics', icon: Truck, desc: 'Delivery commissions' },
                { name: 'Escrow Fees', icon: DollarSign, desc: 'Payment protection' },
                { name: 'Warehouse', icon: Warehouse, desc: 'Storage referrals' },
                { name: 'Market Intel', icon: FileText, desc: 'Reports & subscriptions' },
                { name: 'Value-Added Services', icon: Briefcase, desc: 'Verification & more' },
              ].map((stream) => (
                <div key={stream.name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <stream.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{stream.name}</p>
                    <p className="text-xs text-gray-500">{stream.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {projections && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Projections</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-700">TZS {projections.last_7_days.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Last 7 Days</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-700">TZS {projections.last_30_days.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Last 30 Days</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-700">TZS {projections.monthly_projection.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Monthly Projection</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <p className="text-2xl font-bold text-yellow-700">TZS {projections.yearly_projection.toLocaleString()}</p>
                <p className="text-sm text-gray-600">Yearly Projection</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
