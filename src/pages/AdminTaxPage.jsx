import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, TrendingUpDown, Loader2, X, Search } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../components/ConfirmDialog';

function ActiveBadge({ active }) {
  const isActive = active === true || active === 1
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function InclusiveBadge({ inclusive }) {
  const isInc = inclusive === true || inclusive === 1
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isInc ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
      {isInc ? 'Inclusive' : 'Exclusive'}
    </span>
  )
}

const TAX_TYPES = ['vat', 'sales_tax', 'withholding_tax', 'service_tax', 'custom']
const APPLIES_TO = ['products', 'services', 'shipping', 'all']
const TANZANIA_REGIONS = ['Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lake Manyara', 'Mbulu', 'Mtwara', 'Mwanza', 'Njombe', 'Ruvuma', 'Shinyanga', 'Siri', 'Tabora', 'Tanga', 'Manyara', 'Nationwide']

export default function AdminTaxPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [taxes, setTaxes] = useState([])
  const [exemptions, setExemptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [exemptionsLoading, setExemptionsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTax, setEditingTax] = useState(null)
  const [showExemptionModal, setShowExemptionModal] = useState(false)
  const [activeTab, setActiveTab] = useState('rules')
  const [regionFilter, setRegionFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    type: 'vat',
    rate: '',
    region: '',
    country: 'Tanzania',
    applies_to: 'all',
    min_amount: 0,
    max_amount: '',
    is_inclusive: false,
    tax_number: '',
    registration_required: false,
    is_active: true,
  })

  const [exemptionForm, setExemptionForm] = useState({
    tax_configuration_id: '',
    customer_id: '',
    product_id: '',
    reason: '',
    certificate_number: '',
    valid_from: '',
    valid_until: '',
  })

  const loadTaxes = async () => {
    try {
      const filters = {}
      if (regionFilter) filters.region = regionFilter
      if (typeFilter) filters.type = typeFilter
      const res = await api.getAdminTax(filters)
      const taxesData = res?.taxes || res?.data || res || []
      let filtered = taxesData
      if (searchTerm) {
        filtered = filtered.filter(t =>
          (t?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      setTaxes(filtered)
    } catch {
      setTaxes([])
    } finally {
      setLoading(false)
    }
  }

  const loadExemptions = async () => {
    try {
      const res = await api.getAdminTaxExemptions()
      setExemptions(res?.exemptions || res?.data || [])
    } catch {
      setExemptions([])
    } finally {
      setExemptionsLoading(false)
    }
  }

  useEffect(() => {
    loadTaxes()
  }, [regionFilter, typeFilter, searchTerm])

  useEffect(() => {
    loadExemptions()
  }, [])

  const openCreateModal = () => {
    setEditingTax(null)
    setFormData({
      name: '',
      type: 'vat',
      rate: '',
      region: '',
      country: 'Tanzania',
      applies_to: 'all',
      min_amount: 0,
      max_amount: '',
      is_inclusive: false,
      tax_number: '',
      registration_required: false,
      is_active: true,
    })
    setShowModal(true)
  }

  const openEditModal = (tax) => {
    setEditingTax(tax)
    setFormData({
      name: tax.name || '',
      type: tax.type || 'vat',
      rate: tax.rate || '',
      region: tax.region || '',
      country: tax.country || 'Tanzania',
      applies_to: tax.applies_to || 'all',
      min_amount: tax.min_amount || 0,
      max_amount: tax.max_amount || '',
      is_inclusive: tax.is_inclusive,
      tax_number: tax.tax_number || '',
      registration_required: tax.registration_required,
      is_active: tax.is_active !== false,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingTax(null)
  }

  const handleInputChange = (e) => {
    const { name, value, type: inputType, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: inputType === 'checkbox' ? checked : value }))
  }

  const handleExemptionChange = (e) => {
    const { name, value } = e.target
    setExemptionForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTax) {
        await api.updateAdminTax(editingTax.id, formData)
      } else {
        await api.createAdminTax(formData)
      }
      setShowModal(false)
      setEditingTax(null)
      loadTaxes()
    } catch (err) {
      // error handled by API response
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Are you sure you want to delete this tax configuration?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteAdminTax(id)
      loadTaxes()
    } catch {
      // error handled by API response
    }
  }

  const handleExemptionSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.createAdminTaxExemption({
        tax_configuration_id: parseInt(exemptionForm.tax_configuration_id),
        customer_id: exemptionForm.customer_id ? parseInt(exemptionForm.customer_id) : null,
        product_id: exemptionForm.product_id ? parseInt(exemptionForm.product_id) : null,
        reason: exemptionForm.reason,
        certificate_number: exemptionForm.certificate_number,
        valid_from: exemptionForm.valid_from,
        valid_until: exemptionForm.valid_until,
      })
      setShowExemptionModal(false)
      setExemptionForm({
        tax_configuration_id: '',
        customer_id: '',
        product_id: '',
        reason: '',
        certificate_number: '',
        valid_from: '',
        valid_until: '',
      })
      loadExemptions()
    } catch {
      // error handled by API response
    }
  }

  const handleExemptionDelete = async (id) => {
    const confirmed = await confirm({ title: 'Are you sure you want to delete this exemption?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteAdminTaxExemption(id)
      loadExemptions()
    } catch {
      // error handled by API response
    }
  }

  const totalTaxes = taxes.length
  const activeTaxes = taxes.filter(t => t.is_active === true || t.is_active === 1).length
  const totalExemptions = exemptions.length
  const uniqueRegions = new Set(taxes.map(t => t.region).filter(Boolean)).size

  const stats = [
    { label: 'Total Tax Rules', value: totalTaxes, icon: TrendingUpDown },
    { label: 'Active Rules', value: activeTaxes, icon: Shield },
    { label: 'Tax Exemptions', value: totalExemptions, icon: Search },
    { label: 'Regions Covered', value: uniqueRegions, icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-purple-500" /> Tax / VAT Configuration
            </h1>
            <p className="text-gray-600 mt-2">Manage tax rules, rates, and exemptions for Tanzania regions</p>
          </div>
          {activeTab === 'rules' && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Tax Rule
            </button>
          )}
          {activeTab === 'exemptions' && (
            <button
              onClick={() => setShowExemptionModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Exemption
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className="w-10 h-10 text-purple-500" />
              </div>
            );
          })}
        </div>

        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'rules' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Tax Rules
            </button>
            <button
              onClick={() => setActiveTab('exemptions')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'exemptions' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Exemptions
            </button>
          </div>
        </div>

        {activeTab === 'rules' && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Tax Rules</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search rules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                  <select
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">All Regions</option>
                    <option value="Nationwide">Nationwide</option>
                    {TANZANIA_REGIONS.filter(r => r !== 'Nationwide').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">All Types</option>
                    {TAX_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading tax rules...
                </div>
              ) : taxes.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No tax rules found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate (%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applies To</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inclusive</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taxes.map((tax) => (
                      <tr key={tax.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{tax.name || '—'}</div>
                          {tax.tax_number && (
                            <div className="text-xs text-gray-500">{tax.tax_number}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{tax.type || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{tax.rate || '0.00'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{tax.region || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{tax.applies_to || 'all'}</td>
                        <td className="px-6 py-4"><InclusiveBadge inclusive={tax.is_inclusive} /></td>
                        <td className="px-6 py-4"><ActiveBadge active={tax.is_active} /></td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(tax)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tax.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
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

        {activeTab === 'exemptions' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Tax Exemptions</h2>
            </div>
            {exemptionsLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="animate-spin w-6 h-6 mr-2" /> Loading exemptions...
              </div>
            ) : exemptions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No exemptions found.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax Rule</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exemptions.map((ex) => (
                    <tr key={ex.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{ex.tax_name || '—'}</div>
                        <div className="text-xs text-gray-500">{ex.tax_type}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{ex.customer_name || ex.customer_id || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{ex.product_name || ex.product_id || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">{ex.reason || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ex.certificate_number || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ex.valid_from || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{ex.valid_until || '—'}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleExemptionDelete(ex.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTax ? 'Edit Tax Rule' : 'Add Tax Rule'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {TAX_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="rate"
                    value={formData.rate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                  <select
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="">Select Region</option>
                    <option value="Nationwide">Nationwide</option>
                    {TANZANIA_REGIONS.filter(r => r !== 'Nationwide').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                  <select
                    name="applies_to"
                    value={formData.applies_to}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {APPLIES_TO.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="min_amount"
                    value={formData.min_amount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="max_amount"
                    value={formData.max_amount}
                    onChange={handleInputChange}
                    placeholder="Leave empty for no limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Number</label>
                  <input
                    type="text"
                    name="tax_number"
                    value={formData.tax_number}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="is_inclusive"
                    checked={formData.is_inclusive}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-purple-600"
                  />
                  Tax Inclusive in Price
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="registration_required"
                    checked={formData.registration_required}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-purple-600"
                  />
                  Registration Required
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-purple-600"
                  />
                  Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  {editingTax ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExemptionModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowExemptionModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Add Tax Exemption</h3>
              <button onClick={() => setShowExemptionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleExemptionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rule</label>
                <select
                  name="tax_configuration_id"
                  value={exemptionForm.tax_configuration_id}
                  onChange={handleExemptionChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">Select Tax Rule</option>
                  {taxes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type} - {t.region})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input
                  type="number"
                  name="customer_id"
                  value={exemptionForm.customer_id}
                  onChange={handleExemptionChange}
                  placeholder="Optional - leave blank for product-based exemption"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                <input
                  type="number"
                  name="product_id"
                  value={exemptionForm.product_id}
                  onChange={handleExemptionChange}
                  placeholder="Optional - leave blank for customer-based exemption"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  name="reason"
                  value={exemptionForm.reason}
                  onChange={handleExemptionChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                <input
                  type="text"
                  name="certificate_number"
                  value={exemptionForm.certificate_number}
                  onChange={handleExemptionChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input
                    type="date"
                    name="valid_from"
                    value={exemptionForm.valid_from}
                    onChange={handleExemptionChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    name="valid_until"
                    value={exemptionForm.valid_until}
                    onChange={handleExemptionChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowExemptionModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Create Exemption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
