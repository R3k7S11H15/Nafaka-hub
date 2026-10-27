import { useState, useEffect } from 'react'
import { Layers, Plus, Edit, Trash2, X, Search, Settings2 } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

const ATTRIBUTE_TYPES = ['text', 'number', 'select', 'multiselect', 'boolean', 'date']

function ActiveBadge({ active }) {
  const isActive = active === true || active === 1
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function BooleanBadge({ value }) {
  const val = value === true || value === 1
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${val ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
      {val ? 'Yes' : 'No'}
    </span>
  )
}

export default function AdminCategoriesPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [categories, setCategories] = useState([])
  const [attributes, setAttributes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('categories')
  const [showCatModal, setShowCatModal] = useState(false)
  const [showAttrModal, setShowAttrModal] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [editingAttr, setEditingAttr] = useState(null)
  const [showMappingModal, setShowMappingModal] = useState(false)
  const [mappingCategory, setMappingCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [catForm, setCatForm] = useState({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    parent_id: '',
    sort_order: 0,
    meta_title: '',
    meta_description: '',
    is_active: true,
  })

  const [attrForm, setAttrForm] = useState({
    name: '',
    slug: '',
    type: 'text',
    unit: '',
    is_required: false,
    is_filterable: true,
    options: '',
    sort_order: 0,
  })

  const loadCategories = async () => {
    try {
      const res = await api.getAdminCategories()
      const data = res?.categories || res?.data || []
      let filtered = data
      if (searchTerm) {
        filtered = filtered.filter(c => (c?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
      }
      setCategories(filtered)
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const loadAttributes = async () => {
    try {
      const res = await api.getAdminAttributes()
      const data = res?.attributes || res?.data || []
      setAttributes(data)
    } catch {
      setAttributes([])
    }
  }

  useEffect(() => {
    loadCategories()
  }, [searchTerm])

  useEffect(() => {
    loadAttributes()
  }, [])

  const openCatModal = () => {
    setEditingCat(null)
    setCatForm({ name: '', slug: '', description: '', image_url: '', parent_id: '', sort_order: 0, meta_title: '', meta_description: '', is_active: true })
    setShowCatModal(true)
  }

  const openEditCatModal = (cat) => {
    setEditingCat(cat)
    setCatForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      image_url: cat.image_url || '',
      parent_id: cat.parent_id || '',
      sort_order: cat.sort_order || 0,
      meta_title: cat.meta_title || '',
      meta_description: cat.meta_description || '',
      is_active: cat.is_active !== false,
    })
    setShowCatModal(true)
  }

  const openAttrModal = () => {
    setEditingAttr(null)
    setAttrForm({ name: '', slug: '', type: 'text', unit: '', is_required: false, is_filterable: true, options: '', sort_order: 0 })
    setShowAttrModal(true)
  }

  const openEditAttrModal = (attr) => {
    setEditingAttr(attr)
    let opts = ''
    if (attr.options) {
      try { opts = JSON.stringify(JSON.parse(attr.options)) } catch { opts = attr.options }
    }
    setAttrForm({
      name: attr.name || '',
      slug: attr.slug || '',
      type: attr.type || 'text',
      unit: attr.unit || '',
      is_required: attr.is_required === true || attr.is_required === 1,
      is_filterable: attr.is_filterable !== false && attr.is_filterable !== 0,
      options: opts,
      sort_order: attr.sort_order || 0,
    })
    setShowAttrModal(true)
  }

  const openMappingModal = (cat) => {
    setMappingCategory(cat)
    setShowMappingModal(true)
  }

  const handleCatSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...catForm,
        parent_id: catForm.parent_id ? parseInt(catForm.parent_id) : null,
        sort_order: parseInt(catForm.sort_order) || 0,
      }
      if (editingCat) {
        await api.updateAdminCategory(editingCat.id, payload)
      } else {
        await api.createAdminCategory(payload)
      }
      setShowCatModal(false)
      loadCategories()
    } catch {
      // handled by API
    }
  }

  const handleAttrSubmit = async (e) => {
    e.preventDefault()
    try {
      let parsedOptions = null
      if (attrForm.options.trim()) {
        try { parsedOptions = JSON.stringify(JSON.parse(attrForm.options)) } catch {
          toast.error('Options must be valid JSON array')
          return
        }
      }
      const payload = { ...attrForm, options: parsedOptions }
      if (editingAttr) {
        await api.updateAdminAttribute(editingAttr.id, payload)
      } else {
        await api.createAdminAttribute(payload)
      }
      setShowAttrModal(false)
      loadAttributes()
    } catch {
      // handled by API
    }
  }

  const handleDeleteCat = async (id) => {
    const confirmed = await confirm({ title: 'Delete this category?', type: 'danger' })
    if (!confirmed) return
    await api.deleteAdminCategory(id)
    loadCategories()
  }

  const handleDeleteAttr = async (id) => {
    const confirmed = await confirm({ title: 'Delete this attribute?', type: 'danger' })
    if (!confirmed) return
    await api.deleteAdminAttribute(id)
    loadAttributes()
  }

  const handleToggleCatActive = async (cat) => {
    await api.updateAdminCategory(cat.id, { ...cat, is_active: !cat.is_active })
    loadCategories()
  }

  const handleMapAttribute = async (e) => {
    e.preventDefault()
    try {
      const { attribute_id, is_required, sort_order } = Object.fromEntries(new FormData(e.target))
      await api.mapAttributeToCategory(mappingCategory.id, {
        attribute_id: parseInt(attribute_id),
        is_required: is_required === 'true' || is_required === 'on',
        sort_order: parseInt(sort_order) || 0,
      })
      setShowMappingModal(false)
    } catch {
      // handled
    }
  }

  const handleUnmapAttribute = async (attributeId) => {
    const confirmed = await confirm({ title: 'Remove this attribute from this category?', type: 'danger' })
    if (!confirmed) return
    await api.unmapAttributeFromCategory(mappingCategory.id, attributeId)
  }

  const [mappedAttrs, setMappedAttrs] = useState([])

  useEffect(() => {
    if (showMappingModal && mappingCategory) {
      api.getCategoryAttributes(mappingCategory.id).then(res => {
        const data = res?.mappings || res?.data || []
        setMappedAttrs(data)
      }).catch(() => setMappedAttrs([]))
    }
  }, [showMappingModal, mappingCategory])

  const totalCategories = categories.length
  const activeCategories = categories.filter(c => c.is_active === true || c.is_active === 1).length
  const totalAttributes = attributes.length
  const filterableAttributes = attributes.filter(a => a.is_filterable === true || a.is_filterable === 1).length

  const stats = [
    { label: 'Total Categories', value: totalCategories, icon: Layers },
    { label: 'Active Categories', value: activeCategories, icon: Layers },
    { label: 'Total Attributes', value: totalAttributes, icon: Settings2 },
    { label: 'Filterable Attributes', value: filterableAttributes, icon: Search },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-8 h-8 text-indigo-500" /> Categories & Attributes
            </h1>
            <p className="text-gray-600 mt-2">Manage product categories and their attributes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-lg shadow p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className="w-10 h-10 text-indigo-500" />
              </div>
            )
          })}
        </div>

        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'categories' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('attributes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'attributes' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Attributes
            </button>
          </div>
        </div>

        {activeTab === 'categories' && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Product Categories</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                  <button
                    onClick={openCatModal}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Category
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" /> Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No categories found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sort Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{cat.name || '—'}</div>
                          {cat.description && <div className="text-xs text-gray-500 max-w-xs truncate">{cat.description}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{cat.slug || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{cat.sort_order || 0}</td>
                        <td className="px-6 py-4"><ActiveBadge active={cat.is_active} /></td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEditCatModal(cat)} className="text-gray-600 hover:text-gray-800" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleToggleCatActive(cat)} className="text-indigo-600 hover:text-indigo-800" title="Toggle Active">
                              <Settings2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => openMappingModal(cat)} className="text-green-600 hover:text-green-800" title="Manage Attributes">
                              <Layers className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteCat(cat.id)} className="text-red-600 hover:text-red-800" title="Delete">
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

        {activeTab === 'attributes' && (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Product Attributes</h2>
                <div className="flex items-center gap-4">
                  <button
                    onClick={openAttrModal}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Attribute
                  </button>
                </div>
              </div>
              {attributes.length === 0 ? (
                <div className="p-12 text-center text-gray-500">No attributes found.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Filterable</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attributes.map((attr) => (
                      <tr key={attr.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{attr.name || '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{attr.slug || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-700 capitalize">{attr.type || 'text'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{attr.unit || '—'}</td>
                        <td className="px-6 py-4"><BooleanBadge value={attr.is_required} /></td>
                        <td className="px-6 py-4"><BooleanBadge value={attr.is_filterable} /></td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button onClick={() => openEditAttrModal(attr)} className="text-gray-600 hover:text-gray-800" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteAttr(attr.id)} className="text-red-600 hover:text-red-800" title="Delete">
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

      {showCatModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowCatModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">{editingCat ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setShowCatModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCatSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" name="name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input type="text" name="slug" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea name="description" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                  <input type="text" name="image_url" value={catForm.image_url} onChange={(e) => setCatForm({ ...catForm, image_url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category ID</label>
                  <input type="number" name="parent_id" value={catForm.parent_id} onChange={(e) => setCatForm({ ...catForm, parent_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input type="number" name="sort_order" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Title</label>
                  <input type="text" name="meta_title" value={catForm.meta_title} onChange={(e) => setCatForm({ ...catForm, meta_title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Description</label>
                  <input type="text" name="meta_description" value={catForm.meta_description} onChange={(e) => setCatForm({ ...catForm, meta_description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="is_active" checked={catForm.is_active} onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })} className="w-4 h-4 text-indigo-600" />
                Active
              </label>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">{editingCat ? 'Update Category' : 'Create Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttrModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowAttrModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">{editingAttr ? 'Edit Attribute' : 'Add Attribute'}</h3>
              <button onClick={() => setShowAttrModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAttrSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" name="name" value={attrForm.name} onChange={(e) => setAttrForm({ ...attrForm, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input type="text" name="slug" value={attrForm.slug} onChange={(e) => setAttrForm({ ...attrForm, slug: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select name="type" value={attrForm.type} onChange={(e) => setAttrForm({ ...attrForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    {ATTRIBUTE_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" name="unit" value={attrForm.unit} onChange={(e) => setAttrForm({ ...attrForm, unit: e.target.value })} placeholder="e.g. kg, %, months" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options (JSON array)</label>
                  <input type="text" name="options" value={attrForm.options} onChange={(e) => setAttrForm({ ...attrForm, options: e.target.value })} placeholder='["Option A","Option B"]' className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input type="number" name="sort_order" value={attrForm.sort_order} onChange={(e) => setAttrForm({ ...attrForm, sort_order: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_required" checked={attrForm.is_required} onChange={(e) => setAttrForm({ ...attrForm, is_required: e.target.checked })} className="w-4 h-4 text-indigo-600" />
                  Required
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" name="is_filterable" checked={attrForm.is_filterable} onChange={(e) => setAttrForm({ ...attrForm, is_filterable: e.target.checked })} className="w-4 h-4 text-indigo-600" />
                  Filterable
                </label>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowAttrModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">{editingAttr ? 'Update Attribute' : 'Create Attribute'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMappingModal && mappingCategory && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => setShowMappingModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Manage Attributes: {mappingCategory.name}</h3>
              <button onClick={() => setShowMappingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleMapAttribute} className="flex items-end gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Add Attribute</label>
                  <select name="attribute_id" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Select attribute...</option>
                    {attributes
                      .filter(a => !mappedAttrs.some(m => m.attribute_id === a.id))
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required</label>
                  <select name="is_required" className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input type="number" name="sort_order" defaultValue={0} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Add</button>
              </form>

              {mappedAttrs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No attributes mapped to this category.</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Attribute</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mappedAttrs.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{m.attribute_name || '—'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 capitalize">{m.attribute_type || '—'}</td>
                        <td className="px-4 py-3"><BooleanBadge value={m.is_required} /></td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleUnmapAttribute(m.attribute_id)} className="text-red-600 hover:text-red-800 text-sm">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
