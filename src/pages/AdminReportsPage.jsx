import React, { useState, useEffect } from 'react'
import { FileText, Download, Filter, Calendar, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const REPORT_TYPES = [
  { key: 'sales', label: 'Sales Report', icon: TrendingUp },
  { key: 'users', label: 'User Report', icon: Users },
  { key: 'products', label: 'Product Report', icon: Package },
  { key: 'orders', label: 'Order Report', icon: ShoppingCart },
  { key: 'financial', label: 'Financial Report', icon: DollarSign },
]

export default function AdminReportsPage() {
  const [activeReport, setActiveReport] = useState('sales')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const loadReport = async () => {
    setLoading(true)
    try {
      const data = await api.getAdminReports({ type: activeReport, start_date: dateRange.start, end_date: dateRange.end })
      setReportData(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReport() }, [activeReport])

  const handleExport = (format) => {
    toast.info(`Exporting ${activeReport} report as ${format}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" /> Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">Generate and export system reports</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {REPORT_TYPES.map(report => (
            <button
              key={report.key}
              onClick={() => setActiveReport(report.key)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap ${activeReport === report.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <report.icon className="w-4 h-4" /> {report.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <button onClick={loadReport} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Filter className="w-4 h-4" /> Generate Report
            </button>
            <div className="flex gap-2">
              <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Generating report...</div>
          ) : reportData ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.metrics?.map((metric, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{metric.label}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">{metric.value}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center gap-1 ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {metric.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {Math.abs(metric.change)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">Select a report type and date range to generate</div>
          )}
        </div>
      </div>
    </div>
  )
}
