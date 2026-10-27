import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { FileText, Eye, Download, Clock, CheckCircle, XCircle, Loader2, Plus } from 'lucide-react'
import api from '../services/api'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorContractsPage() {
  const [contracts, setContracts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminContracts()
        if (!mounted) return
        setContracts(Array.isArray(res?.contracts) ? res.contracts : Array.isArray(res) ? res : [])
      } catch {
        if (mounted) setContracts([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => (c.status || '').toLowerCase() === 'active').length,
    pending: contracts.filter(c => (c.status || '').toLowerCase() === 'pending').length,
    completed: contracts.filter(c => (c.status || '').toLowerCase() === 'completed').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" /> Vendor Contracts
            </h1>
            <p className="text-gray-600 mt-1">Manage vendor agreements and contracts</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Contracts', value: String(stats.total), icon: FileText, color: 'blue' },
            { label: 'Active', value: String(stats.active), icon: CheckCircle, color: 'green' },
            { label: 'Pending', value: String(stats.pending), icon: Clock, color: 'yellow' },
            { label: 'Completed', value: String(stats.completed), icon: CheckCircle, color: 'purple' },
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No contracts found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Contract</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Product</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Value</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-blue-600">{contract.contract_number || `#${contract.id}`}</td>
                    <td className="py-4 px-4 text-sm text-gray-900">{contract.seller_name || contract.vendor_name || '—'}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{contract.product_name || '—'}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (contract.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-800' :
                        (contract.status || '').toLowerCase() === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        (contract.status || '').toLowerCase() === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {contract.status || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900 font-medium">{fmtMoney(contract.value || contract.amount)}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{contract.created_at ? new Date(contract.created_at).toLocaleDateString() : '—'}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                        <button className="text-green-600 hover:text-green-800"><Download className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
