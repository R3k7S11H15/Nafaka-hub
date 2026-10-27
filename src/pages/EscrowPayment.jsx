import { useState, useEffect } from 'react'
import { Shield, CreditCard, Truck, CheckCircle, Clock, AlertTriangle, Plus, Eye, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

export default function EscrowPayment() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    buyer: '',
    seller: '',
    product: '',
    amount: '',
    currency: 'TZS',
  })
  const toast = useToast()
  const { user } = useAuth()

  const fetchTransactions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getEscrowTransactions()
      const list = res?.transactions || res?.data || []
      setTransactions(Array.isArray(list) ? list : [])
    } catch (err) {
      setError(err.message || 'Failed to load escrow transactions')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const steps = [
    { icon: CreditCard, title: 'Buyer pays platform', desc: 'Funds held securely in escrow' },
    { icon: Truck, title: 'Seller ships goods', desc: 'Delivery tracked in real-time' },
    { icon: CheckCircle, title: 'Buyer confirms delivery', desc: 'Inspection and acceptance' },
    { icon: Shield, title: 'Platform releases payment', desc: 'Payment sent to seller' },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'shipped': return 'bg-blue-100 text-blue-700'
      case 'delivered': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-primary-100 text-primary-700'
      case 'disputed': return 'bg-red-100 text-red-700'
      case 'cancelled': return 'bg-gray-100 text-gray-700'
      case 'refunded': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />
      case 'shipped': return <Truck className="w-3 h-3" />
      case 'delivered': return <CheckCircle className="w-3 h-3" />
      case 'completed': return <Shield className="w-3 h-3" />
      case 'disputed': return <AlertTriangle className="w-3 h-3" />
      case 'cancelled': return <AlertTriangle className="w-3 h-3" />
      case 'refunded': return <AlertTriangle className="w-3 h-3" />
      default: return <Shield className="w-3 h-3" />
    }
  }

  const createEscrow = async () => {
    if (!formData.buyer || !formData.seller || !formData.product || !formData.amount) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (!user) {
      toast.error('Please log in to create an escrow transaction.')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.createEscrow({
        buyer_name: formData.buyer,
        seller_name: formData.seller,
        product: formData.product,
        amount: Number(formData.amount),
        currency: formData.currency,
      })
      if (res?.success) {
        toast.success('Escrow transaction created successfully.')
        setShowCreateForm(false)
        setFormData({ buyer: '', seller: '', product: '', amount: '', currency: 'TZS' })
        fetchTransactions()
      } else {
        toast.error(res?.message || 'Failed to create escrow transaction.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusAction = async (id, action) => {
    try {
      let res
      if (action === 'release') res = await api.releaseEscrow(id)
      else if (action === 'refund') res = await api.refundEscrow(id)
      else if (action === 'cancel') res = await api.cancelEscrow(id)

      if (res?.success) {
        toast.success(`Escrow ${action} completed.`)
        fetchTransactions()
      } else {
        toast.error(res?.message || `Failed to ${action} escrow.`)
      }
    } catch {
      toast.error('Network error. Please try again.')
    }
  }

  const formatAmount = (value) => {
    if (!value) return '—'
    return `TZS ${Number(value).toLocaleString()}`
  }

  const totalEscrow = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0)
  const activeCount = transactions.filter(t => ['pending', 'shipped', 'delivered'].includes(t.status || '')).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-grain-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Escrow Payments</h1>
              <p className="text-gray-500">Secure transactions with buyer protection</p>
            </div>
          </div>
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary py-2.5 px-6 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Escrow
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <p className="text-sm text-gray-500 mb-1">Total Escrow Volume</p>
            <p className="text-2xl font-bold text-gray-900">{formatAmount(totalEscrow)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <p className="text-sm text-gray-500 mb-1">Active Transactions</p>
            <p className="text-2xl font-bold text-primary-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <p className="text-sm text-gray-500 mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{transactions.filter(t => t.status === 'completed').length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <p className="text-sm text-gray-500 mb-1">Disputed</p>
            <p className="text-2xl font-bold text-red-600">{transactions.filter(t => t.status === 'disputed').length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {steps.map((step, idx) => (
              <div key={idx} className="relative">
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-3">
                    <step.icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </div>
                {idx < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-gray-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Escrow</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Buyer</label>
                <input
                  type="text"
                  value={formData.buyer}
                  onChange={(e) => setFormData({ ...formData, buyer: e.target.value })}
                  className="input-field"
                  placeholder="Buyer name or company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Seller</label>
                <input
                  type="text"
                  value={formData.seller}
                  onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
                  className="input-field"
                  placeholder="Seller name or company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product</label>
                <input
                  type="text"
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  className="input-field"
                  placeholder="Grain type and quantity"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (TZS)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={createEscrow} disabled={submitting} className="btn-primary py-2.5 px-6 flex items-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Creating...' : 'Create Escrow'}
              </button>
              <button onClick={() => setShowCreateForm(false)} className="btn-secondary py-2.5 px-6">Cancel</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Escrow Transactions</h2>
          </div>
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <Loader2 className="animate-spin w-6 h-6 mr-2 inline" /> Loading transactions...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">No escrow transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Seller</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.id || tx.transaction_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{tx.buyer_name || tx.buyer || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{tx.seller_name || tx.seller || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{tx.product || tx.product_description || '—'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatAmount(tx.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status || '')}`}>
                          {getStatusIcon(tx.status || '')}
                          {tx.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm font-medium">
                            <Eye className="w-4 h-4" />View
                          </button>
                          {['pending', 'shipped', 'delivered'].includes(tx.status || '') && (
                            <>
                              {tx.status !== 'delivered' && tx.status !== 'shipped' && (
                                <button
                                  onClick={() => handleStatusAction(tx.id, 'release')}
                                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                                >
                                  Release
                                </button>
                              )}
                              <button
                                onClick={() => handleStatusAction(tx.id, 'refund')}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Refund
                              </button>
                            </>
                          )}
                        </div>
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
