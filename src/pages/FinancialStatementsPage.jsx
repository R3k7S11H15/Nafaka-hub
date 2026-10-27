import { useState, useEffect } from 'react'
import { Download, Filter, Loader2, FileText, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (v >= 1_000_000) return `TZS ${(v / 1_000_000).toFixed(1)}M`
  return `TZS ${v.toLocaleString()}`
}

export default function FinancialStatementsPage() {
  const toast = useToast()
  const [statement, setStatement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [revenueRes, commissionRes, refundRes, orderRes] = await Promise.all([
          api.getRevenueOverview(),
          api.getPlatformCommissionOverview(),
          api.getRefunds(),
          api.getAdminReports({ type: 'financial' }),
        ])
        if (!mounted) return

        const revenue = revenueRes?.data || revenueRes?.overview || revenueRes || {}
        const commissions = commissionRes?.data || commissionRes || {}
        const refunds = Array.isArray(refundRes?.data) ? refundRes.data : Array.isArray(refundRes?.refunds) ? refundRes.refunds : []
        const financialMetrics = (orderRes?.data || orderRes || {}).metrics || {}

        const totalRevenue = Number(revenue.total_revenue || revenue.total || 0)
        const totalCommission = Number(commissions.total_commission || commissions.total || 0)
        const totalRefunds = refunds.reduce((s, r) => s + Number(r.amount || 0), 0)
        const totalOrders = Number(financialMetrics.order_count || orderRes?.total_orders || 0)

        setStatement({
          period,
          generatedAt: new Date().toISOString(),
          profitAndLoss: {
            revenue: totalRevenue,
            commissionIncome: totalCommission,
            refunds: totalRefunds,
            netProfit: totalRevenue + totalCommission - totalRefunds,
          },
          cashFlow: {
            inflow: totalRevenue,
            outflow: totalRefunds + totalCommission,
            netCashFlow: totalRevenue - totalRefunds - totalCommission,
          },
          metrics: {
            totalOrders,
            avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
            refundRate: totalRevenue > 0 ? (totalRefunds / totalRevenue) * 100 : 0,
          },
        })
      } catch {
        if (mounted) setStatement(null)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [period])

  const handleExport = () => {
    toast.info('Exporting financial statement as PDF...')
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

  if (!statement) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <p className="text-gray-500">No financial data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" /> Financial Statements
            </h1>
            <p className="text-gray-600 mt-1">Profit & Loss, Cash Flow, and financial metrics</p>
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
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" /> Profit & Loss Statement
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Revenue</span>
                <span className="text-sm font-semibold text-green-700">{fmtMoney(statement.profitAndLoss.revenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-600">Commission Income</span>
                <span className="text-sm font-semibold text-blue-700">{fmtMoney(statement.profitAndLoss.commissionIncome)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-600">Refunds</span>
                <span className="text-sm font-semibold text-red-700">-{fmtMoney(statement.profitAndLoss.refunds)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-900">Net Profit</span>
                <span className="text-sm font-bold text-gray-900">{fmtMoney(statement.profitAndLoss.netProfit)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" /> Cash Flow Statement
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">Cash Inflow</span>
                <span className="text-sm font-semibold text-green-700">{fmtMoney(statement.cashFlow.inflow)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm text-gray-600">Cash Outflow</span>
                <span className="text-sm font-semibold text-red-700">-{fmtMoney(statement.cashFlow.outflow)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-900">Net Cash Flow</span>
                <span className={`text-sm font-bold ${statement.cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtMoney(statement.cashFlow.netCashFlow)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-purple-600" /> Key Financial Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-xl font-bold text-gray-900">{statement.metrics.totalOrders.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Average Order Value</p>
              <p className="text-xl font-bold text-gray-900">{fmtMoney(statement.metrics.avgOrderValue)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Refund Rate</p>
              <p className="text-xl font-bold text-gray-900">{statement.metrics.refundRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" /> Statement Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Period</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{statement.period}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Generated At</p>
              <p className="text-sm font-medium text-gray-900">{new Date(statement.generatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
