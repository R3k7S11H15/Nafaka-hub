import React, { useState, useEffect } from 'react'
import { Check, Star, Zap, Crown, ArrowRight, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

const planIcons = { free: Star, starter: Zap, professional: Crown, enterprise: Crown }

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [currentPlan, setCurrentPlan] = useState(null)
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => {
    fetchPlans()
    if (user) fetchCurrentSubscription()
  }, [user])

  const fetchPlans = async () => {
    try {
       const data = await api.getSubscriptionPlans()
      if (data.success) setPlans(data.plans)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentSubscription = async () => {
    try {
       const data = await api.getMySubscription(user.id)
      if (data.success && data.profile) {
        setCurrentPlan(data.profile.subscription_tier)
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
    }
  }

  const handleSubscribe = async (planSlug) => {
    if (!user) {
      window.location.href = '/login'
      return
    }
    setSubscribing(planSlug)
    try {
      const { data } = await api.subscribe(user.id, planSlug, selectedPeriod)
      if (data.success) {
        toast.success(`Subscribed to ${data.plan}!`, `Amount: TZS ${data.amount.toLocaleString()}`)
        fetchCurrentSubscription()
      } else {
        toast.error(data.message || 'Subscription failed')
      }
    } catch (err) {
      toast.error('Failed to process subscription')
    } finally {
      setSubscribing(null)
    }
  }

  const formatPrice = (plan) => {
    const price = selectedPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly
    if (price === 0) return 'Free'
    return `TZS ${price.toLocaleString()}`
  }

  const getPeriodLabel = (plan) => {
    const price = selectedPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly
    if (price === 0) return ''
    return selectedPeriod === 'yearly' ? '/year' : '/month'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - reduced height, professional dark header */}
      <div className="bg-gradient-to-r from-green-700 to-emerald-800 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Choose Your Plan</h1>
          <p className="text-lg text-green-100 mb-6 max-w-2xl mx-auto">Scale your rice trading business with the right tools</p>

          <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-full p-1 shadow-inner">
            <button
              onClick={() => setSelectedPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition ${selectedPeriod === 'monthly' ? 'bg-white text-primary-700 shadow-sm' : 'text-green-100 hover:text-white hover:bg-white/10'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition ${selectedPeriod === 'yearly' ? 'bg-white text-primary-700 shadow-sm' : 'text-green-100 hover:text-white hover:bg-white/10'}`}
            >
              Yearly <span className="text-xs text-emerald-300 ml-1">Save 17%</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = planIcons[plan.slug] || Star
            const isCurrentPlan = currentPlan === plan.slug
            const isPopular = plan.slug === 'professional'
            const price = selectedPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-sm border transition-all hover:shadow-md ${
                  isPopular ? 'border-primary-500' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                )}

                <div className="p-6">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 border border-gray-200">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-3xl font-bold text-gray-900">{formatPrice(plan)}</span>
                    <span className="text-gray-500 text-sm">{getPeriodLabel(plan)}</span>
                  </div>

                  <button
                    onClick={() => handleSubscribe(plan.slug)}
                    disabled={subscribing === plan.slug || isCurrentPlan}
                    className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition ${
                      isCurrentPlan
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : isPopular
                        ? 'bg-primary-600 text-white hover:bg-primary-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {subscribing === plan.slug ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      <>
                        <Check className="w-4 h-4" />
                        Current Plan
                      </>
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="border-t border-gray-100 p-6">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                      {plan.product_upload_limit === 1000 ? 'Unlimited' : plan.product_upload_limit} product uploads
                    </li>
                    {plan.commission_discount > 0 && (
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        {plan.commission_discount}% commission discount
                      </li>
                    )}
                    {plan.has_analytics && (
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        Advanced analytics
                      </li>
                    )}
                    {plan.has_featured_badge && (
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        Featured seller badge
                      </li>
                    )}
                    {plan.has_priority_support && (
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        Priority support
                      </li>
                    )}
                    {plan.has_api_access && (
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        API access
                      </li>
                    )}
                    {plan.has_bulk_upload && (
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        Bulk upload
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ - more professional */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change plans anytime?</h3>
              <p className="text-gray-600 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods are accepted?</h3>
              <p className="text-gray-600 text-sm">We accept M-Pesa, bank transfers, and mobile money payments.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a commission on sales?</h3>
              <p className="text-gray-600 text-sm">Yes, platform charges 1-5% commission on successful transactions. Premium plans get discounts.</p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel my subscription?</h3>
              <p className="text-gray-600 text-sm">Yes, you can cancel anytime. Your plan remains active until the end of the billing period.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
