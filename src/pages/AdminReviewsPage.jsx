import React, { useState, useEffect } from 'react'
import { Star, Search, Plus, Edit, Trash2, Eye, X, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../components/ConfirmDialog'

export default function AdminReviewsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedReview, setSelectedReview] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const limit = 20

  const loadReviews = async () => {
    setLoading(true)
    try {
      const res = await api.getAdminReviews({ search, status: statusFilter, limit, offset: page * limit })
      setReviews(res?.reviews || [])
      setTotal(res?.total || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadReviews() }, [search, statusFilter, page])

  const handleModerate = async (id, status) => {
    try {
      await api.moderateAdminReview(id, { status })
      loadReviews()
    } catch (err) {
      toast.error('Failed to moderate review', err.message)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({ title: 'Delete this review?', type: 'danger' })
    if (!confirmed) return
    try {
      await api.deleteAdminReview(id)
      toast.success('Review deleted')
      loadReviews()
    } catch (err) {
      toast.error('Failed to delete review', err.message)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
    ))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-7 h-7 text-yellow-600" /> Reviews
        </h1>
        <p className="text-gray-500 text-sm mt-1">Moderate and manage product reviews</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'bg-gray-50 text-gray-600' },
          { label: 'Pending', value: reviews.filter(r => r.status === 'pending').length, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Approved', value: reviews.filter(r => r.status === 'approved').length, color: 'bg-green-50 text-green-600' },
          { label: 'Rejected', value: reviews.filter(r => r.status === 'rejected').length, color: 'bg-red-50 text-red-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${stat.color}`}>
                <Star className="w-4 h-4" />
              </div>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search reviews..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No reviews found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{review.product_name || `#${review.product_id}`}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{review.customer_name || `#${review.customer_id}`}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {renderStars(review.rating || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{review.comment || 'No comment'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(review.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {review.status === 'pending' && (
                        <>
                          <button onClick={() => handleModerate(review.id, 'approved')} className="p-1.5 text-gray-400 hover:text-green-600" title="Approve">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleModerate(review.id, 'rejected')} className="p-1.5 text-gray-400 hover:text-red-600 ml-2" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(review.id)} className="p-1.5 text-gray-400 hover:text-red-600 ml-2" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">Total: {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={reviews.length < limit} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
