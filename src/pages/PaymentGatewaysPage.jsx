import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2, Smartphone, CreditCard, Building2, CheckCircle, XCircle } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

const gatewayIcons = {
  mpesa: Smartphone,
  bank: Building2,
  card: CreditCard,
}

export default function PaymentGatewaysPage() {
  const [gateways, setGateways] = useState([
    { id: 1, name: 'M-Pesa', type: 'mpesa', status: 'active', fee_percentage: 2.0, fixed_fee: 0, api_key: '••••••••' },
    { id: 2, name: 'Tigo Pesa', type: 'mpesa', status: 'inactive', fee_percentage: 2.5, fixed_fee: 0, api_key: '••••••••' },
    { id: 3, name: 'Airtel Money', type: 'mpesa', status: 'inactive', fee_percentage: 2.5, fixed_fee: 0, api_key: '••••••••' },
    { id: 4, name: 'Bank Transfer', type: 'bank', status: 'active', fee_percentage: 0, fixed_fee: 1000, api_key: '' },
  ])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingGateway, setEditingGateway] = useState(null)
  const [form, setForm] = useState({
    name: '',
    type: 'mpesa',
    status: 'active',
    fee_percentage: '',
    fixed_fee: '',
    api_key: '',
  })
  const toast = useToast()
  const confirm = useConfirm()

  const openCreate = () => {
    setEditingGateway(null)
    setForm({ name: '', type: 'mpesa', status: 'active', fee_percentage: '', fixed_fee: '', api_key: '' })
    setShowModal(true)
  }

  const openEdit = (gateway) => {
    setEditingGateway(gateway)
    setForm({
      name: gateway.name,
      type: gateway.type,
      status: gateway.status,
      fee_percentage: gateway.fee_percentage || '',
      fixed_fee: gateway.fixed_fee || '',
      api_key: gateway.api_key || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingGateway) {
        setGateways(gateways.map(g => g.id === editingGateway.id ? { ...g, ...form } : g))
        toast.success('Payment gateway updated')
      } else {
        const newGateway = { ...form, id: Date.now(), api_key: form.api_key || '••••••••' }
        setGateways([...gateways, newGateway])
        toast.success('Payment gateway created')
      }
      setShowModal(false)
    } catch {
      toast.error('Failed to save payment gateway')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (gatewayId) => {
    const confirmed = await confirm({ title: 'Are you sure you want to delete this payment gateway?', type: 'danger' })
    if (!confirmed) return
    setGateways(gateways.filter(g => g.id !== gatewayId))
  }

  const toggleStatus = (gatewayId) => {
    setGateways(gateways.map(g => g.id === gatewayId ? { ...g, status: g.status === 'active' ? 'inactive' : 'active' } : g))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-8 h-8 text-blue-600" /> Payment Gateways
            </h1>
            <p className="text-gray-600 mt-1">Configure and manage payment methods</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Gateway
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Gateways', value: String(gateways.length), icon: CreditCard, color: 'blue' },
            { label: 'Active', value: String(gateways.filter(g => g.status === 'active').length), icon: CheckCircle, color: 'green' },
            { label: 'Inactive', value: String(gateways.filter(g => g.status === 'inactive').length), icon: XCircle, color: 'red' },
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {gateways.map((gateway) => {
            const Icon = gatewayIcons[gateway.type] || CreditCard
            return (
              <div key={gateway.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{gateway.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{gateway.type} Gateway</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gateway.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {gateway.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fee Percentage</span>
                    <span className="text-sm font-medium text-gray-900">{gateway.fee_percentage || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fixed Fee</span>
                    <span className="text-sm font-medium text-gray-900">{gateway.fixed_fee ? `TZS ${Number(gateway.fixed_fee).toLocaleString()}` : 'None'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API Key</span>
                    <span className="text-sm font-mono text-gray-500">{gateway.api_key || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(gateway.id)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${gateway.status === 'active' ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                  >
                    {gateway.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => openEdit(gateway)} className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => handleDelete(gateway.id)} className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{editingGateway ? 'Edit Gateway' : 'Add Gateway'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gateway Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="mpesa">Mobile Money</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee Percentage (%)</label>
                    <input type="number" step="0.1" value={form.fee_percentage} onChange={(e) => setForm({ ...form, fee_percentage: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Fee (TZS)</label>
                    <input type="number" value={form.fixed_fee} onChange={(e) => setForm({ ...form, fixed_fee: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input type="text" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                    {loading ? 'Saving...' : 'Save Gateway'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
