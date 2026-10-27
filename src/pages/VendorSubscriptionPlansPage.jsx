import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Plus, Edit, Trash2, Loader2, Package, DollarSign, Users, TrendingUp } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorSubscriptionPlansPage() {
  const [plans, setPlans] = useState([])
  const toast = useToast()
  const confirm = useConfirm()
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    product_upload_limit: '',
    commission_rate: '',
    has_analytics: false,
    has_featured_badge: false,
    has_priority_support: false,
    has_api_access: false,
    has_bulk_upload: false,
  })

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getSubscriptionPlans()
        if (!mounted) return
        setPlans(Array.isArray(res?.plans) ? res.plans : Array.isArray(res) ? res : [])
      } catch {
        if (mounted) setPlans([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const openCreate = () => {
    setEditingPlan(null)
    setForm({
      name: '',
      slug: '',
      description: '',
      price_monthly: '',
      price_yearly: '',
      product_upload_limit: '',
      commission_rate: '',
      has_analytics: false,
      has_featured_badge: false,
      has_priority_support: false,
      has_api_access: false,
      has_bulk_upload: false,
    })
    setShowModal(true)
  }

  const openEdit = (plan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name || '',
      slug: plan.slug || '',
      description: plan.description || '',
      price_monthly: plan.price_monthly || '',
      price_yearly: plan.price_yearly || '',
      product_upload_limit: plan.product_upload_limit || '',
      commission_rate: plan.commission_rate || '',
      has_analytics: !!plan.has_analytics,
      has_featured_badge: !!plan.has_featured_badge,
      has_priority_support: !!plan.has_priority_support,
      has_api_access: !!plan.has_api_access,
      has_bulk_upload: !!plan.has_bulk_upload,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingPlan) {
        await api.request(`/subscriptions.php?action=update_plan&id=${editingPlan.id}`, {
          method: 'POST',
          body: form,
        })
        toast.success('Plan updated successfully')
      } else {
        await api.request('/subscriptions.php?action=create_plan', {
          method: 'POST',
          body: form,
        })
        toast.success('Plan created successfully')
      }
      setShowModal(false)
      const res = await api.getSubscriptionPlans()
      setPlans(Array.isArray(res?.plans) ? res.plans : Array.isArray(res) ? res : [])
    } catch {
      toast.error('Failed to save plan')
    }
  }

  const handleDelete = async (planId) => {
    const confirmed = await confirm({ title: 'Are you sure you want to delete this plan?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.request(`/subscriptions.php?action=delete_plan&id=${planId}`, { method: 'POST' })
      setPlans(plans.filter(p => p.id !== planId))
    } catch {
      toast.error('Failed to delete plan')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-8 h-8 text-blue-600" /> Subscription Plans
            </h1>
            <p className="text-gray-600 mt-1">Manage vendor subscription tiers and pricing</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <span className="text-xs font-medium text-gray-500 uppercase">{plan.slug}</span>
                </div>
                <p className="text-sm text-gray-500 mb-4">{plan.description || '—'}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Monthly</span>
                    <span className="text-sm font-semibold text-gray-900">{fmtMoney(plan.price_monthly)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Yearly</span>
                    <span className="text-sm font-semibold text-gray-900">{fmtMoney(plan.price_yearly)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Upload Limit</span>
                    <span className="text-sm font-medium text-gray-900">{plan.product_upload_limit || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Commission Rate</span>
                    <span className="text-sm font-medium text-gray-900">{plan.commission_rate || '—'}%</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {plan.has_analytics && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Analytics</span>}
                  {plan.has_featured_badge && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Featured</span>}
                  {plan.has_priority_support && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Priority Support</span>}
                  {plan.has_api_access && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">API</span>}
                  {plan.has_bulk_upload && <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Bulk Upload</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(plan)} className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm">
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={() => handleDelete(plan.id)} className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (TZS)</label>
                    <input type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Price (TZS)</label>
                    <input type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Limit</label>
                    <input type="number" value={form.product_upload_limit} onChange={(e) => setForm({ ...form, product_upload_limit: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%)</label>
                    <input type="number" step="0.1" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.has_analytics} onChange={(e) => setForm({ ...form, has_analytics: e.target.checked })} className="w-4 h-4 text-green-600 rounded" />
                    <span className="text-sm text-gray-700">Analytics</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.has_featured_badge} onChange={(e) => setForm({ ...form, has_featured_badge: e.target.checked })} className="w-4 h-4 text-green-600 rounded" />
                    <span className="text-sm text-gray-700">Featured Badge</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.has_priority_support} onChange={(e) => setForm({ ...form, has_priority_support: e.target.checked })} className="w-4 h-4 text-green-600 rounded" />
                    <span className="text-sm text-gray-700">Priority Support</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.has_api_access} onChange={(e) => setForm({ ...form, has_api_access: e.target.checked })} className="w-4 h-4 text-green-600 rounded" />
                    <span className="text-sm text-gray-700">API Access</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.has_bulk_upload} onChange={(e) => setForm({ ...form, has_bulk_upload: e.target.checked })} className="w-4 h-4 text-green-600 rounded" />
                    <span className="text-sm text-gray-700">Bulk Upload</span>
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Save Plan</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
