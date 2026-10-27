import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Plus, Eye, Download, Search, Loader2, FileText, Send } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ order_id: '', vendor_id: '', customer_id: '', amount: '', due_date: '' })
  const toast = useToast()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getAdminContracts({ limit: 1000 })
        if (!mounted) return
        const contracts = Array.isArray(res?.contracts) ? res.contracts : []
        const mapped = contracts.map(c => ({
          id: c.id,
          invoice_number: c.contract_number || `INV-${c.id}`,
          customer_name: c.buyer_name || '—',
          vendor_name: c.seller_name || '—',
          amount: c.value || c.amount || 0,
          status: c.status || 'draft',
          created_at: c.created_at,
          due_date: c.end_date || c.created_at,
        }))
        setInvoices(mapped)
      } catch {
        if (mounted) setInvoices([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filtered = invoices.filter(inv => {
    if (!search) return true
    const q = search.toLowerCase()
    return (inv.invoice_number || '').toLowerCase().includes(q) || (inv.customer_name || '').toLowerCase().includes(q)
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.request('/content/admin/contracts', {
        method: 'POST',
        body: { ...form, title: `Invoice ${form.order_id}`, status: 'draft' },
      })
      toast.success('Invoice created successfully')
      setShowModal(false)
      setForm({ order_id: '', vendor_id: '', customer_id: '', amount: '', due_date: '' })
    } catch {
      toast.error('Failed to create invoice')
    }
  }

  const handleSend = async (invoiceId) => {
    try {
      await api.request(`/content/admin/contracts/${invoiceId}`, {
        method: 'PUT',
        body: { status: 'sent' },
      })
      toast.success('Invoice sent to customer')
    } catch {
      toast.error('Failed to send invoice')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-8 h-8 text-blue-600" /> Invoices
            </h1>
            <p className="text-gray-600 mt-1">Create, manage, and send invoices to customers</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Invoices', value: String(invoices.length), icon: FileText, color: 'blue' },
            { label: 'Paid', value: String(invoices.filter(i => (i.status || '').toLowerCase() === 'completed' || (i.status || '').toLowerCase() === 'active').length), icon: FileText, color: 'green' },
            { label: 'Pending', value: String(invoices.filter(i => (i.status || '').toLowerCase() === 'pending' || (i.status || '').toLowerCase() === 'draft').length), icon: FileText, color: 'yellow' },
            { label: 'Total Amount', value: fmtMoney(invoices.reduce((s, i) => s + Number(i.amount || 0), 0)), icon: FileText, color: 'purple' },
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
                placeholder="Search invoices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No invoices found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Invoice</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Vendor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm font-medium text-blue-600">{inv.invoice_number}</td>
                      <td className="py-4 px-4 text-sm text-gray-900">{inv.customer_name}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">{inv.vendor_name}</td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">{fmtMoney(inv.amount)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(inv.status || '').toLowerCase() === 'completed' || (inv.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : (inv.status || '').toLowerCase() === 'pending' || (inv.status || '').toLowerCase() === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                          {inv.status || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '—'}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button className="text-blue-600 hover:text-blue-800"><Eye className="w-4 h-4" /></button>
                          {(inv.status || '').toLowerCase() === 'draft' && (
                            <button onClick={() => handleSend(inv.id)} className="text-green-600 hover:text-green-800"><Send className="w-4 h-4" /></button>
                          )}
                          <button className="text-gray-600 hover:text-gray-800"><Download className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">New Invoice</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                  <input type="text" value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                    <input type="text" value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
                    <input type="text" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label>
                    <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Create Invoice</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
