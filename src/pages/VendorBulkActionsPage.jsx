import { useState, useEffect } from 'react'
import { CheckSquare, Square, Ban, CheckCircle, Download, Loader2, Users } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function VendorBulkActionsPage() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState([])
  const [action, setAction] = useState('')
  const [processing, setProcessing] = useState(false)
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminVendorAnalytics({ limit: 1000 })
        if (!mounted) return
        setVendors(Array.isArray(res?.vendors) ? res.vendors : [])
      } catch {
        if (mounted) setVendors([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (selected.length === vendors.length) {
      setSelected([])
    } else {
      setSelected(vendors.map(v => v.id))
    }
  }

  const handleBulkAction = async () => {
    if (!action || selected.length === 0) {
      toast.error('Please select an action and at least one vendor')
      return
    }
    setProcessing(true)
    try {
      for (const vendorId of selected) {
        if (action === 'activate') {
          await api.request(`/superadmin/users/${vendorId}`, {
            method: 'PUT',
            body: { is_active: 1 },
          })
        } else if (action === 'deactivate') {
          await api.request(`/superadmin/users/${vendorId}`, {
            method: 'PUT',
            body: { is_active: 0 },
          })
        } else if (action === 'export') {
          window.open(`/api/superadmin/export/users?limit=1000`, '_blank')
          break
        }
      }
      toast.success(`Bulk action "${action}" completed for ${selected.length} vendors`)
      setSelected([])
      setAction('')
    } catch {
      toast.error('Bulk action failed')
    } finally {
      setProcessing(false)
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="w-8 h-8 text-blue-600" /> Bulk Actions
            </h1>
            <p className="text-gray-600 mt-1">Perform bulk operations on selected vendors</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{selected.length} selected</span>
            <button
              onClick={() => setAction('export')}
              disabled={selected.length === 0 || processing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Export Selected
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              {selected.length === vendors.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {selected.length === vendors.length ? 'Deselect All' : 'Select All'}
            </button>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">Select Action</option>
              <option value="activate">Activate Vendors</option>
              <option value="deactivate">Deactivate Vendors</option>
              <option value="export">Export Selected</option>
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!action || selected.length === 0 || processing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Apply to {selected.length} Vendors
            </button>
          </div>

          {vendors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No vendors found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 w-12">
                      <button onClick={toggleAll}>
                        {selected.length === vendors.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className={`border-b border-gray-100 hover:bg-gray-50 ${selected.includes(vendor.id) ? 'bg-blue-50' : ''}`}>
                      <td className="py-4 px-4">
                        <button onClick={() => toggleSelect(vendor.id)}>
                          {selected.includes(vendor.id) ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-400" />}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">{vendor.full_name || vendor.business_name || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{vendor.email || '—'}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendor.is_active === 1 || vendor.is_active === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {vendor.is_active === 1 || vendor.is_active === true ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                        {vendor.total_revenue ? `TZS ${Number(vendor.total_revenue).toLocaleString()}` : '—'}
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
