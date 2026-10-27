import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Warehouse, RefreshCw, Loader2, TrendingUp, Target, Star, DollarSign, Check } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehousePromote() {
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async () => {
    try {
      const data = await api.getMyWarehouseProfile()
      if (data.success) setProfile(data.profile)
    } catch {
      setProfile(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadProfile() }, [])

  const promote = async (packageName) => {
    try {
      const res = await api.subscribeWarehousePlan({ plan_name: packageName, amount: packageName === 'Featured' ? 25000 : 50000, period_start: new Date().toISOString().split('T')[0], period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], payment_method: 'mpesa' })
      if (res.success) { toast.success('Promotion activated'); loadProfile() } else toast.error(res.message || 'Promotion failed')
    } catch (e) {
      toast.error(e?.message || 'Promotion failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Promote Warehouse</h1>
          <p className="text-gray-600 mt-1">Get more customers by promoting your warehouse</p>
        </div>
        <button onClick={loadProfile} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Featured Warehouse</h3>
          <p className="text-3xl font-bold text-green-600 mb-4">TZS 25,000<span className="text-sm text-gray-500">/month</span></p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500" /> Top of search results</li>
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500" /> Featured badge</li>
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500" /> Priority in listings</li>
          </ul>
          <button onClick={() => promote('Featured')} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium">Promote Now</button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Listing</h3>
          <p className="text-3xl font-bold text-green-600 mb-4">TZS 50,000<span className="text-sm text-gray-500">/month</span></p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500" /> Everything in Featured</li>
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500" /> Homepage banner</li>
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500" /> Email newsletter</li>
            <li className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-500" /> Analytics dashboard</li>
          </ul>
          <button onClick={() => promote('Premium')} className="w-full bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium">Promote Now</button>
        </div>
      </div>
    </div>
  )
}
