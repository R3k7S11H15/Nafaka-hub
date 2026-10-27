import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Search, Tag, Ticket } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

const PROMO_TYPES = [
  { value: 'percentage', label: 'Percentage' },
  { value: 'fixed_amount', label: 'Fixed Amount' },
  { value: 'free_shipping', label: 'Free Shipping' },
  { value: 'bundle', label: 'Bundle' },
]

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'draft', label: 'Draft' },
]

function ActiveBadge({ active, start_date, end_date }) {
  const now = new Date()
  const start = start_date ? new Date(start_date) : null
  const end = end_date ? new Date(end_date) : null
  let label = 'Unknown'
  let color = 'bg-gray-100 text-gray-800'
  if (active === false || active === 0) {
    label = 'Draft'
    color = 'bg-gray-100 text-gray-800'
  } else if (start && end && now >= start && now <= end) {
    label = 'Active'
    color = 'bg-green-100 text-green-800'
  } else if (end && now > end) {
    label = 'Expired'
    color = 'bg-red-100 text-red-800'
  } else {
    label = 'Scheduled'
    color = 'bg-yellow-100 text-yellow-800'
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}

export default function AdminPromotionsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [promotions, setPromotions] = useState([])
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('promotions')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'percentage',
    value: '',
    min_order_amount: '',
    max_discount_amount: '',
    applicable_categories: '',
    applicable_products: '',
    target_roles: '',
    usage_limit: '',
    per_user_limit: 1,
    start_date: '',
    end_date: '',
    code: '',
    promotion_id: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
  })

  const loadPromotions = async () => {
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (searchTerm) params.search = searchTerm
      const res = await api.getAdminPromotions(params)
      const data = res?.promotions || res?.data || []
      setPromotions(data)
    } catch {
      setPromotions([])
    }
  }

  const loadCoupons = async () => {
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (searchTerm) params.search = searchTerm
      const res = await api.getAdminCoupons(params)
      const data = res?.coupons || res?.data || []
      setCoupons(data)
    } catch {
      setCoupons([])
    }
  }

  useEffect(() => {
    setLoading(true)
    if (activeTab === 'promotions') {
      loadPromotions()
    } else {
      loadCoupons()
    }
    setLoading(false)
  }, [activeTab, statusFilter, searchTerm])

  const resetForm = () => {
    setEditingItem(null)
    setForm({
      name: '',
      description: '',
      type: 'percentage',
      value: '',
      min_order_amount: '',
      max_discount_amount: '',
      applicable_categories: '',
      applicable_products: '',
      target_roles: '',
      usage_limit: '',
      per_user_limit: 1,
      start_date: '',
      end_date: '',
      code: '',
      promotion_id: '',
      valid_from: '',
      valid_until: '',
      is_active: true,
    })
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditPromotionModal = (promo) => {
    setEditingItem(promo)
    setForm({
      name: promo.name || '',
      description: promo.description || '',
      type: promo.type || 'percentage',
      value: String(promo.value || ''),
      min_order_amount: String(promo.min_order_amount || ''),
      max_discount_amount: promo.max_discount_amount ? String(promo.max_discount_amount) : '',
      applicable_categories: promo.applicable_categories || '',
      applicable_products: promo.applicable_products || '',
      target_roles: promo.target_roles || '',
      usage_limit: promo.usage_limit ? String(promo.usage_limit) : '',
      per_user_limit: promo.per_user_limit || 1,
      start_date: promo.start_date ? promo.start_date.slice(0, 16) : '',
      end_date: promo.end_date ? promo.end_date.slice(0, 16) : '',
      code: '',
      promotion_id: promo.id ? String(promo.id) : '',
      valid_from: '',
      valid_until: '',
      is_active: promo.is_active !== false,
    })
    setShowModal(true)
  }

  const openEditCouponModal = (coupon) => {
    setEditingItem(coupon)
    setForm({
      name: '',
      description: '',
      type: coupon.type || 'percentage',
      value: String(coupon.value || ''),
      min_order_amount: String(coupon.min_order_amount || ''),
      max_discount_amount: coupon.max_discount_amount ? String(coupon.max_discount_amount) : '',
      applicable_categories: '',
      applicable_products: '',
      target_roles: '',
      usage_limit: coupon.usage_limit ? String(coupon.usage_limit) : '',
      per_user_limit: coupon.per_user_limit || 1,
      start_date: '',
      end_date: '',
      code: coupon.code || '',
      promotion_id: coupon.promotion_id ? String(coupon.promotion_id) : '',
      valid_from: coupon.valid_from ? coupon.valid_from.slice(0, 16) : '',
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 16) : '',
      is_active: coupon.is_active !== false,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value) || 0,
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        per_user_limit: parseInt(form.per_user_limit) || 1,
        is_active: form.is_active,
      }
      if (activeTab === 'promotions') {
        if (editingItem) {
          await api.updateAdminPromotion(editingItem.id, payload)
        } else {
          await api.createAdminPromotion(payload)
        }
        loadPromotions()
      } else {
        delete payload.name
        delete payload.description
        delete payload.start_date
        delete payload.end_date
        delete payload.applicable_categories
        delete payload.applicable_products
        delete payload.target_roles
        if (editingItem) {
          await api.updateAdminCoupon(editingItem.id, payload)
        } else {
          await api.createAdminCoupon(payload)
        }
        loadCoupons()
      }
      setShowModal(false)
    } catch {
      // handled
    }
  }

  const handleDeletePromotion = async (id) => {
    const confirmed = await confirm({ title: 'Delete this promotion?', type: 'danger' })
    if (!confirmed) return
    await api.deleteAdminPromotion(id)
    loadPromotions()
  }

  const handleDeleteCoupon = async (id) => {
    const confirmed = await confirm({ title: 'Delete this coupon?', type: 'danger' })
    if (!confirmed) return
    await api.deleteAdminCoupon(id)
    loadCoupons()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-8 h-8 text-indigo-500" /> Promotions & Coupons
            </h1>
            <p className="text-gray-600 mt-2">Manage discounts, promotions, and coupon codes</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setActiveTab('promotions')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'promotions' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Promotions
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'coupons' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Coupons
            </button>
          </div>
        </div>

        {activeTab === 'promotions' && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Promotions</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search promotions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    </div>
                    <button
                      onClick={openCreateModal}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Promotion
                    </button>
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" /> Loading promotions...
                </div>
              ) : promotions.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No promotions found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {promotions.map((promo) => (
                      <tr key={promo.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{promo.name || '—'}</div>
                          {promo.description && <div className="text-xs text-gray-500 max-w-xs truncate">{promo.description}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{promo.type || 'percentage'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{promo.type === 'percentage' ? `${promo.value}%` : `TZS ${promo.value}`}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>{promo.start_date ? new Date(promo.start_date).toLocaleDateString() : '—'}</div>
                          <div className="text-xs text-gray-500">to {promo.end_date ? new Date(promo.end_date).toLocaleDateString() : '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{promo.usage_count || 0}{promo.usage_limit ? ` / ${promo.usage_limit}` : ''}</td>
                        <td className="px-6 py-4"><ActiveBadge active={promo.is_active} start_date={promo.start_date} end_date={promo.end_date} /></td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEditPromotionModal(promo)} className="text-gray-600 hover:text-gray-800" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeletePromotion(promo.id)} className="text-red-600 hover:text-red-800" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {activeTab === 'coupons' && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Coupons</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search coupons..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    </div>
                    <button
                      onClick={openCreateModal}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Coupon
                    </button>
                  </div>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" /> Loading coupons...
                </div>
              ) : coupons.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No coupons found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promotion</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-mono font-medium text-gray-900">{coupon.code || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{coupon.promotion_name || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{coupon.type || 'percentage'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{coupon.type === 'percentage' ? `${coupon.value}%` : `TZS ${coupon.value}`}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>{coupon.valid_from ? new Date(coupon.valid_from).toLocaleDateString() : '—'}</div>
                          <div className="text-xs text-gray-500">to {coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString() : '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{coupon.usage_count || 0}{coupon.usage_limit ? ` / ${coupon.usage_limit}` : ''}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEditCouponModal(coupon)} className="text-gray-600 hover:text-gray-800" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteCoupon(coupon.id)} className="text-red-600 hover:text-red-800" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingItem ? (activeTab === 'promotions' ? 'Edit Promotion' : 'Edit Coupon') : (activeTab === 'promotions' ? 'Add Promotion' : 'Add Coupon')}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'promotions' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" name="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea name="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        {PROMO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                      <input type="number" step="0.01" name="value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label>
                      <input type="number" step="0.01" name="min_order_amount" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Amount</label>
                      <input type="number" step="0.01" name="max_discount_amount" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input type="datetime-local" name="start_date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input type="datetime-local" name="end_date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                      <input type="number" name="usage_limit" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Per User Limit</label>
                      <input type="number" name="per_user_limit" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-indigo-600" />
                    Active
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                    <input type="text" name="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                      <select name="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="percentage">Percentage</option>
                        <option value="fixed_amount">Fixed Amount</option>
                        <option value="free_shipping">Free Shipping</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                      <input type="number" step="0.01" name="value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label>
                      <input type="number" step="0.01" name="min_order_amount" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Amount</label>
                      <input type="number" step="0.01" name="max_discount_amount" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                      <input type="datetime-local" name="valid_from" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                      <input type="datetime-local" name="valid_until" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Usage Limit</label>
                      <input type="number" name="usage_limit" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Per User Limit</label>
                      <input type="number" name="per_user_limit" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" name="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 text-indigo-600" />
                    Active
                  </label>
                </>
              )}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">{editingItem ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
