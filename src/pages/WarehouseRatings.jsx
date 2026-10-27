import { useState, useEffect } from 'react'
import { Star, RefreshCw, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseRatings() {
  const toast = useToast()
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)

  const loadRatings = async () => {
    try {
      const data = await api.getMyWarehouseRatings()
      if (data.success) setRatings(data.ratings || [])
    } catch {
      setRatings([])
    } finally { setLoading(false) }
  }

  useEffect(() => { loadRatings() }, [])
  useEffect(() => { const i = setInterval(loadRatings, 30000); return () => clearInterval(i) }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading ratings...</p>
        </div>
      </div>
    )
  }

  const avgRating = ratings.length ? (ratings.reduce((sum, r) => sum + (parseFloat(r.rating) || 0), 0) / ratings.length).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Ratings & Reviews</h1>
          <p className="text-gray-600 mt-1">Customer feedback about your warehouse</p>
        </div>
        <button onClick={loadRatings} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <p className="text-5xl font-bold text-gray-900">{avgRating}</p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-5 h-5 ${i < parseFloat(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">{ratings.length} reviews</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Rating Distribution</h3>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratings.filter(r => parseFloat(r.rating) === star).length
            const pct = ratings.length ? Math.round((count / ratings.length) * 100) : 0
            return (
              <div key={star} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-600 w-8">{star} ★</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-8">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reviews</h2>
        </div>
        {ratings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No reviews yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {ratings.map((r) => (
              <div key={r.id} className="p-4 lg:p-6">
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < parseFloat(r.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <p className="text-sm text-gray-700">{r.comment || 'No comment'}</p>
                <p className="text-xs text-gray-400 mt-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
