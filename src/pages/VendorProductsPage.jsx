import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Plus, Edit, Trash2, Search, Loader2, Package, Eye, Save, X } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

const fmtMoney = (v) => {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `TZS ${Number(v).toLocaleString()}`
}

export default function VendorProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingStockId, setEditingStockId] = useState(null)
  const [stockInput, setStockInput] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    unit: 'kg',
    category: '',
    region: '',
    is_active: true,
  })
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.getMyVendorProducts({ limit: 1000 })
        if (!mounted) return
        const list = Array.isArray(res?.products) ? res.products : Array.isArray(res?.data?.products) ? res.data.products : []
        setProducts(list)
      } catch {
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const filtered = products.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
  })

  const openCreate = () => {
    setEditingProduct(null)
    setForm({ name: '', description: '', price: '', quantity: '', unit: 'kg', category: '', region: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      quantity: product.quantity || '',
      unit: product.unit || 'kg',
      category: product.category || '',
      region: product.region || '',
      is_active: product.is_active !== false,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await api.updateMyProduct(editingProduct.id, {
          name: form.name,
          description: form.description,
          price: form.price,
          stock_quantity: form.quantity,
          is_active: form.is_active,
          category: form.category,
          unit: form.unit,
        })
      } else {
        await api.createProductWithImages({
          name: form.name,
          category: form.category,
          price_per_kg: Number(form.price),
          quantity: form.quantity,
          unit: form.unit,
          description: form.description,
          region: form.region || '',
        }, [])
      }
      setShowModal(false)
      const res = await api.getMyVendorProducts({ limit: 1000 })
      const list = Array.isArray(res?.products) ? res.products : []
      setProducts(list)
    } catch {
      toast.error('Failed to save product')
    }
  }

  const handleDelete = async (productId) => {
    const confirmed = await confirm({ title: 'Are you sure you want to delete this product?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteMyProduct(productId)
      setProducts(products.filter(p => p.id !== productId))
      toast.success('Product deleted')
    } catch {
      toast.error('Failed to delete product')
    }
  }

  const handleStockUpdate = async (productId, newStock) => {
    const oldStock = products.find(p => p.id === productId)?.stock_quantity || products.find(p => p.id === productId)?.quantity
    // Update UI optimistically
    setProducts(products.map(p =>
      p.id === productId ? { ...p, stock_quantity: Number(newStock), quantity: Number(newStock) } : p
    ))
    try {
      await api.updateMyProduct(productId, { stock_quantity: Number(newStock) })
      toast.success('Stock updated')
    } catch {
      toast.error('Failed to update stock')
      // Revert on failure
      setProducts(products.map(p =>
        p.id === productId ? { ...p, stock_quantity: oldStock, quantity: oldStock } : p
      ))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
            <p className="text-gray-600 mt-1">Manage your product listings</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
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
            <div className="text-center py-12 text-gray-500">No products found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Product</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Category</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Price</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Stock</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.name || '—'}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{product.description || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">{product.category || '—'}</td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">{fmtMoney(product.price)}</td>
                      <td className="py-4 px-4">
                        {editingStockId === product.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              value={stockInput}
                              onChange={(e) => setStockInput(e.target.value)}
                              className="w-16 px-2 py-1 text-sm border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleStockUpdate(product.id, stockInput)
                                  setEditingStockId(null)
                                } else if (e.key === 'Escape') {
                                  setEditingStockId(null)
                                }
                              }}
                            />
                            <button
                              onClick={() => { handleStockUpdate(product.id, stockInput); setEditingStockId(null) }}
                              className="text-green-600 hover:text-green-700"
                              title="Save stock"
                            ><Save className="w-3.5 h-3.5" /></button>
                            <button
                              onClick={() => setEditingStockId(null)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Cancel"
                            ><X className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => { setEditingStockId(product.id); setStockInput(product.stock_quantity || product.quantity || 0) }}
                            title="Click to edit stock"
                          >
                            <span className="text-sm text-gray-900 font-medium">{product.stock_quantity || product.quantity || 0}</span>
                            <Edit className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                       <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <NavLink to={`/products/${product.id}`} className="text-green-600 hover:text-green-700" title="View product"><Eye className="w-4 h-4" /></NavLink>
                          <button onClick={() => openEdit(product)} className="text-blue-600 hover:text-blue-800" title="Edit product"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800" title="Delete product"><Trash2 className="w-4 h-4" /></button>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (TZS)</label>
                    <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                    <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="kg">kg</option>
                      <option value="bag">bag</option>
                      <option value="ton">ton</option>
                      <option value="liter">liter</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Save Product</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
