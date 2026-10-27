import React, { useState, useEffect } from 'react'
import { Search, Plus, Edit, Trash2, X, Star } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

export default function AdminFeaturedListingsPage() {
  const toast = useToast()
  const [listings, setListings] = useState([])
  const confirm = useConfirm()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState({ product_id: '', seller_id: '', package_id: '', start_date: '', end_date: '', is_active: true })

  const loadListings = async () => {
    setLoading(true)
    try {
      const res = await api.getAdminFeaturedListings()
      const all = res?.listings || []
      setListings(search ? all.filter(l => l.product_name?.toLowerCase().includes(search.toLowerCase())) : all)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadListings() }, [search])

  const openCreate = () => {
    setEditingItem(null)
    setForm({ product_id: '', seller_id: '', package_id: '', start_date: '', end_date: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditingItem(item)
    setForm({ product_id: item.product_id || '', seller_id: item.seller_id || '', package_id: item.package_id || '', start_date: item.start_date ? item.start_date.slice(0, 16) : '', end_date: item.end_date ? item.end_date.slice(0, 16) : '', is_active: item.is_active !== false })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.product_id) { toast.error('Product ID is required'); return }
    try {
      if (editingItem) {
        await api.updateAdminFeaturedListing(editingItem.id, form)
      } else {
        await api.createAdminFeaturedListing(form)
      }
      toast.success(editingItem ? 'Listing updated' : 'Listing created')
      setShowModal(false)
      loadListings()
    } catch (err) {
      toast.error('Failed to save listing', err.message)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Delete this listing?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteAdminFeaturedListing(id)
      toast.success('Listing deleted')
      loadListings()
    } catch (err) {
      toast.error('Failed to delete listing', err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Star className="w-7 h-7 text-yellow-600" /> Featured Listings
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage featured product listings</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700">
          <Plus className="w-4 h-4" /> Add Listing
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search listings..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No featured listings found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listings.map((listing) => (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{listing.product_name || `#${listing.product_id}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{listing.seller_name || `#${listing.seller_id}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{listing.package_name || listing.package_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{listing.start_date ? new Date(listing.start_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{listing.end_date ? new Date(listing.end_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${listing.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {listing.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(listing)} className="p-1.5 text-gray-400 hover:text-yellow-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(listing.id)} className="p-1.5 text-gray-400 hover:text-red-600 ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{editingItem ? 'Edit' : 'Create'} Featured Listing</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product ID</label>
                  <input type="number" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seller ID</label>
                  <input type="number" value={form.seller_id} onChange={(e) => setForm({ ...form, seller_id: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package ID</label>
                  <input type="text" value={form.package_id} onChange={(e) => setForm({ ...form, package_id: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4" />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
