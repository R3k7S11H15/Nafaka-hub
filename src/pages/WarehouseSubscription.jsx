import { useState, useEffect } from 'react'
import { CreditCard, RefreshCw, Loader2, Check, Star } from 'lucide-react'
import api from '../services/api'
import { useToast } from '../context/ToastContext'

export default function WarehouseSubscription() {
  const toast = useToast()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [plans] = useState([
    { name: 'Basic', price: 'Free', features: ['Basic warehouse profile', 'Limited bookings', 'Basic inventory management'] },
    { name: 'Professional', price: 'TZS 50,000/month', features: ['Unlimited inventory', 'More bookings', 'Analytics', 'Customer management', 'Featured listing'] },
    { name: 'Enterprise', price: 'TZS 150,000/month', features: ['Multiple warehouses', 'Advanced inventory', 'Staff accounts', 'API integration', 'Priority support'] },
  ])

  const loadSubscription = async () => {
    try {
      const data = await api.getMyWarehouseSubscription()
      if (data.success) setSubscription(data.subscription)
    } catch {
      setSubscription(null)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadSubscription() }, [])

  const subscribe = async (planName) => {
    try {
      const res = await api.subscribeWarehousePlan({ plan_name: planName, amount: planName === 'Professional' ? 50000 : planName === 'Enterprise' ? 150000 : 0, period_start: new Date().toISOString().split('T')[0], period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], payment_method: 'mpesa' })
      if (res.success) { toast.success('Subscription activated'); loadSubscription() } else toast.error(res.message || 'Subscription failed')
    } catch (e) {
      toast.error(e?.message || 'Subscription failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600 mt-1">Manage your warehouse subscription</p>
        </div>
        <button onClick={loadSubscription} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {subscription && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Plan</h2>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl font-bold text-green-600">{subscription.plan_name || 'Basic'}</span>
            <span className="text-sm text-gray-500">{subscription.amount ? `${Number(subscription.amount).toLocaleString()} TZS/month` : 'Free'}</span>
          </div>
          {subscription.period_start && subscription.period_end && (
            <p className="text-sm text-gray-600">Renewal: {new Date(subscription.period_end).toLocaleDateString()}</p>
          )}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.name} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="text-2xl font-bold text-green-600 mt-2">{plan.price}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" /> {feature}
                  </li>
                ))}
              </ul>
              <button onClick={() => subscribe(plan.name)} className="mt-6 w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                Subscribe
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
